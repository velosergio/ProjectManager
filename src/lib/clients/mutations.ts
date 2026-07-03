import type { UserRole } from "@/generated/prisma/client";
import { canManageClients } from "@/lib/authz-clients";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import { clientInputSchema } from "./schemas";

// Mutaciones de la feature de clientes (FASE 3). Reciben el cliente escopado
// al tenant y el actor de la sesión; validan la entrada (Zod) y aplican la
// matriz de permisos (clarificación 2026-07-03). Son la fuente de verdad: la
// UI solo oculta acciones.

/// Actor de una mutación de clientes: usuario de la sesión con su tenant.
export interface ClientMutationActor {
  userId: string;
  role: UserRole;
  tenantId: string;
}

/// Verifica que todas las etiquetas referenciadas pertenezcan al tenant
/// (catálogo único compartido con proyectos, FR-011).
async function assertTagsInTenant(db: ScopedPrismaClient, tagIds: string[]) {
  if (tagIds.length === 0) {
    return;
  }
  const found = await db.tag.count({ where: { id: { in: tagIds } } });
  if (found !== tagIds.length) {
    throw new NotFoundError("Alguna de las etiquetas seleccionadas no existe.");
  }
}

export async function createClient(db: ScopedPrismaClient, actor: ClientMutationActor, rawInput: unknown) {
  if (!canManageClients(actor.role)) {
    throw new ForbiddenError("No tienes permisos para crear clientes.");
  }
  const input = clientInputSchema.parse(rawInput);
  await assertTagsInTenant(db, input.tagIds);
  return db.client.create({
    data: {
      tenantId: actor.tenantId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      tags: { connect: input.tagIds.map((id) => ({ id })) },
    },
  });
}

export async function updateClient(
  db: ScopedPrismaClient,
  actor: ClientMutationActor,
  clientId: string,
  rawInput: unknown,
) {
  if (!canManageClients(actor.role)) {
    throw new ForbiddenError("No tienes permisos para editar clientes.");
  }
  const client = await db.client.findFirst({ where: { id: clientId }, select: { id: true } });
  if (!client) {
    throw new NotFoundError("El cliente no existe.");
  }
  const input = clientInputSchema.parse(rawInput);
  await assertTagsInTenant(db, input.tagIds);
  return db.client.update({
    where: { id: clientId },
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      tags: { set: input.tagIds.map((id) => ({ id })) },
    },
  });
}

/// Impacto de eliminar un cliente: cuántos proyectos quedarán «sin cliente»
/// (para el texto del diálogo de confirmación, FR-005). Solo lectura.
export async function getDeletionImpact(db: ScopedPrismaClient, clientId: string) {
  const client = await db.client.findFirst({ where: { id: clientId }, select: { id: true } });
  if (!client) {
    throw new NotFoundError("El cliente no existe.");
  }
  const projectCount = await db.project.count({ where: { clientId } });
  return { projectCount };
}

export async function deleteClient(db: ScopedPrismaClient, actor: ClientMutationActor, clientId: string) {
  if (!canManageClients(actor.role)) {
    throw new ForbiddenError("No tienes permisos para eliminar clientes.");
  }
  const client = await db.client.findFirst({ where: { id: clientId }, select: { id: true } });
  if (!client) {
    throw new NotFoundError("El cliente no existe.");
  }
  // `SetNull` en la FK de proyectos: quedan desvinculados, nunca se borran
  // (FR-005). Las etiquetas solo se desasocian (tabla de unión).
  return db.client.delete({ where: { id: clientId } });
}
