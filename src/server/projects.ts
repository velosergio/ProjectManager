"use server";

import { MissingTenantContextError } from "@/lib/errors";
import { createProjectWithQuota } from "@/lib/plans/gating";
import { getTenantContext } from "@/lib/tenant-context";

/// Server action de ejemplo: crea un proyecto en el tenant de la sesión
/// respetando la cuota del plan (patrón reutilizable para futuras features).
export async function createProject(input: { name: string; description?: string | null }) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new MissingTenantContextError();
  }
  return createProjectWithQuota(ctx.tenantId, input);
}
