import { addDays, endOfDay, endOfWeek, startOfDay } from "date-fns";

import type { TaskStatus } from "@/generated/prisma/client";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import type { ProjectFilters } from "./schemas";

// Consultas de la feature de proyectos (FASE 2). Reciben el cliente escopado;
// son la única fuente de datos del listado, el detalle y el panel. El avance
// se calcula con agregaciones por lote (sin N+1, research D8).

export const PROJECTS_PAGE_SIZE = 20;

/// Avance por proyecto: proporción de tareas finalizadas (0 % sin tareas).
export interface ProjectProgress {
  total: number;
  done: number;
  pct: number;
}

/// Calcula el avance de un lote de proyectos con dos consultas agregadas.
async function computeProgressByProject(
  db: ScopedPrismaClient,
  projectIds: string[],
): Promise<Map<string, ProjectProgress>> {
  const progress = new Map<string, ProjectProgress>(projectIds.map((id) => [id, { total: 0, done: 0, pct: 0 }]));
  if (projectIds.length === 0) {
    return progress;
  }

  const processes = await db.process.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true, projectId: true },
  });
  if (processes.length === 0) {
    return progress;
  }
  const processToProject = new Map(processes.map((p) => [p.id, p.projectId]));

  const grouped = await db.task.groupBy({
    by: ["processId", "status"],
    where: { processId: { in: processes.map((p) => p.id) } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const projectId = processToProject.get(row.processId);
    if (!projectId) {
      continue;
    }
    const entry = progress.get(projectId);
    if (!entry) {
      continue;
    }
    entry.total += row._count._all;
    if (row.status === "DONE") {
      entry.done += row._count._all;
    }
  }
  for (const entry of progress.values()) {
    entry.pct = entry.total === 0 ? 0 : Math.round((entry.done / entry.total) * 100);
  }
  return progress;
}

// ── Listado ──────────────────────────────────────────────────────────────────

function buildProjectWhere(filters: ProjectFilters) {
  return {
    ...(filters.q
      ? { OR: [{ name: { contains: filters.q } }, { client: { is: { name: { contains: filters.q } } } }] }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.processTypeId ? { processTypeId: filters.processTypeId } : {}),
    ...(filters.tagId ? { tags: { some: { id: filters.tagId } } } : {}),
  };
}

/// Listado paginado con filtros combinables (FR-012) y avance por proyecto.
export async function listProjects(db: ScopedPrismaClient, filters: ProjectFilters) {
  const where = buildProjectWhere(filters);
  const [total, rows] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (filters.page - 1) * PROJECTS_PAGE_SIZE,
      take: PROJECTS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        priority: true,
        startDate: true,
        endDate: true,
        ownerId: true,
        client: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        processType: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
  ]);

  const progress = await computeProgressByProject(
    db,
    rows.map((p) => p.id),
  );
  const projects = rows.map((p) => ({ ...p, progress: progress.get(p.id) ?? { total: 0, done: 0, pct: 0 } }));
  return { projects, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / PROJECTS_PAGE_SIZE)) };
}

// ── Detalle ──────────────────────────────────────────────────────────────────

/// ¿Está vencida? Fecha límite anterior a hoy y estado no finalizado (FR-019).
export function isTaskOverdue(dueDate: Date | null, status: TaskStatus, now = new Date()): boolean {
  return Boolean(dueDate && dueDate < startOfDay(now) && status !== "DONE");
}

