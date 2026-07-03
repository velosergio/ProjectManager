import type { UserRole } from "@/generated/prisma/client";

// Matriz de permisos de la gestión de proyectos y tareas (FR-018). Funciones
// puras: la fuente de verdad se aplica en `src/lib/projects/mutations.ts` y la
// UI solo las usa para ocultar acciones no permitidas.

/// Actor de una operación: usuario de la sesión.
export interface ProjectActor {
  userId: string;
  role: UserRole;
}

/// Datos mínimos del proyecto para decidir la edición por un MEMBER.
export interface ProjectForAuthz {
  ownerId: string | null;
  /// Ids de los usuarios asignados a alguna tarea del proyecto.
  taskAssigneeIds: readonly string[];
}

/// Roles con capacidad de gestión plena de proyectos (crear/editar/eliminar).
export function canManageProjects(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "MANGO";
}

/// ¿Puede el actor editar (no eliminar) este proyecto? Los roles de gestión
/// siempre; MEMBER solo donde es responsable del proyecto o de alguna tarea.
export function canEditProject(actor: ProjectActor, project: ProjectForAuthz): boolean {
  if (canManageProjects(actor.role)) {
    return true;
  }
  if (actor.role !== "MEMBER") {
    return false;
  }
  return project.ownerId === actor.userId || project.taskAssigneeIds.includes(actor.userId);
}

/// Eliminar proyectos queda reservado a los roles de gestión.
export function canDeleteProject(role: UserRole): boolean {
  return canManageProjects(role);
}

/// Todos los roles salvo VIEWER gestionan tareas (crear/editar/completar/eliminar).
export function canManageTasks(role: UserRole): boolean {
  return role !== "VIEWER";
}

/// Gestión de catálogos (renombrar/eliminar etiquetas y tipos de proceso).
export function canManageCatalogs(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "MANGO";
}
