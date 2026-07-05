import type { UserRole } from "@/generated/prisma/client";
import { canCreateNotes, canModifyNote } from "@/lib/authz-notes";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import { type NoteInput, noteInputSchema, noteUpdateSchema } from "./schemas";

// Mutaciones de las notas (FASE 4, US3). Reciben el cliente escopado al
// tenant y el actor de la sesión; validan la entrada (Zod) y aplican la
// matriz de permisos de `authz-notes` (la UI solo oculta acciones, SC-008).

/// Actor de una mutación de notas: usuario de la sesión con su tenant.
export interface NoteMutationActor {
  userId: string;
  role: UserRole;
  tenantId: string;
}

/// Re-verifica que la referencia del alcance exista dentro del tenant
/// (FR-017): el schema garantiza el XOR, pero la pertenencia solo puede
/// comprobarse contra la base. El mensaje no filtra referencias ajenas.
async function assertReferenceInTenant(db: ScopedPrismaClient, input: NoteInput): Promise<void> {
  if (input.scope === "PROJECT") {
    const project = await db.project.findFirst({ where: { id: input.projectId }, select: { id: true } });
    if (!project) {
      throw new NotFoundError("El proyecto de la nota no existe.");
    }
  } else if (input.scope === "TASK") {
    const task = await db.task.findFirst({ where: { id: input.taskId }, select: { id: true } });
    if (!task) {
      throw new NotFoundError("La tarea de la nota no existe.");
    }
  } else if (input.scope === "TEAM") {
    const team = await db.team.findFirst({ where: { id: input.teamId }, select: { id: true } });
    if (!team) {
      throw new NotFoundError("El equipo de la nota no existe.");
    }
  }
}

export async function createNote(db: ScopedPrismaClient, actor: NoteMutationActor, rawInput: unknown) {
  if (!canCreateNotes(actor.role)) {
    throw new ForbiddenError("No tienes permisos para crear notas.");
  }
  const input = noteInputSchema.parse(rawInput);
  await assertReferenceInTenant(db, input);
  return db.note.create({
    data: {
      tenantId: actor.tenantId,
      scope: input.scope,
      title: input.title,
      content: input.content,
      authorId: actor.userId,
      projectId: input.scope === "PROJECT" ? input.projectId : null,
      taskId: input.scope === "TASK" ? input.taskId : null,
      teamId: input.scope === "TEAM" ? input.teamId : null,
    },
  });
}

/// Carga la nota del tenant y verifica el permiso de modificación
/// (autor o ADMIN/MANAGER/MANGO, FR-019).
async function loadModifiableNote(db: ScopedPrismaClient, actor: NoteMutationActor, noteId: string) {
  const note = await db.note.findFirst({ where: { id: noteId }, select: { id: true, authorId: true } });
  if (!note) {
    throw new NotFoundError("La nota no existe.");
  }
  if (!canModifyNote(actor.role, actor.userId, note.authorId)) {
    throw new ForbiddenError("Solo el autor o un rol de gestión pueden modificar esta nota.");
  }
  return note;
}

/// Actualiza título y contenido; el alcance no se reasigna (contrato US3).
export async function updateNote(db: ScopedPrismaClient, actor: NoteMutationActor, rawInput: unknown) {
  const input = noteUpdateSchema.parse(rawInput);
  await loadModifiableNote(db, actor, input.noteId);
  return db.note.update({
    where: { id: input.noteId },
    data: { title: input.title, content: input.content },
  });
}

export async function deleteNote(db: ScopedPrismaClient, actor: NoteMutationActor, noteId: string) {
  await loadModifiableNote(db, actor, noteId);
  return db.note.delete({ where: { id: noteId } });
}
