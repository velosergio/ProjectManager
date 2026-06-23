import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { registerOrganization } from "@/lib/register";

const EMAIL = `reg_${Date.now()}@example.com`;
const ORG = `Org ${Date.now()}`;

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (user?.tenantId) {
    await prisma.tenant.delete({ where: { id: user.tenantId } });
  }
  await prisma.$disconnect();
});

describe("registerOrganization", () => {
  it("crea Tenant + admin + Subscription(GRATUITO, ACTIVE) en transacción", async () => {
    const result = await registerOrganization({
      organizationName: ORG,
      name: "Dueño",
      email: EMAIL,
      password: "password123",
    });
    expect(result).toEqual({ ok: true });

    const tenant = await prisma.tenant.findFirst({
      where: { name: ORG },
      include: { users: true, subscription: { include: { plan: true } } },
    });
    expect(tenant).not.toBeNull();
    // FR-015a: exactamente un admin por tenant.
    expect(tenant?.users.filter((u) => u.role === "ADMIN")).toHaveLength(1);
    expect(tenant?.subscription?.status).toBe("ACTIVE");
    expect(tenant?.subscription?.plan.code).toBe("GRATUITO");
  });

  it("rechaza email duplicado sin crear una segunda organización", async () => {
    const result = await registerOrganization({
      organizationName: "Otra Org",
      name: "Otro",
      email: EMAIL,
      password: "password123",
    });
    expect(result).toEqual({ ok: false, code: "EMAIL_TAKEN" });
    expect(await prisma.tenant.findFirst({ where: { name: "Otra Org" } })).toBeNull();
  });
});
