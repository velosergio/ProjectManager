import { ForbiddenError, MissingTenantContextError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { type ScopedPrismaClient, scopedClientFor } from "@/lib/tenant-db";

// Helpers de acceso a datos ligados a la sesión. Viven en un módulo separado de
// `tenant-db.ts` (que es puro y testeable) porque importan NextAuth.

/// Asevera que el usuario de la sesión sigue activo: al desactivar un miembro
/// su JWT puede seguir vivo, así que la revocación se aplica en la puerta de
/// datos, en la siguiente interacción (FASE 4, FR-007/SC-003).
async function assertActiveUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (user?.status !== "ACTIVE") {
    throw new ForbiddenError("Tu acceso ha sido revocado. Inicia sesión de nuevo.");
  }
}

/// Cliente escopado al tenant de la sesión actual (admin) o al seleccionado por
/// `mango`. Lanza si no hay tenant resoluble (FR-002/FR-004) o si el usuario de
/// la sesión ya no está activo.
export async function getTenantDb(): Promise<ScopedPrismaClient> {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new MissingTenantContextError();
  }
  await assertActiveUser(ctx.userId);
  return scopedClientFor(ctx.tenantId);
}

/// Cliente global SIN scoping. Única vía autorizada para cruzar la frontera de
/// tenant; asevera el rol `mango` (FR-006) y que la cuenta siga activa.
export async function getAdminDb() {
  const ctx = await getTenantContext();
  if (ctx?.role !== "MANGO") {
    throw new ForbiddenError("Esta operación está restringida al rol mango.");
  }
  await assertActiveUser(ctx.userId);
  return prisma;
}
