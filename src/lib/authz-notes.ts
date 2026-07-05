import type { UserRole } from "@/generated/prisma/client";

// Matriz de permisos de las notas (FASE 4, clarificación 2026-07-03).
// Funciones puras: la fuente de verdad se aplica en `src/lib/notes/mutations.ts`
// y la UI solo las usa para ocultar acciones. La lectura es organizacional:
// toda nota del tenant es legible por cualquiera de sus miembros.

/// Roles que pueden crear notas: todos salvo el lector (VIEWER).
export function canCreateNotes(role: UserRole): boolean {
  return role !== "VIEWER";
}

/// Quién puede editar o eliminar una nota: su autor, o un rol de gestión
/// (ADMIN/MANAGER del tenant, MANGO transversal).
export function canModifyNote(role: UserRole, userId: string, authorId: string | null): boolean {
  if (role === "VIEWER") return false;
  if (role === "ADMIN" || role === "MANAGER" || role === "MANGO") return true;
  return authorId !== null && authorId === userId;
}
