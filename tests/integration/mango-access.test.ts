import { afterAll, describe, expect, it, vi } from "vitest";

// Mockeamos el contexto de tenant para no cargar NextAuth en el runner.
const { getTenantContextMock } = vi.hoisted(() => ({ getTenantContextMock: vi.fn() }));
vi.mock("@/lib/tenant-context", () => ({
  getTenantContext: getTenantContextMock,
  MANGO_TENANT_COOKIE: "mango_active_tenant",
}));

import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getAdminDb } from "@/lib/tenant-db-session";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getAdminDb — bypass del rol mango (SC-007)", () => {
  it("MANGO obtiene un cliente global que lista organizaciones de cualquier tenant", async () => {
    getTenantContextMock.mockResolvedValue({ userId: "u1", role: "MANGO", tenantId: null });
    const db = await getAdminDb();
    const tenants = await db.tenant.findMany();
    expect(Array.isArray(tenants)).toBe(true);
  });

  it("ADMIN recibe ForbiddenError y no cruza la frontera de tenant", async () => {
    getTenantContextMock.mockResolvedValue({ userId: "u2", role: "ADMIN", tenantId: "t1" });
    await expect(getAdminDb()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("sin sesión, getAdminDb también deniega", async () => {
    getTenantContextMock.mockResolvedValue(null);
    await expect(getAdminDb()).rejects.toBeInstanceOf(ForbiddenError);
  });
});
