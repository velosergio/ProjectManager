import type { TaskStatus } from "@/generated/prisma/client";
import {
  canDeleteProject,
  canEditProject,
  canManageCatalogs,
  canManageProjects,
  canManageTasks,
  type ProjectActor,
} from "@/lib/authz-projects";
import { DuplicateNameError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { createProjectWithQuota } from "@/lib/plans/gating";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import { processTypeInputSchema, projectInputSchema, tagInputSchema, taskInputSchema } from "./schemas";

// Mutaciones de la feature de proyectos (FASE 2). Reciben el cliente escopado
// al tenant y el actor de la sesión; validan la entrada (Zod), aplican la
// matriz de permisos (FR-018) y verifican la pertenencia al tenant de los ids
// referenciados. Son la fuente de verdad: la UI solo oculta acciones.

/// Actor con el tenant efectivo resuelto (sesión o selección de mango).
export interface MutationActor extends ProjectActor {
  tenantId: string;
}

/// Verifica que el usuario exista, esté activo y pertenezca al tenant (FR-011).
async function assertMemberOfTenant(db: ScopedPrismaClient, tenantId: string, userId: string, field: string) {
  const user = await db.user.findFirst({ where: { id: userId, tenantId, status: "ACTIVE" }, select: { id: true } });
  if (!user) {
    throw new NotFoundError(`El ${field} seleccionado no es un usuario activo de la organización.`);
  }
}

/// Verifica que todas las etiquetas referenciadas pertenezcan al tenant.
async function assertTagsInTenant(db: ScopedPrismaClient, tagIds: string[]) {
  if (tagIds.length === 0) {
    return;
  }
  const found = await db.tag.count({ where: { id: { in: tagIds } } });
  if (found !== tagIds.length) {
    throw new NotFoundError("Alguna de las etiquetas seleccionadas no existe.");
  }
}

/// Valida los ids referenciados por un proyecto contra el tenant.
async function assertProjectRefs(
  db: ScopedPrismaClient,
  tenantId: string,
  input: { clientId?: string | null; ownerId?: string | null; processTypeId?: string | null; tagIds?: string[] },
) {
  if (input.clientId) {
    const client = await db.client.findFirst({ where: { id: input.clientId }, select: { id: true } });
    if (!client) {
      throw new NotFoundError("El cliente seleccionado no existe.");
    }
  }
  if (input.ownerId) {
    await assertMemberOfTenant(db, tenantId, input.ownerId, "responsable");
  }
  if (input.processTypeId) {
    const type = await db.processType.findFirst({ where: { id: input.processTypeId }, select: { id: true } });
    if (!type) {
      throw new NotFoundError("El tipo de proceso seleccionado no existe.");
    }
  }
  await assertTagsInTenant(db, input.tagIds ?? []);
}

// ── Proyectos ────────────────────────────────────────────────────────────────

export async function createProject(db: ScopedPrismaClient, actor: MutationActor, rawInput: unknown) {
  if (!canManageProjects(actor.role)) {
    throw new ForbiddenError("No tienes permisos para crear proyectos.");
  }
  const input = projectInputSchema.parse(rawInput);
  await assertProjectRefs(db, actor.tenantId, input);
  // La cuota y el proceso por defecto corren en una transacción serializable.
  return createProjectWithQuota(actor.tenantId, input);
}

export async function updateProject(
  db: ScopedPrismaClient,
  actor: MutationActor,
  projectId: string,
  rawInput: unknown,
) {
  const project = await db.project.findFirst({
    where: { id: projectId },
    select: { id: true, ownerId: true, processes: { select: { tasks: { select: { assigneeId: true } } } } },
  });
  if (!project) {
    throw new NotFoundError("El proyecto no existe.");
  }
  const taskAssigneeIds = project.processes
    .flatMap((p) => p.tasks.map((t) => t.assigneeId))
    .filter((id): id is string => Boolean(id));
  if (!canEditProject(actor, { ownerId: project.ownerId, taskAssigneeIds })) {
    throw new ForbiddenError("No tienes permisos para editar este proyecto.");
  }
  const input = projectInputSchema.parse(rawInput);
  await assertProjectRefs(db, actor.tenantId, input);
  return db.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      description: input.description ?? null,
      clientId: input.clientId ?? null,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      ownerId: input.ownerId ?? null,
      processTypeId: input.processTypeId ?? null,
      tags: { set: input.tagIds.map((id) => ({ id })) },
    },
  });
}

