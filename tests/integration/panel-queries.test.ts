import { addDays, format, startOfDay } from "date-fns";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import type { MutationActor } from "@/lib/projects/mutations";
import { createProject, createTask, toggleTaskDone } from "@/lib/projects/mutations";
import { getPanelProjects, getPanelSummary, getPanelTasks } from "@/lib/projects/queries";
import { scopedClientFor } from "@/lib/tenant-db";

// Consultas del panel (US3): alcance personal de «Tareas» y resumen, alcance
// organizacional de «Proyectos», rangos temporales y aislamiento (FR-014..FR-016).

const stamp = Date.now();
const now = new Date();
const hoy = format(now, "yyyy-MM-dd");
const manana = format(addDays(startOfDay(now), 1), "yyyy-MM-dd");

let tenantA: string;
let tenantB: string;
let adminA: MutationActor;
let memberA: MutationActor;
let adminB: MutationActor;
let projectId: string;

async function createTenant(name: string) {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "PRO" } });
  const tenant = await prisma.tenant.create({ data: { name } });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" },
  });
  return tenant.id;
}

async function createUser(tenantId: string, role: "ADMIN" | "MEMBER", label: string): Promise<MutationActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}-${stamp}@test.local`, role, tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role, tenantId };
}

beforeAll(async () => {
  tenantA = await createTenant(`PANEL-A ${stamp}`);
  tenantB = await createTenant(`PANEL-B ${stamp}`);
  adminA = await createUser(tenantA, "ADMIN", "panel-admin-a");
  memberA = await createUser(tenantA, "MEMBER", "panel-member-a");
  adminB = await createUser(tenantB, "ADMIN", "panel-admin-b");

  const db = scopedClientFor(tenantA);
  const project = await createProject(db, adminA, { name: "Proyecto panel", status: "IN_PROGRESS" });
  projectId = project.id;
  await createProject(db, adminA, { name: "Proyecto archivado", status: "ARCHIVED" });

  // Tareas de A: del admin (hoy), de member (hoy), sin responsable (mañana),
  // vencida sin finalizar (ayer) y finalizada de esta semana (hoy).
  await createTask(db, adminA, projectId, { title: "Mía hoy", assigneeId: adminA.userId, dueDate: hoy });
  await createTask(db, adminA, projectId, { title: "De member hoy", assigneeId: memberA.userId, dueDate: hoy });
  await createTask(db, adminA, projectId, { title: "Sin responsable mañana", dueDate: manana });
  await createTask(db, adminA, projectId, {
    title: "Vencida",
    assigneeId: adminA.userId,
    dueDate: format(addDays(startOfDay(now), -3), "yyyy-MM-dd"),
  });
  const done = await createTask(db, adminA, projectId, { title: "Hecha hoy", assigneeId: adminA.userId, dueDate: hoy });
  await toggleTaskDone(db, adminA, done.id, true);

  // Ruido en el tenant B: no debe filtrarse a las consultas de A.
  const dbB = scopedClientFor(tenantB);
  const projectB = await createProject(dbB, adminB, { name: "Proyecto B", status: "IN_PROGRESS" });
  await createTask(dbB, adminB, projectB.id, { title: "Tarea de B", dueDate: hoy });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("getPanelTasks — alcance personal (clarificación 2026-07-02)", () => {
  it("hoy: incluye las del usuario y las vencidas; excluye las de terceros", async () => {
    const db = scopedClientFor(tenantA);
    const tasks = await getPanelTasks(db, adminA.userId, "today", now);
    const titles = tasks.map((t) => t.title);
    expect(titles).toContain("Mía hoy");
    expect(titles).toContain("Hecha hoy");
    expect(titles).toContain("Vencida");
    expect(titles).not.toContain("De member hoy");
    expect(titles).not.toContain("Sin responsable mañana");
    expect(titles).not.toContain("Tarea de B");
    expect(tasks.find((t) => t.title === "Vencida")?.overdue).toBe(true);
  });

  it("mañana: solo las del rango, incluidas las sin responsable", async () => {
    const db = scopedClientFor(tenantA);
    const tasks = await getPanelTasks(db, adminA.userId, "tomorrow", now);
    expect(tasks.map((t) => t.title)).toEqual(["Sin responsable mañana"]);
  });

  it("semana: une hoy, vencidas y el resto de la semana", async () => {
    const db = scopedClientFor(tenantA);
    const tasks = await getPanelTasks(db, adminA.userId, "week", now);
    const titles = tasks.map((t) => t.title);
    expect(titles).toContain("Mía hoy");
    expect(titles).toContain("Vencida");
    expect(titles).not.toContain("De member hoy");
  });
});

describe("getPanelSummary (FR-016)", () => {
  it("cuenta tareas de hoy y progreso semanal con alcance personal", async () => {
    const db = scopedClientFor(tenantA);
    const summary = await getPanelSummary(db, adminA.userId, now);
    // Hoy: «Mía hoy» y «Hecha hoy» (la de member no cuenta).
    expect(summary.tasksToday).toBe(2);
    expect(summary.weekDone).toBeGreaterThanOrEqual(1);
    expect(summary.weekTotal).toBeGreaterThanOrEqual(2);
    expect(summary.activeProjects).toBe(1);
  });
});

describe("getPanelProjects (FR-014)", () => {
  it("devuelve todos los del tenant con filtro por estado, sin fugas", async () => {
    const db = scopedClientFor(tenantA);
    const all = await getPanelProjects(db);
    expect(all.map((p) => p.name)).toContain("Proyecto panel");
    expect(all.map((p) => p.name)).toContain("Proyecto archivado");
    expect(all.map((p) => p.name)).not.toContain("Proyecto B");

    const enCurso = await getPanelProjects(db, "IN_PROGRESS");
    expect(enCurso.map((p) => p.name)).toEqual(["Proyecto panel"]);
    expect(enCurso[0]?.progress.total).toBe(5);
    expect(enCurso[0]?.progress.done).toBe(1);
  });
});
