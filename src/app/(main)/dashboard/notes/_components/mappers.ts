import type { UserRole } from "@/generated/prisma/client";
import { canModifyNote } from "@/lib/authz-notes";
import type { NoteRow } from "@/lib/notes/queries";

import type { NoteListItem } from "./types";

// Adaptadores de las consultas de notas a los tipos de UI (se ejecutan en los
// RSC antes de cruzar el límite servidor → cliente).

/// Contexto enlazable de una nota: las notas de tarea enlazan al proyecto de
/// la tarea (la tarea no tiene página propia; se abre en su Sheet, US4).
function noteContext(note: NoteRow): NoteListItem["context"] {
  if (note.project) {
    return { label: note.project.name, href: `/dashboard/projects/${note.project.id}` };
  }
  if (note.task) {
    return { label: note.task.title, href: `/dashboard/projects/${note.task.process.projectId}` };
  }
  if (note.team) {
    return { label: note.team.name, href: `/dashboard/teams/${note.team.id}` };
  }
  return null;
}

/// Serializa una nota para los componentes cliente, resolviendo autor,
/// contexto y permiso de modificación del espectador (FR-019).
export function toNoteListItem(note: NoteRow, viewer: { userId: string; role: UserRole }): NoteListItem {
  return {
    id: note.id,
    scope: note.scope,
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt,
    authorName: note.author?.name ?? null,
    context: noteContext(note),
    canModify: canModifyNote(viewer.role, viewer.userId, note.authorId),
  };
}
