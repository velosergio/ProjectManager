import { cookies } from "next/headers";

import type { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

/// Cookie donde el rol `mango` guarda el tenant que está inspeccionando.
export const MANGO_TENANT_COOKIE = "mango_active_tenant";

export interface TenantContext {
  userId: string;
  role: UserRole;
  /// Tenant efectivo: el de la sesión (admin) o el seleccionado por mango.
  tenantId: string | null;
}

/// Resuelve el contexto de tenant de la petición actual a partir de la sesión.
/// Para `mango` el tenant proviene de la cookie de selección; devuelve `null`
/// si no hay sesión.
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const role = session.user.role;
  let tenantId = session.user.tenantId ?? null;

  if (role === "MANGO") {
    const store = await cookies();
    tenantId = store.get(MANGO_TENANT_COOKIE)?.value ?? null;
  }

  return { userId: session.user.id, role, tenantId };
}
