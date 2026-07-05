"use server";

import { revalidatePath } from "next/cache";

import { ZodError } from "zod";

import { requireUser } from "@/lib/auth";
import { ForbiddenError, MissingTenantContextError, NotFoundError } from "@/lib/errors";
import type { TeamMutationActor } from "@/lib/teams/mutations";
import * as mutations from "@/lib/teams/mutations";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

// Server Actions de los equipos de trabajo (FASE 4, US2). Envoltorios finos:
// resuelven sesión y cliente escopado, delegan en `src/lib/teams/mutations` y
// traducen los errores de dominio a mensajes en español para Sonner.

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function resolveActor(): Promise<{ db: Awaited<ReturnType<typeof getTenantDb>>; actor: TeamMutationActor }> {
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

function revalidateTeams(teamId?: string) {
  revalidatePath("/dashboard/teams");
  if (teamId) {
    revalidatePath(`/dashboard/teams/${teamId}`);
  }
}

export async function createTeamAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const team = await mutations.createTeam(db, actor, input);
    revalidateTeams();
    return { ok: true, data: { id: team.id } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function updateTeamAction(teamId: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.updateTeam(db, actor, teamId, input);
    revalidateTeams(teamId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

/// Reemplaza la composición completa del equipo (FR-013).
export async function setTeamMembersAction(input: unknown): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    const team = await mutations.setTeamMembers(db, actor, input);
    revalidateTeams(team.id);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  await requireUser();
  try {
    const { db, actor } = await resolveActor();
    await mutations.deleteTeam(db, actor, teamId);
    revalidateTeams(teamId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

/// Solo lectura: cuántas notas se borrarán en cascada al eliminar el equipo
/// (texto del diálogo de confirmación, FR-015).
export async function getTeamDeletionImpactAction(teamId: string): Promise<ActionResult<{ noteCount: number }>> {
  await requireUser();
  try {
    const { db } = await resolveActor();
    const impact = await mutations.getTeamDeletionImpact(db, teamId);
    return { ok: true, data: impact };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
