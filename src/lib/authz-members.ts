import type { UserRole } from "@/generated/prisma/client";

// Matriz de permisos de la gestión de miembros (FASE 4, clarificación
// 2026-07-03). Funciones puras: la fuente de verdad se aplica en
// `src/lib/members/mutations.ts` y la UI solo las usa para ocultar acciones.
// La consulta del listado de miembros está permitida a todos los roles.

/// Roles con capacidad de gestión de miembros (invitar, cambiar roles,
/// desactivar/reactivar): solo ADMIN de la organización, más MANGO (global).
export function canManageMembers(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANGO";
}

/// Roles asignables a un miembro del tenant. MANGO nunca se asigna por
/// invitación: solo se crea vía `npm run mango`.
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"] as const satisfies readonly UserRole[];

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
