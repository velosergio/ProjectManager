import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { listMembers } from "@/lib/members/queries";
import { prisma } from "@/lib/prisma";

import { createTestTenant, createTestUser, ensurePlansSeeded, type TestActor } from "./helpers";

// Carga de trabajo por miembro (US6/FR-011): tareas activas (status ≠ DONE)
// por asignado y proyectos activos (status ∉ {COMPLETED, ARCHIVED}) por
// propietario, con ceros para miembros sin asignaciones y aislamiento.

const stamp = Date.now();

let tenantA: string;
let tenantB: string;
let workerA: TestActor;
let idleA: TestActor;
let workerB: TestActor;

async function createProject(tenantId: string, ownerId: string | null, status: "IN_PROGRESS" | "COMPLETED") {
  return prisma.project.create({
    data: { tenantId, name: `Proyecto ${status} ${Math.random()} ${stamp}`, ownerId, status },
  });
}

beforeAll(async () => {
  await ensurePlansSeeded();
  tenantA = await createTestTenant(`CAR-A ${stamp}`, "PRO_PLUS");
  tenantB = await createTestTenant(`CAR-B ${stamp}`, "PRO_PLUS");
  workerA = await createTestUser(tenantA, "MEMBER", `car-worker-a-${stamp}`);
  idleA = await createTestUser(tenantA, "MEMBER", `car-idle-a-${stamp}`);
  workerB = await createTestUser(tenantB, "MEMBER", `car-worker-b-${stamp}`);

  // Proyectos de workerA: 2 activos + 1 completado (no cuenta).
  await createProject(tenantA, workerA.userId, "IN_PROGRESS");
  await createProject(tenantA, workerA.userId, "IN_PROGRESS");
  await createProject(tenantA, workerA.userId, "COMPLETED");

  // Tareas de workerA: 3 pendientes + 1 hecha (no cuenta).
  const base = await createProject(tenantA, null, "IN_PROGRESS");
  const process = await prisma.process.create({ data: { tenantId: tenantA, projectId: base.id, name: "General" } });
  const taskStatuses = ["TODO", "IN_PROGRESS", "TODO", "DONE"] as const;
  for (const [index, status] of taskStatuses.entries()) {
    await prisma.task.create({
      data: {
        tenantId: tenantA,
        processId: process.id,
        title: `Tarea ${index} ${stamp}`,
        status,
        assigneeId: workerA.userId,
      },
    });
  }

  // Carga en otro tenant: no debe filtrarse al listado de A.
  const foreign = await createProject(tenantB, workerB.userId, "IN_PROGRESS");
  const foreignProcess = await prisma.process.create({
    data: { tenantId: tenantB, projectId: foreign.id, name: "General" },
  });
  await prisma.task.create({
    data: { tenantId: tenantB, processId: foreignProcess.id, title: `Ajena ${stamp}`, assigneeId: workerB.userId },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("listMembers — carga por miembro", () => {
  it("cuenta tareas activas y proyectos activos por miembro (FR-011)", async () => {
    const members = await listMembers(tenantA);
    const worker = members.find((member) => member.id === workerA.userId);
    expect(worker?.workload.activeTasks).toBe(3);
    expect(worker?.workload.activeProjects).toBe(2);
  });

  it("devuelve ceros para miembros sin asignaciones", async () => {
    const members = await listMembers(tenantA);
    const idle = members.find((member) => member.id === idleA.userId);
    expect(idle?.workload).toEqual({ activeTasks: 0, activeProjects: 0 });
  });

  it("no mezcla la carga de otros tenants", async () => {
    const members = await listMembers(tenantB);
    const worker = members.find((member) => member.id === workerB.userId);
    expect(worker?.workload).toEqual({ activeTasks: 1, activeProjects: 1 });
    // Ningún miembro de B aparece con la carga de A.
    expect(members.some((member) => member.workload.activeTasks === 3)).toBe(false);
  });
});
