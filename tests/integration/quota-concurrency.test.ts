import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createProjectWithQuota } from "@/lib/plans/gating";
import { prisma } from "@/lib/prisma";

// Concurrencia en el límite de cuota (edge case): dos creaciones simultáneas no
// deben superar el límite del plan gracias a la transacción serializable.

let tenantId: string;

beforeAll(async () => {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "GRATUITO" } });
  const tenant = await prisma.tenant.create({ data: { name: `Cuota ${Date.now()}` } });
  tenantId = tenant.id;
  await prisma.subscription.create({
    data: { tenantId, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" },
  });
  // Pre-cargar 2 de los 3 proyectos permitidos en el plan Gratuito.
  await prisma.project.createMany({
    data: [
      { name: "P1", tenantId },
      { name: "P2", tenantId },
    ],
  });
});

afterAll(async () => {
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("createProjectWithQuota — concurrencia", () => {
  it("dos creaciones simultáneas no superan la cuota (3)", async () => {
    await Promise.allSettled([
      createProjectWithQuota(tenantId, { name: "C1" }),
      createProjectWithQuota(tenantId, { name: "C2" }),
    ]);

    const count = await prisma.project.count({ where: { tenantId } });
    expect(count).toBeLessThanOrEqual(3);
  });
});
