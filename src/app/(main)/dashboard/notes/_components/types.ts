import type { NoteScope } from "@/generated/prisma/client";

// Tipos compartidos por los componentes del listado y los formularios de
// notas (datos ya serializados desde los RSC).

/// Nota lista para pintar: autor, contexto enlazado y permiso de modificación
/// ya resueltos en el servidor.
export interface NoteListItem {
  id: string;
  scope: NoteScope;
  title: string;
  content: string;
  updatedAt: Date;
  authorName: string | null;
  context: { label: string; href: string } | null;
  canModify: boolean;
}

/// Nota mínima para el formulario de edición.
export interface NoteFormNote {
  id: string;
  title: string;
  content: string;
}

/// Referencias elegibles para crear notas con alcance libre (listado central
/// y acción rápida del panel).
export interface NoteRefOptions {
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  teams: { id: string; name: string }[];
}

/// Etiquetas en español de cada alcance (Principio V).
export const NOTE_SCOPE_LABELS: Record<NoteScope, string> = {
  GLOBAL: "General",
  PROJECT: "Proyecto",
  TASK: "Tarea",
  TEAM: "Equipo",
};