export async function deleteProject(db: ScopedPrismaClient, actor: MutationActor, projectId: string) {
  if (!canDeleteProject(actor.role)) {
    throw new ForbiddenError("No tienes permisos para eliminar proyectos.");
  }
  const project = await db.project.findFirst({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    throw new NotFoundError("El proyecto no existe.");
  }
  // Los procesos y tareas caen en cascada (FK); las etiquetas solo se desasocian.
  return db.project.delete({ where: { id: projectId } });
}

// ── Tareas ───────────────────────────────────────────────────────────────────

/// Devuelve el proceso por defecto del proyecto, creándolo si faltara
/// (proyectos previos a la FASE 2). El `tenantId` explícito solo satisface el
/// tipado: la extensión de scoping lo fija de todos modos.
async function resolveDefaultProcess(db: ScopedPrismaClient, tenantId: string, projectId: string) {
  const existing = await db.process.findFirst({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (existing) {
    return existing;
  }
  return db.process.create({ data: { tenantId, projectId, name: "General", order: 0 }, select: { id: true } });
}

export async function createTask(db: ScopedPrismaClient, actor: MutationActor, projectId: string, rawInput: unknown) {
  if (!canManageTasks(actor.role)) {
    throw new ForbiddenError("No tienes permisos para crear tareas.");
  }
  const project = await db.project.findFirst({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    throw new NotFoundError("El proyecto no existe.");
  }
  const input = taskInputSchema.parse(rawInput);
  if (input.assigneeId) {
    await assertMemberOfTenant(db, actor.tenantId, input.assigneeId, "responsable");
  }
  const process = await resolveDefaultProcess(db, actor.tenantId, projectId);
  return db.task.create({
    data: {
      tenantId: actor.tenantId,
      processId: process.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
    },
  });
}

export async function updateTask(db: ScopedPrismaClient, actor: MutationActor, taskId: string, rawInput: unknown) {
  if (!canManageTasks(actor.role)) {
    throw new ForbiddenError("No tienes permisos para editar tareas.");
  }
  const task = await db.task.findFirst({ where: { id: taskId }, select: { id: true } });
  if (!task) {
    throw new NotFoundError("La tarea no existe.");
  }
  const input = taskInputSchema.parse(rawInput);
  if (input.assigneeId) {
    await assertMemberOfTenant(db, actor.tenantId, input.assigneeId, "responsable");
  }
  return db.task.update({
    where: { id: taskId },
    data: {
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
    },
  });
}

export async function toggleTaskDone(db: ScopedPrismaClient, actor: MutationActor, taskId: string, done: boolean) {
  if (!canManageTasks(actor.role)) {
    throw new ForbiddenError("No tienes permisos para actualizar tareas.");
  }
  const task = await db.task.findFirst({ where: { id: taskId }, select: { id: true } });
  if (!task) {
    throw new NotFoundError("La tarea no existe.");
  }
  const status: TaskStatus = done ? "DONE" : "TODO";
  return db.task.update({ where: { id: taskId }, data: { status } });
}

export async function deleteTask(db: ScopedPrismaClient, actor: MutationActor, taskId: string) {
  if (!canManageTasks(actor.role)) {
    throw new ForbiddenError("No tienes permisos para eliminar tareas.");
  }
  const task = await db.task.findFirst({ where: { id: taskId }, select: { id: true } });
  if (!task) {
    throw new NotFoundError("La tarea no existe.");
  }
  return db.task.delete({ where: { id: taskId } });
}

// ── Etiquetas ────────────────────────────────────────────────────────────────

export async function createTag(db: ScopedPrismaClient, actor: MutationActor, rawInput: unknown) {
  if (!canManageTasks(actor.role)) {
    throw new ForbiddenError("No tienes permisos para crear etiquetas.");
  }
  const input = tagInputSchema.parse(rawInput);
  const existing = await db.tag.findFirst({ where: { name: input.name }, select: { id: true } });
  if (existing) {
    throw new DuplicateNameError(`Ya existe una etiqueta llamada «${input.name}».`);
  }
  return db.tag.create({ data: { tenantId: actor.tenantId, name: input.name } });
}

export async function renameTag(db: ScopedPrismaClient, actor: MutationActor, tagId: string, rawInput: unknown) {
  if (!canManageCatalogs(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar etiquetas.");
  }
  const input = tagInputSchema.parse(rawInput);
  const tag = await db.tag.findFirst({ where: { id: tagId }, select: { id: true } });
  if (!tag) {
    throw new NotFoundError("La etiqueta no existe.");
  }
  const clash = await db.tag.findFirst({ where: { name: input.name, id: { not: tagId } }, select: { id: true } });
  if (clash) {
    throw new DuplicateNameError(`Ya existe una etiqueta llamada «${input.name}».`);
  }
  return db.tag.update({ where: { id: tagId }, data: { name: input.name } });
}

export async function deleteTag(db: ScopedPrismaClient, actor: MutationActor, tagId: string) {
  if (!canManageCatalogs(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar etiquetas.");
  }
  const tag = await db.tag.findFirst({ where: { id: tagId }, select: { id: true } });
  if (!tag) {
    throw new NotFoundError("La etiqueta no existe.");
  }
  // La M:N se desasocia sola; los proyectos no se tocan.
  return db.tag.delete({ where: { id: tagId } });
}

// ── Tipos de proceso ─────────────────────────────────────────────────────────

export async function createProcessType(db: ScopedPrismaClient, actor: MutationActor, rawInput: unknown) {
  if (!canManageCatalogs(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar el catálogo de tipos.");
  }
  const input = processTypeInputSchema.parse(rawInput);
  const existing = await db.processType.findFirst({ where: { name: input.name }, select: { id: true } });
  if (existing) {
    throw new DuplicateNameError(`Ya existe un tipo de proceso llamado «${input.name}».`);
  }
  return db.processType.create({ data: { tenantId: actor.tenantId, name: input.name } });
}

export async function renameProcessType(
  db: ScopedPrismaClient,
  actor: MutationActor,
  typeId: string,
  rawInput: unknown,
) {
  if (!canManageCatalogs(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar el catálogo de tipos.");
  }
  const input = processTypeInputSchema.parse(rawInput);
  const type = await db.processType.findFirst({ where: { id: typeId }, select: { id: true } });
  if (!type) {
    throw new NotFoundError("El tipo de proceso no existe.");
  }
  const clash = await db.processType.findFirst({
    where: { name: input.name, id: { not: typeId } },
    select: { id: true },
  });
  if (clash) {
    throw new DuplicateNameError(`Ya existe un tipo de proceso llamado «${input.name}».`);
  }
  return db.processType.update({ where: { id: typeId }, data: { name: input.name } });
}

export async function deleteProcessType(db: ScopedPrismaClient, actor: MutationActor, typeId: string) {
  if (!canManageCatalogs(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar el catálogo de tipos.");
  }
  const type = await db.processType.findFirst({ where: { id: typeId }, select: { id: true } });
  if (!type) {
    throw new NotFoundError("El tipo de proceso no existe.");
  }
  // `SetNull` en la FK: los proyectos que lo usaban quedan «sin tipo» (FR-021).
  return db.processType.delete({ where: { id: typeId } });
}
