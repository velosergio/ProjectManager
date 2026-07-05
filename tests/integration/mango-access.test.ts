import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mockeamos el contexto de tenant para no cargar NextAuth en el runner.
const { getTenantContextMock } = vi.hoisted(() => ({ getTenantContextMock: vi.fn() }));
vi.mock("@/lib/tenant-context", () => ({
  getTenantContext: getTenantContextMock,
  MANGO_TENANT_COOKIE: "mango_active_tenant",
}));

import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getAdminDb } from "@/lib/tenant-db-session";

// Desde la FASE 4, getAdminDb() verifica que el usuario de la sesión exista y
// esté ACTIVE (revocación FR-007): el mango del mock debe ser un usuario real.

const stamp = Date.now();
let mangoId: string;

beforeAll(async () => {
  const mango = await prisma.user.create({
    data: { name: "Mango de prueba", email: `mango-access-${stamp}@test.local`, role: "MANGO", status: "ACTIVE" },
  });
  mangoId = mango.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: mangoId } });
  await prisma.$disconnect();
});

describe("getAdminDb — bypass del rol mango (SC-007)", () => {
  it("MANGO obtiene un cliente global que lista organizaciones de cualquier tenant", async () => {
    getTenantContextMock.mockResolvedValue({ userId: mangoId, role: "MANGO", tenantId: null });
    const db = await getAdminDb();
    const tenants = await db.tenant.findMany();
    expect(Array.isArray(tenants)).toBe(true);
  });

  it("un MANGO desactivado pierde el acceso global (FR-007)", async () => {
    await prisma.user.update({ where: { id: mangoId }, data: { status: "INACTIVE" } });
    getTenantContextMock.mockResolvedValue({ userId: mangoId, role: "MANGO", tenantId: null });
    await expect(getAdminDb()).rejects.toBeInstanceOf(ForbiddenError);
    await prisma.user.update({ where: { id: mangoId }, data: { status: "ACTIVE" } });
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
