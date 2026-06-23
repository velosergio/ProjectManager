import { notFound } from "next/navigation";

import { type AccessContext, type AccessRequirement, canAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

/// Resuelve el contexto de acceso (rol + plan vigente) de la sesión actual.
/// Devuelve `null` si no hay sesión. Para `mango`, `planCode` es `null`.
export async function getAccessContext(): Promise<AccessContext | null> {
  const ctx = await getTenantContext();
  if (!ctx) {
    return null;
  }

  let planCode: AccessContext["planCode"] = null;
  if (ctx.tenantId) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId: ctx.tenantId },
      include: { plan: true },
    });
    planCode = subscription?.plan.code ?? null;
  }

  return { role: ctx.role, planCode };
}

/// Guarda de ruta de servidor: deniega (404) si la sesión no cumple el requisito
/// de rol/plan, con independencia de la visibilidad en el menú (FR-017).
export async function requireAccess(requirement: AccessRequirement): Promise<AccessContext> {
  const access = await getAccessContext();
  if (!access || !canAccess(access, requirement)) {
    notFound();
  }
  return access;
}
