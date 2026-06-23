import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { scopedClientFor } from "@/lib/tenant-db";

// Prueba de aislamiento entre tenants (SC-001/SC-002). Usa la base real de
// desarrollo: crea dos organizaciones, opera con clientes escopados y limpia.

let tenantA: string;
let tenantB: string;
let projectB: string;

beforeAll(async () => {
  const a = await prisma.tenant.create({ data: { name: "Aislamiento A" } });
  const b = await prisma.tenant.create({ data: { name: "Aislamiento B" } });
  tenantA = a.id;
  tenantB = b.id;

  await prisma.project.create({ data: { name: "Proyecto A", tenantId: tenantA } });
  const pb = await prisma.project.create({ data: { name: "Proyecto B", tenantId: tenantB } });
  projectB = pb.id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("aislamiento por tenantId", () => {
  it("I1: una lectura escopada solo ve datos de su tenant", async () => {
    const db = scopedClientFor(tenantA);
    const projects = await db.project.findMany();
    expect(projects.length).toBeGreaterThan(0);
    expect(projects.every((p) => p.tenantId === tenantA)).toBe(true);
  });

  it("I2: una escritura fija el tenantId del contexto, ignorando el entrante", async () => {
    const db = scopedClientFor(tenantA);
    const created = await db.project.create({
      data: { name: "Intento cruzado", tenantId: tenantB } as never,
    });
    expect(created.tenantId).toBe(tenantA);
  });

  it("findUnique de un recurso de otro tenant devuelve null (no revela existencia)", async () => {
    const db = scopedClientFor(tenantA);
    const found = await db.project.findUnique({ where: { id: projectB } });
    expect(found).toBeNull();
  });

  it("deleteMany no afecta a datos de otro tenant", async () => {
    const db = scopedClientFor(tenantA);
    await db.project.deleteMany({});
    const remainingB = await prisma.project.findMany({ where: { tenantId: tenantB } });
    expect(remainingB.length).toBeGreaterThan(0);
  });
});
