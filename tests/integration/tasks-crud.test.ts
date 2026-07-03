import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { MutationActor } from "@/lib/projects/mutations";
import { createProject, createTask, deleteTask, toggleTaskDone, updateTask } from "@/lib/projects/mutations";
import { getProjectDetail, isTaskOverdue } from "@/lib/projects/queries";
import { scopedClientFor } from "@/lib/tenant-db";

// Tareas y avance derivado (US2): CRUD en el proceso por defecto, responsables
// del tenant, flag de vencida y permisos (FR-009..FR-011, FR-018, FR-019).

const stamp = Date.now();
let tenantA: string;
let tenantB: string;
let adminA: MutationActor;
let memberA: MutationActor;
let viewerA: MutationActor;
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

async function createUser(
  tenantId: string,
  role: "ADMIN" | "MEMBER" | "VIEWER",
  label: string,
): Promise<MutationActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}-${stamp}@test.local`, role, tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role, tenantId };
}

beforeAll(async () => {
  tenantA = await createTenant(`TASKS-A ${stamp}`);
  tenantB = await createTenant(`TASKS-B ${stamp}`);
  adminA = await createUser(tenantA, "ADMIN", "tasks-admin-a");
  memberA = await createUser(tenantA, "MEMBER", "tasks-member-a");
  viewerA = await createUser(tenantA, "VIEWER", "tasks-viewer-a");
  adminB = await createUser(tenantB, "ADMIN", "tasks-admin-b");

  const db = scopedClientFor(tenantA);
  const project = await createProject(db, adminA, { name: "Proyecto de tareas" });
  projectId = project.id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("createTask", () => {
  it("crea la tarea en el proceso por defecto con estado Pendiente", async () => {
    const db = scopedClientFor(tenantA);
    const task = await createTask(db, adminA, projectId, { title: "Primera tarea" });
    expect(task.status).toBe("TODO");

    const process = await prisma.process.findFirstOrThrow({ where: { projectId }, orderBy: { order: "asc" } });
    expect(task.processId).toBe(process.id);
  });

  it("MEMBER crea tareas; VIEWER no (FR-018)", async () => {
    const db = scopedClientFor(tenantA);
    await expect(createTask(db, memberA, projectId, { title: "De member" })).resolves.toBeTruthy();
    await expect(createTask(db, viewerA, projectId, { title: "De viewer" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rechaza un responsable de otro tenant (FR-011)", async () => {
    const db = scopedClientFor(tenantA);
    await expect(
      createTask(db, adminA, projectId, { title: "Ajena", assigneeId: adminB.userId }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("no crea tareas en proyectos de otro tenant", async () => {
    const dbB = scopedClientFor(tenantB);
    await expect(createTask(dbB, adminB, projectId, { title: "Cruzada" })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("avance derivado (FR-010)", () => {
  it("0 % sin tareas y 50 % con 2 de 4 finalizadas", async () => {
    const db = scopedClientFor(tenantA);
    const project = await createProject(db, adminA, { name: "Proyecto avance" });

    const empty = await getProjectDetail(db, project.id);
    expect(empty?.progress).toEqual({ total: 0, done: 0, pct: 0 });

    const t1 = await createTask(db, adminA, project.id, { title: "T1" });
    const t2 = await createTask(db, adminA, project.id, { title: "T2" });
    await createTask(db, adminA, project.id, { title: "T3" });
    await createTask(db, adminA, project.id, { title: "T4" });

    await toggleTaskDone(db, adminA, t1.id, true);
    await toggleTaskDone(db, adminA, t2.id, true);

    const detail = await getProjectDetail(db, project.id);
    expect(detail?.progress).toEqual({ total: 4, done: 2, pct: 50 });

    // Reabrir una tarea recalcula el avance.
    await toggleTaskDone(db, adminA, t1.id, false);
    const reopened = await getProjectDetail(db, project.id);
    expect(reopened?.progress.pct).toBe(25);
  });
});

describe("updateTask y deleteTask", () => {
  it("actualiza título, estado, responsable y fecha", async () => {
    const db = scopedClientFor(tenantA);
    const task = await createTask(db, adminA, projectId, { title: "Editable" });
    const updated = await updateTask(db, adminA, task.id, {
      title: "Editada",
      status: "IN_PROGRESS",
      assigneeId: memberA.userId,
      dueDate: "2026-09-01",
    });
    expect(updated.title).toBe("Editada");
    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.assigneeId).toBe(memberA.userId);
  });

  it("VIEWER no muta y otro tenant no alcanza la tarea", async () => {
    const db = scopedClientFor(tenantA);
    const task = await createTask(db, adminA, projectId, { title: "Protegida" });
    await expect(toggleTaskDone(db, viewerA, task.id, true)).rejects.toBeInstanceOf(ForbiddenError);

    const dbB = scopedClientFor(tenantB);
    await expect(deleteTask(dbB, adminB, task.id)).rejects.toBeInstanceOf(NotFoundError);

    await expect(deleteTask(db, memberA, task.id)).resolves.toBeTruthy();
  });
});

describe("tareas vencidas (FR-019)", () => {
  it("marca overdue solo si la fecha pasó y no está finalizada", async () => {
    const now = new Date("2026-07-02T12:00:00");
    const ayer = new Date("2026-07-01T10:00:00");
    const hoy = new Date("2026-07-02T09:00:00");
    expect(isTaskOverdue(ayer, "TODO", now)).toBe(true);
    expect(isTaskOverdue(ayer, "DONE", now)).toBe(false);
    expect(isTaskOverdue(hoy, "TODO", now)).toBe(false);
    expect(isTaskOverdue(null, "TODO", now)).toBe(false);
  });

  it("expone el flag en el detalle", async () => {
    const db = scopedClientFor(tenantA);
    const project = await createProject(db, adminA, { name: "Proyecto vencidas" });
    await createTask(db, adminA, project.id, { title: "Atrasada", dueDate: "2020-01-01" });
    const detail = await getProjectDetail(db, project.id);
    expect(detail?.tasks[0]?.overdue).toBe(true);
  });
});
