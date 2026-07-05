"use server";

import { revalidatePath } from "next/cache";

import { ZodError } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/clients/mutations";
import { DuplicateNameError, ForbiddenError, MissingTenantContextError, NotFoundError } from "@/lib/errors";
import { mapGatingError } from "@/lib/plans/gating-response";
import type { MutationActor } from "@/lib/projects/mutations";
import * as mutations from "@/lib/projects/mutations";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

// Server Actions de la feature de proyectos (FASE 2). Envoltorios finos:
// resuelven sesión y cliente escopado, delegan en `src/lib/projects/mutations`
// y traducen los errores de dominio a mensajes en español para Sonner.

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function resolveActor(): Promise<{ db: Awaited<ReturnType<typeof getTenantDb>>; actor: MutationActor }> {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new MissingTenantContextError("No hay una organización activa en la sesión.");
  }
  const db = await getTenantDb();
  return { db, actor: { userId: ctx.userId, role: ctx.role, tenantId: ctx.tenantId } };
}

function mapError(error: unknown): string {
  const gating = mapGatingError(error);
  if (gating) {
    return gating.message;
  }
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Los datos enviados no son válidos.";
  }
  if (
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof DuplicateNameError ||
    error instanceof MissingTenantContextError
  ) {
    return error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

function revalidateProjects(projectId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
  }
}

// ── Proyectos ────────────────────────────────────────────────────────────────

export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const project = await mutations.createProject(db, actor, input);
    revalidateProjects();
    return { ok: true, data: { id: project.id } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function updateProject(projectId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.updateProject(db, actor, projectId, input);
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.deleteProject(db, actor, projectId);
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

// ── Tareas ───────────────────────────────────────────────────────────────────

export async function createTask(projectId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const task = await mutations.createTask(db, actor, projectId, input);
    revalidateProjects(projectId);
    return { ok: true, data: { id: task.id } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function updateTask(projectId: string, taskId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.updateTask(db, actor, taskId, input);
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function toggleTaskDone(taskId: string, done: boolean, projectId?: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.toggleTaskDone(db, actor, taskId, done);
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteTask(projectId: string, taskId: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.deleteTask(db, actor, taskId);
    revalidateProjects(projectId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

// ── Clientes ─────────────────────────────────────────────────────────────────

/// Alta mínima de un cliente desde el formulario de proyecto (US5, FR-016 de
/// FASE 3): delega en la lógica de la feature de clientes y devuelve lo justo
/// para seleccionarlo sin desmontar el formulario.
export async function createClientInline(input: unknown): Promise<ActionResult<{ id: string; name: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const client = await createClient(db, actor, input);
    revalidatePath("/dashboard/clients");
    revalidateProjects();
    return { ok: true, data: { id: client.id, name: client.name } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

// ── Etiquetas ────────────────────────────────────────────────────────────────

export async function createTag(input: unknown): Promise<ActionResult<{ id: string; name: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const tag = await mutations.createTag(db, actor, input);
    revalidateProjects();
    return { ok: true, data: { id: tag.id, name: tag.name } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function renameTag(tagId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.renameTag(db, actor, tagId, input);
    revalidateProjects();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteTag(tagId: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.deleteTag(db, actor, tagId);
    revalidateProjects();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

// ── Tipos de proceso ─────────────────────────────────────────────────────────

export async function createProcessType(input: unknown): Promise<ActionResult<{ id: string; name: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const type = await mutations.createProcessType(db, actor, input);
    revalidateProjects();
    return { ok: true, data: { id: type.id, name: type.name } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function renameProcessType(typeId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.renameProcessType(db, actor, typeId, input);
    revalidateProjects();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteProcessType(typeId: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.deleteProcessType(db, actor, typeId);
    revalidateProjects();
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
