"use server";

import { revalidatePath } from "next/cache";

import { ZodError, z } from "zod";

import { requireUser } from "@/lib/auth";
import { ForbiddenError, MissingTenantContextError, NotFoundError } from "@/lib/errors";
import type { NoteMutationActor } from "@/lib/notes/mutations";
import * as mutations from "@/lib/notes/mutations";
import { listNotes, listNotesForContext, type NoteRow } from "@/lib/notes/queries";
import { noteFiltersSchema } from "@/lib/notes/schemas";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { toNoteListItem } from "./_components/mappers";
import type { NoteListItem } from "./_components/types";

// Server Actions de las notas (FASE 4, US3). Envoltorios finos: resuelven
// sesión y cliente escopado, delegan en `src/lib/notes/mutations` y traducen
// los errores de dominio a mensajes en español para Sonner.

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function resolveActor(): Promise<{ db: Awaited<ReturnType<typeof getTenantDb>>; actor: NoteMutationActor }> {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new MissingTenantContextError("No hay una organización activa en la sesión.");
  }
  const db = await getTenantDb();
  return { db, actor: { userId: ctx.userId, role: ctx.role, tenantId: ctx.tenantId } };
}

function mapError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Los datos enviados no son válidos.";
  }
  if (error instanceof ForbiddenError || error instanceof NotFoundError || error instanceof MissingTenantContextError) {
    return error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/// Refresca las vistas RSC afectadas por una nota: listado central, panel
/// (widget de recientes) y el detalle del contexto si lo hay.
function revalidateNote(note?: { projectId: string | null; taskId: string | null; teamId: string | null }) {
  revalidatePath("/dashboard/notes");
  revalidatePath("/dashboard");
  if (note?.projectId) {
    revalidatePath(`/dashboard/projects/${note.projectId}`);
  }
  if (note?.teamId) {
    revalidatePath(`/dashboard/teams/${note.teamId}`);
  }
}

export async function createNoteAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const note = await mutations.createNote(db, actor, input);
    revalidateNote(note);
    return { ok: true, data: { id: note.id } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function updateNoteAction(input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const note = await mutations.updateNote(db, actor, input);
    revalidateNote(note);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const note = await mutations.deleteNote(db, actor, noteId);
    revalidateNote(note);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

/// Notas de una tarea para el Sheet lateral (FR-022): lectura serializada con
/// autor, contexto y permiso de modificación del espectador ya resueltos.
export async function listTaskNotesAction(rawTaskId: unknown): Promise<ActionResult<NoteListItem[]>> {
  await requireUser();
  try {
    const taskId = z.string().min(1).parse(rawTaskId);
    const ctx = await getTenantContext();
    if (!ctx?.tenantId) {
      throw new MissingTenantContextError("No hay una organización activa en la sesión.");
    }
    const db = await getTenantDb();
    const notes = await listNotesForContext(db, { taskId });
    return { ok: true, data: notes.map((note) => toNoteListItem(note, { userId: ctx.userId, role: ctx.role })) };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

/// Solo lectura: cuántas notas caerán en cascada al eliminar un proyecto
/// (las suyas y las de sus tareas; texto del diálogo de confirmación, FR-023).
export async function getProjectNotesImpactAction(rawProjectId: unknown): Promise<ActionResult<{ noteCount: number }>> {
  await requireUser();
  try {
    const projectId = z.string().min(1).parse(rawProjectId);
    const { db } = await resolveActor();
    const noteCount = await db.note.count({
      where: { OR: [{ projectId }, { task: { process: { projectId } } }] },
    });
    return { ok: true, data: { noteCount } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

/// Búsqueda paginada para islas cliente (misma consulta que el listado RSC,
/// FR-021).
export async function searchNotesAction(
  rawFilters: unknown,
): Promise<ActionResult<{ notes: NoteRow[]; total: number; page: number; pageCount: number }>> {
  await requireUser();
  try {
    const { db } = await resolveActor();
    const filters = noteFiltersSchema.parse(rawFilters ?? {});
    const result = await listNotes(db, filters);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
