import type { UserRole } from "@/generated/prisma/client";

// Matriz de permisos de la gestión de clientes (FASE 3, clarificación
// 2026-07-03). Funciones puras: la fuente de verdad se aplica en
// `src/lib/clients/mutations.ts` y la UI solo las usa para ocultar acciones.
// La consulta (listado y detalle) está permitida a todos los roles del tenant.

/// Roles con capacidad de gestión de clientes (crear/editar/eliminar):
/// ADMIN y MANAGER de la organización, más MANGO (transversal).
export function canManageClients(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "MANGO";
}
