import type { Prisma } from "@/generated/prisma/client";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import type { NoteFilters } from "./schemas";

// Consultas de las notas (FASE 4, US3/US5). Reciben el cliente escopado al
// tenant; la lectura es organizacional (toda nota del tenant es legible por
// cualquiera de sus miembros, clarificación 2026-07-03).

export const NOTES_PAGE_SIZE = 20;

/// Campos comunes de una nota en listados: autor y contexto para enlazar.
const NOTE_LIST_SELECT = {
  id: true,
  scope: true,
  title: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  author: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  task: { select: { id: true, title: true, process: { select: { projectId: true } } } },
  team: { select: { id: true, name: true } },
} satisfies Prisma.NoteSelect;

/// Listado central paginado (FR-021): búsqueda por título/contenido con
/// `contains` (insensible a mayúsculas y acentos vía la colación `*_ai_ci` de
/// MySQL), filtro por alcance y orden por última actualización.
export async function listNotes(db: ScopedPrismaClient, filters: NoteFilters) {
  const where: Prisma.NoteWhereInput = {};
  if (filters.q) {
    where.OR = [{ title: { contains: filters.q } }, { content: { contains: filters.q } }];
  }
  if (filters.scope) {
    where.scope = filters.scope;
  }
  const [total, notes] = await Promise.all([
    db.note.count({ where }),
    db.note.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (filters.page - 1) * NOTES_PAGE_SIZE,
      take: NOTES_PAGE_SIZE,
      select: NOTE_LIST_SELECT,
    }),
  ]);

  return { notes, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE)) };
}

/// Fila del listado (salida de `listNotes`).
export type NoteRow = Awaited<ReturnType<typeof listNotes>>["notes"][number];

/// Referencia de contexto: exactamente una de las tres (FR-022).
export type NoteContextRef = { projectId: string } | { taskId: string } | { teamId: string };

/// Notas de un contexto concreto, de la más reciente a la más antigua
/// (FR-022). Alimenta las secciones embebidas de proyecto/tarea/equipo.
export async function listNotesForContext(db: ScopedPrismaClient, ref: NoteContextRef) {
  return db.note.findMany({
    where: ref,
    orderBy: { updatedAt: "desc" },
    select: NOTE_LIST_SELECT,
  });
}

/// Las 4 notas más recientes del tenant para el widget del panel (FR-024).
export async function findRecentNotes(db: ScopedPrismaClient) {
  return db.note.findMany({
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: NOTE_LIST_SELECT,
  });
}

/// Nota reciente del widget (salida de `findRecentNotes`).
export type RecentNoteView = Awaited<ReturnType<typeof findRecentNotes>>[number];
