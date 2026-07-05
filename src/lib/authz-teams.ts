import type { UserRole } from "@/generated/prisma/client";

// Matriz de permisos de los equipos de trabajo (FASE 4). Funciones puras: la
// fuente de verdad se aplica en `src/lib/teams/mutations.ts` y la UI solo las
// usa para ocultar acciones. La consulta (listado y detalle) está permitida a
// todos los roles del tenant.

/// Roles con capacidad de gestión de equipos (crear/editar/eliminar y
/// componer la membresía): ADMIN y MANAGER, más MANGO (transversal).
export function canManageTeams(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "MANGO";
}
