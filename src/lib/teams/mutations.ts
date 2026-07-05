import type { UserRole } from "@/generated/prisma/client";
import { canManageTeams } from "@/lib/authz-teams";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import { teamInputSchema, teamMembersSchema } from "./schemas";

// Mutaciones de los equipos de trabajo (FASE 4, US2). Reciben el cliente
// escopado al tenant y el actor de la sesión; validan la entrada (Zod) y
// aplican la matriz de permisos de `authz-teams` (la UI solo oculta acciones).

/// Actor de una mutación de equipos: usuario de la sesión con su tenant.
export interface TeamMutationActor {
  userId: string;
  role: UserRole;
  tenantId: string;
}

/// Verifica que todos los usuarios referenciados pertenezcan al tenant del
/// actor (FR-013). `User` no es un modelo escopado, así que el filtro por
/// `tenantId` es explícito; el mensaje no filtra qué ids existen fuera.
async function assertMembersInTenant(db: ScopedPrismaClient, tenantId: string, memberIds: string[]) {
  if (memberIds.length === 0) {
    return;
  }
  const found = await db.user.count({ where: { id: { in: memberIds }, tenantId } });
  if (found !== memberIds.length) {
    throw new NotFoundError("Alguno de los miembros seleccionados no existe en la organización.");
  }
}

export async function createTeam(db: ScopedPrismaClient, actor: TeamMutationActor, rawInput: unknown) {
  if (!canManageTeams(actor.role)) {
    throw new ForbiddenError("No tienes permisos para crear equipos.");
  }
  const input = teamInputSchema.parse(rawInput);
  await assertMembersInTenant(db, actor.tenantId, input.memberIds);
  return db.team.create({
    data: {
      tenantId: actor.tenantId,
      name: input.name,
      description: input.description,
      members: { connect: input.memberIds.map((id) => ({ id })) },
    },
  });
}

export async function updateTeam(db: ScopedPrismaClient, actor: TeamMutationActor, teamId: string, rawInput: unknown) {
  if (!canManageTeams(actor.role)) {
    throw new ForbiddenError("No tienes permisos para editar equipos.");
  }
  const team = await db.team.findFirst({ where: { id: teamId }, select: { id: true } });
  if (!team) {
    throw new NotFoundError("El equipo no existe.");
  }
  // La membresía se gestiona con `setTeamMembers`; aquí solo datos del equipo.
  const input = teamInputSchema.omit({ memberIds: true }).parse(rawInput);
  return db.team.update({
    where: { id: teamId },
    data: { name: input.name, description: input.description },
  });
}

/// Reemplaza la composición completa del equipo (`set`, FR-013) validando que
/// todos los usuarios pertenezcan al tenant.
export async function setTeamMembers(db: ScopedPrismaClient, actor: TeamMutationActor, rawInput: unknown) {
  if (!canManageTeams(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar la composición de equipos.");
  }
  const input = teamMembersSchema.parse(rawInput);
  const team = await db.team.findFirst({ where: { id: input.teamId }, select: { id: true } });
  if (!team) {
    throw new NotFoundError("El equipo no existe.");
  }
  await assertMembersInTenant(db, actor.tenantId, input.memberIds);
  return db.team.update({
    where: { id: input.teamId },
    data: { members: { set: input.memberIds.map((id) => ({ id })) } },
  });
}

/// Impacto de eliminar un equipo: cuántas notas se borrarán en cascada (texto
/// del diálogo de confirmación, FR-015). Solo lectura.
export async function getTeamDeletionImpact(db: ScopedPrismaClient, teamId: string) {
  const team = await db.team.findFirst({ where: { id: teamId }, select: { id: true } });
  if (!team) {
    throw new NotFoundError("El equipo no existe.");
  }
  const noteCount = await db.note.count({ where: { teamId } });
  return { noteCount };
}

export async function deleteTeam(db: ScopedPrismaClient, actor: TeamMutationActor, teamId: string) {
  if (!canManageTeams(actor.role)) {
    throw new ForbiddenError("No tienes permisos para eliminar equipos.");
  }
  const team = await db.team.findFirst({ where: { id: teamId }, select: { id: true } });
  if (!team) {
    throw new NotFoundError("El equipo no existe.");
  }
  // Las notas del equipo caen por cascada (FR-015); los usuarios solo se
  // desasocian (tabla de unión M:N).
  return db.team.delete({ where: { id: teamId } });
}
