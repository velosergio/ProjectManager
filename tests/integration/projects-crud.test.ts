import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DuplicateNameError, ForbiddenError, NotFoundError, QuotaExceededError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { MutationActor } from "@/lib/projects/mutations";
import {
  createProcessType,
  createProject,
  createTask,
  deleteProcessType,
  deleteProject,
  updateProject,
} from "@/lib/projects/mutations";
import { scopedClientFor } from "@/lib/tenant-db";

// CRUD de proyectos (US1): cuota, aislamiento entre tenants, permisos por rol,
// catálogo de tipos y cascada de eliminación (FR-001..FR-005, FR-018, FR-021).

const stamp = Date.now();
let tenantA: string;
let tenantB: string;
let tenantQuota: string;
let adminA: MutationActor;
let memberA: MutationActor;
let viewerA: MutationActor;
let adminB: MutationActor;
let adminQuota: MutationActor;

async function createTenant(name: string, planCode: "PRO" | "GRATUITO") {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: planCode } });
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
  tenantA = await createTenant(`CRUD-A ${stamp}`, "PRO");
  tenantB = await createTenant(`CRUD-B ${stamp}`, "PRO");
  tenantQuota = await createTenant(`CRUD-Q ${stamp}`, "GRATUITO");
  adminA = await createUser(tenantA, "ADMIN", "crud-admin-a");
  memberA = await createUser(tenantA, "MEMBER", "crud-member-a");
  viewerA = await createUser(tenantA, "VIEWER", "crud-viewer-a");
  adminB = await createUser(tenantB, "ADMIN", "crud-admin-b");
  adminQuota = await createUser(tenantQuota, "ADMIN", "crud-admin-q");
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB, tenantQuota] } } });
  await prisma.$disconnect();
});

describe("createProject", () => {
  it("crea el proyecto con defaults y su proceso «General»", async () => {
    const db = scopedClientFor(tenantA);
    const project = await createProject(db, adminA, { name: "Proyecto base" });
    expect(project.status).toBe("PENDING");
    expect(project.priority).toBe("MEDIUM");
    const processes = await prisma.process.findMany({ where: { projectId: project.id } });
    expect(processes).toHaveLength(1);
    expect(processes[0]?.name).toBe("General");
  });

  it("acepta todos los campos y valida referencias del tenant", async () => {
    const db = scopedClientFor(tenantA);
    const type = await createProcessType(db, adminA, { name: `Consultoría ${stamp}` });
    const project = await createProject(db, adminA, {
      name: "Proyecto completo",
      description: "Con todos los campos",
      priority: "HIGH",
      status: "IN_PROGRESS",
      startDate: "2026-07-01",
      endDate: "2026-08-01",
      ownerId: memberA.userId,
      processTypeId: type.id,
    });
    expect(project.ownerId).toBe(memberA.userId);
    expect(project.processTypeId).toBe(type.id);
  });

  it("rechaza un responsable de otro tenant (FR-011)", async () => {
    const db = scopedClientFor(tenantA);
    await expect(createProject(db, adminA, { name: "Owner ajeno", ownerId: adminB.userId })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("VIEWER y MEMBER no pueden crear proyectos (FR-018)", async () => {
    const db = scopedClientFor(tenantA);
    await expect(createProject(db, viewerA, { name: "No debería" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createProject(db, memberA, { name: "Tampoco" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("cuota del plan (FR-004)", () => {
  it("rechaza al alcanzar la cuota, también en concurrencia", async () => {
    const db = scopedClientFor(tenantQuota);
    await createProject(db, adminQuota, { name: "Q1" });
    await createProject(db, adminQuota, { name: "Q2" });

    // Dos intentos simultáneos para el último cupo: máximo uno entra.
    const results = await Promise.allSettled([
      createProject(db, adminQuota, { name: "Q3-a" }),
      createProject(db, adminQuota, { name: "Q3-b" }),
    ]);
    const count = await prisma.project.count({ where: { tenantId: tenantQuota } });
    expect(count).toBeLessThanOrEqual(3);
    expect(results.some((r) => r.status === "fulfilled")).toBe(true);

    // Con la cuota llena, el siguiente intento falla con QuotaExceededError.
    if (count === 3) {
      await expect(createProject(db, adminQuota, { name: "Q4" })).rejects.toBeInstanceOf(QuotaExceededError);
    }
  });
});

describe("aislamiento entre tenants (FR-003 / SC-004)", () => {
  it("un tenant no ve ni edita proyectos de otro", async () => {
    const dbA = scopedClientFor(tenantA);
    const dbB = scopedClientFor(tenantB);
    const project = await createProject(dbA, adminA, { name: "Solo de A" });

    const visibleDesdeB = await dbB.project.findFirst({ where: { id: project.id } });
    expect(visibleDesdeB).toBeNull();

    await expect(updateProject(dbB, adminB, project.id, { name: "Hackeado" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteProject(dbB, adminB, project.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateProject y permisos de MEMBER", () => {
  it("MEMBER edita el proyecto donde es responsable, pero no otros", async () => {
    const db = scopedClientFor(tenantA);
    const suyo = await createProject(db, adminA, { name: "De member", ownerId: memberA.userId });
    const ajeno = await createProject(db, adminA, { name: "De admin" });

    const updated = await updateProject(db, memberA, suyo.id, { name: "De member (editado)", ownerId: memberA.userId });
    expect(updated.name).toBe("De member (editado)");

    await expect(updateProject(db, memberA, ajeno.id, { name: "Intruso" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteProject(db, memberA, suyo.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rechaza fechas invertidas con mensaje de validación", async () => {
    const db = scopedClientFor(tenantA);
    const project = await createProject(db, adminA, { name: "Fechas" });
    await expect(
      updateProject(db, adminA, project.id, { name: "Fechas", startDate: "2026-08-01", endDate: "2026-07-01" }),
    ).rejects.toMatchObject({ name: "ZodError" });
  });
});

describe("catálogo de tipos de proceso (FR-021)", () => {
  it("nombra únicos por tenant y al eliminar deja los proyectos «sin tipo»", async () => {
    const db = scopedClientFor(tenantA);
    const type = await createProcessType(db, adminA, { name: `Ordinario ${stamp}` });
    await expect(createProcessType(db, adminA, { name: `Ordinario ${stamp}` })).rejects.toBeInstanceOf(
      DuplicateNameError,
    );

    // El mismo nombre en otro tenant sí es válido (unicidad por tenant).
    const dbB = scopedClientFor(tenantB);
    await expect(createProcessType(dbB, adminB, { name: `Ordinario ${stamp}` })).resolves.toBeTruthy();

    const project = await createProject(db, adminA, { name: "Tipado", processTypeId: type.id });
    await deleteProcessType(db, adminA, type.id);
    const after = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(after.processTypeId).toBeNull();
  });

  it("MEMBER no gestiona el catálogo", async () => {
    const db = scopedClientFor(tenantA);
    await expect(createProcessType(db, memberA, { name: "Prohibido" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("deleteProject (FR-002)", () => {
  it("elimina en cascada procesos y tareas", async () => {
    const db = scopedClientFor(tenantA);
    const project = await createProject(db, adminA, { name: "Para borrar" });
    await createTask(db, adminA, project.id, { title: "Tarea colgante" });

    await deleteProject(db, adminA, project.id);

    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    expect(await prisma.process.count({ where: { projectId: project.id } })).toBe(0);
  });
});
