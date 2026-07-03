import type { ProjectPriority, ProjectStatus, TaskStatus } from "@/generated/prisma/client";

// Etiquetas en español de los enums de proyectos/tareas. Único punto de verdad
// para la UI: ninguna pantalla debe hardcodear estos textos.

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  IN_REVIEW: "En revisión",
  COMPLETED: "Finalizado",
  ARCHIVED: "Archivado",
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Pendiente",
  IN_PROGRESS: "En proceso",
  DONE: "Finalizada",
};

/// Orden estable de los enums para selects y filtros.
export const PROJECT_STATUS_ORDER: ProjectStatus[] = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "ARCHIVED"];
export const PROJECT_PRIORITY_ORDER: ProjectPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const TASK_STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
