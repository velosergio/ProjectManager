import type { PlanCode, UserRole } from "@/generated/prisma/client";
import { PLAN_FEATURES, type PlanFeature } from "@/lib/plans/definitions";

export interface AccessContext {
  role: UserRole;
  /// Plan vigente del tenant; `null` para `mango` (acceso global, sin tenant).
  planCode: PlanCode | null;
}

export interface AccessRequirement {
  requiredRole?: UserRole;
  requiredFeature?: PlanFeature;
}

/// ¿El plan incluye la feature? `null` (sin plan) nunca la incluye.
export function hasFeature(planCode: PlanCode | null, feature: PlanFeature): boolean {
  if (!planCode) {
    return false;
  }
  return Boolean(PLAN_FEATURES[planCode]?.[feature]);
}

/// Predicado de autorización por rol y por plan. El rol `mango` tiene acceso
/// transversal a las features (no a items con `requiredRole` distinto). Es la
/// misma lógica que filtra el menú y que aplican las guardas de ruta (FR-017).
export function canAccess(ctx: AccessContext, requirement: AccessRequirement): boolean {
  if (requirement.requiredRole && ctx.role !== requirement.requiredRole) {
    return false;
  }

  if (requirement.requiredFeature) {
    if (ctx.role === "MANGO") {
      return true;
    }
    if (!hasFeature(ctx.planCode, requirement.requiredFeature)) {
      return false;
    }
  }

  return true;
}
