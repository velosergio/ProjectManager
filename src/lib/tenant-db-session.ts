import { ForbiddenError, MissingTenantContextError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { type ScopedPrismaClient, scopedClientFor } from "@/lib/tenant-db";

// Helpers de acceso a datos ligados a la sesión. Viven en un módulo separado de
// `tenant-db.ts` (que es puro y testeable) porque importan NextAuth.

/// Cliente escopado al tenant de la sesión actual (admin) o al seleccionado por
/// `mango`. Lanza si no hay tenant resoluble (FR-002/FR-004).
export async function getTenantDb(): Promise<ScopedPrismaClient> {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new MissingTenantContextError();
  }
  return scopedClientFor(ctx.tenantId);
}

/// Cliente global SIN scoping. Única vía autorizada para cruzar la frontera de
/// tenant; asevera el rol `mango` (FR-006).
export async function getAdminDb() {
  const ctx = await getTenantContext();
  if (ctx?.role !== "MANGO") {
    throw new ForbiddenError("Esta operación está restringida al rol mango.");
  }
  return prisma;
}
