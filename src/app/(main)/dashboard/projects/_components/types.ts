import type { ProjectPriority, ProjectStatus, TaskStatus, UserRole } from "@/generated/prisma/client";
import type { ProjectProgress } from "@/lib/projects/queries";

// Tipos compartidos por los componentes del listado y el formulario de
// proyectos (datos ya serializados desde los RSC).

export interface CatalogOption {
  id: string;
  name: string;
}

/// Catálogos que alimentan selects y filtros del formulario de proyecto.
export interface FormCatalogs {
  clients: CatalogOption[];
  members: CatalogOption[];
  processTypes: CatalogOption[];
  tags: CatalogOption[];
}

/// Actor de la sesión visible en cliente (solo para ocultar acciones; la
/// autorización real vive en el servidor).
export interface ClientActor {
  userId: string;
  role: UserRole;
}

/// Tarea del detalle de un proyecto (salida de `getProjectDetail`).
export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  assigneeId: string | null;
  assignee: CatalogOption | null;
  overdue: boolean;
}

/// Fila del listado de proyectos (salida de `listProjects`).
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: Date | null;
  endDate: Date | null;
  ownerId: string | null;
  client: CatalogOption | null;
  owner: CatalogOption | null;
  processType: CatalogOption | null;
  tags: CatalogOption[];
  progress: ProjectProgress;
}
