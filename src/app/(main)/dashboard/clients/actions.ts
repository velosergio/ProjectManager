"use server";

import { revalidatePath } from "next/cache";

import { ZodError } from "zod";

import type { ClientMutationActor } from "@/lib/clients/mutations";
import * as mutations from "@/lib/clients/mutations";
import { DuplicateNameError, ForbiddenError, MissingTenantContextError, NotFoundError } from "@/lib/errors";
import { createTag } from "@/lib/projects/mutations";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

// Server Actions de la feature de clientes (FASE 3). Envoltorios finos:
// resuelven sesión y cliente escopado, delegan en `src/lib/clients/mutations`
// y traducen los errores de dominio a mensajes en español para Sonner.

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function resolveActor(): Promise<{ db: Awaited<ReturnType<typeof getTenantDb>>; actor: ClientMutationActor }> {
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

function revalidateClients(clientId?: string) {
  revalidatePath("/dashboard/clients");
  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
}

// ── Clientes ─────────────────────────────────────────────────────────────────

export async function createClient(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { db, actor } = await resolveActor();
    const client = await mutations.createClient(db, actor, input);
    revalidateClients();
    return { ok: true, data: { id: client.id } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function updateClient(clientId: string, input: unknown): Promise<ActionResult> {
  try {
    const { db, actor } = await resolveActor();
    await mutations.updateClient(db, actor, clientId, input);
    revalidateClients(clientId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  try {
    const { db, actor } = await resolveActor();
    await mutations.deleteClient(db, actor, clientId);
    revalidateClients(clientId);
    // El detalle eliminado ya no existe; el listado y los proyectos que lo
    // referenciaban se refrescan al navegar (la FK quedó en null).
    revalidatePath("/dashboard/projects");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

/// Solo lectura: cuántos proyectos quedarán sin cliente al eliminarlo
/// (texto del diálogo de confirmación, FR-005).
export async function getClientDeletionImpact(clientId: string): Promise<ActionResult<{ projectCount: number }>> {
  try {
    const { db } = await resolveActor();
    const impact = await mutations.getDeletionImpact(db, clientId);
    return { ok: true, data: impact };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

// ── Etiquetas (catálogo único del tenant, FR-011) ────────────────────────────

/// Crea una etiqueta desde el asignador del formulario de cliente. Reutiliza
/// la mutación del catálogo de la FASE 2 (mismo modelo `Tag`).
export async function createTagForClient(input: unknown): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const { db, actor } = await resolveActor();
    const tag = await createTag(db, actor, input);
    revalidateClients();
    return { ok: true, data: { id: tag.id, name: tag.name } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