/// Detalle completo de un proyecto con sus tareas y avance (FR-008).
/// Devuelve `null` si no existe en el tenant (la página hace `notFound()`).
export async function getProjectDetail(db: ScopedPrismaClient, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      priority: true,
      startDate: true,
      endDate: true,
      ownerId: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      processType: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      processes: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          tasks: {
            orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              dueDate: true,
              assigneeId: true,
              assignee: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  if (!project) {
    return null;
  }

  const { processes, ...rest } = project;
  const tasks = processes
    .flatMap((p) => p.tasks)
    .map((task) => ({ ...task, overdue: isTaskOverdue(task.dueDate, task.status) }));
  const done = tasks.filter((t) => t.status === "DONE").length;
  const progress: ProjectProgress = {
    total: tasks.length,
    done,
    pct: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
  const taskAssigneeIds = tasks.map((t) => t.assigneeId).filter((id): id is string => Boolean(id));

  return { ...rest, tasks, progress, taskAssigneeIds };
}

// ── Panel ────────────────────────────────────────────────────────────────────

/// Todos los proyectos del tenant para la sección «Proyectos» del panel
/// (alcance de la clarificación 2026-07-02), con filtro opcional por estado.
export async function getPanelProjects(db: ScopedPrismaClient, status?: ProjectFilters["status"]) {
  const rows = await db.project.findMany({
    where: status ? { status } : {},
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, description: true, status: true, priority: true, endDate: true },
  });
  const progress = await computeProgressByProject(
    db,
    rows.map((p) => p.id),
  );
  return rows.map((p) => ({ ...p, progress: progress.get(p.id) ?? { total: 0, done: 0, pct: 0 } }));
}

export type PanelTaskRange = "today" | "tomorrow" | "week";

/// Rango temporal del filtro del panel. «Hoy» y «Esta semana» incluyen las
/// vencidas sin finalizar para que no desaparezcan del radar (FR-019).
function rangeWindow(range: PanelTaskRange, now: Date) {
  const todayStart = startOfDay(now);
  if (range === "today") {
    return { from: todayStart, to: endOfDay(now), includeOverdue: true };
  }
  if (range === "tomorrow") {
    const tomorrow = addDays(todayStart, 1);
    return { from: tomorrow, to: endOfDay(tomorrow), includeOverdue: false };
  }
  return { from: todayStart, to: endOfWeek(now, { weekStartsOn: 1 }), includeOverdue: true };
}

/// Tareas del panel: solo las asignadas al usuario o sin responsable
/// (clarificación 2026-07-02), dentro del rango temporal.
export async function getPanelTasks(db: ScopedPrismaClient, userId: string, range: PanelTaskRange, now = new Date()) {
  const window = rangeWindow(range, now);
  const scopePersonal = { OR: [{ assigneeId: userId }, { assigneeId: null }] };
  const inWindow = { dueDate: { gte: window.from, lte: window.to } };
  const overdue = { dueDate: { lt: startOfDay(now) }, status: { not: "DONE" as TaskStatus } };

  const tasks = await db.task.findMany({
    where: {
      AND: [scopePersonal, window.includeOverdue ? { OR: [inWindow, overdue] } : inWindow],
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    take: 30,
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      assignee: { select: { id: true, name: true } },
      process: { select: { project: { select: { id: true, name: true } } } },
    },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    assignee: task.assignee,
    project: task.process.project,
    overdue: isTaskOverdue(task.dueDate, task.status, now),
  }));
}

/// Cifras de las tarjetas de resumen (FR-016), con el mismo alcance personal
/// que la sección «Tareas».
export async function getPanelSummary(db: ScopedPrismaClient, userId: string, now = new Date()) {
  const scopePersonal = { OR: [{ assigneeId: userId }, { assigneeId: null }] };
  const weekRange = { gte: startOfDay(now), lte: endOfWeek(now, { weekStartsOn: 1 as const }) };

  const [tasksToday, weekTotal, weekDone, activeProjects] = await Promise.all([
    db.task.count({
      where: { AND: [scopePersonal, { dueDate: { gte: startOfDay(now), lte: endOfDay(now) } }] },
    }),
    db.task.count({ where: { AND: [scopePersonal, { dueDate: weekRange }] } }),
    db.task.count({ where: { AND: [scopePersonal, { dueDate: weekRange }, { status: "DONE" }] } }),
    // Proyectos en curso de toda la organización (misma vista que la sección «Proyectos»).
    db.project.count({ where: { status: "IN_PROGRESS" } }),
  ]);

  return {
    tasksToday,
    weekTotal,
    weekDone,
    weeklyProgressPct: weekTotal === 0 ? 0 : Math.round((weekDone / weekTotal) * 100),
    activeProjects,
  };
}

// ── Catálogos para filtros y formularios ─────────────────────────────────────

export async function listTags(db: ScopedPrismaClient) {
  return db.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function listProcessTypes(db: ScopedPrismaClient) {
  return db.processType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/// Usuarios activos de la organización (para responsable/asignado).
export async function listMembers(db: ScopedPrismaClient, tenantId: string) {
  return db.user.findMany({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listClients(db: ScopedPrismaClient) {
  return db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}
