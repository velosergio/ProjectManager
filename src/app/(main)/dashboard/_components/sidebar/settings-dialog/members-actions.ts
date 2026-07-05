"use server";

import { headers } from "next/headers";

import { ZodError } from "zod";

import { requireUser } from "@/lib/auth";
import {
  DuplicateNameError,
  ForbiddenError,
  LastAdminError,
  MissingTenantContextError,
  NotFoundError,
  QuotaExceededError,
} from "@/lib/errors";
import type { MemberActor } from "@/lib/members/mutations";
import * as mutations from "@/lib/members/mutations";
import { listMembers, type MemberView } from "@/lib/members/queries";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

// Server Actions de la gestión de miembros (FASE 4, US1). Envoltorios finos
// sobre `src/lib/members/*`; los consume la pestaña «Miembros» del modal de
// ajustes vía TanStack Query (invalidación de keys tras cada mutación).

export type MembersActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/// Actor de la sesión con revocación aplicada: las mutaciones de miembros no
/// pasan por `getTenantDb()` (User no es modelo escopado), así que la guarda
/// de estado se aplica aquí (FR-007).
async function resolveActor(): Promise<MemberActor> {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    throw new MissingTenantContextError("No hay una organización activa en la sesión.");
  }
  const self = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { status: true } });
  if (self?.status !== "ACTIVE") {
    throw new ForbiddenError("Tu acceso ha sido revocado. Inicia sesión de nuevo.");
  }
  return { userId: ctx.userId, role: ctx.role, tenantId: ctx.tenantId };
}

/// Origen absoluto para construir el enlace de invitación.
async function resolveOrigin(): Promise<string> {
  const configured = process.env.NEXTAUTH_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function mapError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Los datos enviados no son válidos.";
  }
  if (error instanceof QuotaExceededError) {
    return `Tu plan permite hasta ${error.limit} usuarios (activos e invitados). Amplía tu plan para invitar a más personas.`;
  }
  if (
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof DuplicateNameError ||
    error instanceof LastAdminError ||
    error instanceof MissingTenantContextError
  ) {
    return error.message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/// Listado de miembros del tenant (lectura permitida a todos los roles).
export async function listMembersAction(): Promise<MembersActionResult<{ members: MemberView[]; selfId: string }>> {
  await requireUser();
  try {
    const actor = await resolveActor();
    const members = await listMembers(actor.tenantId);
    return { ok: true, data: { members, selfId: actor.userId } };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function inviteMemberAction(
  input: unknown,
): Promise<MembersActionResult<{ memberId: string; inviteUrl: string }>> {
  await requireUser();
  try {
    const actor = await resolveActor();
    const origin = await resolveOrigin();
    const result = await mutations.inviteMember(actor, input, origin);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function resendInvitationAction(memberId: string): Promise<MembersActionResult<{ inviteUrl: string }>> {
  await requireUser();
  try {
    const actor = await resolveActor();
    const origin = await resolveOrigin();
    const result = await mutations.resendInvitation(actor, memberId, origin);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function cancelInvitationAction(memberId: string): Promise<MembersActionResult> {
  await requireUser();
  try {
    const actor = await resolveActor();
    await mutations.cancelInvitation(actor, memberId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function changeMemberRoleAction(input: unknown): Promise<MembersActionResult> {
  await requireUser();
  try {
    const actor = await resolveActor();
    await mutations.changeMemberRole(actor, input);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function deactivateMemberAction(memberId: string): Promise<MembersActionResult> {
  await requireUser();
  try {
    const actor = await resolveActor();
    await mutations.deactivateMember(actor, memberId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export async function reactivateMemberAction(memberId: string): Promise<MembersActionResult> {
  await requireUser();
  try {
    const actor = await resolveActor();
    await mutations.reactivateMember(actor, memberId);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}
