import bcrypt from "bcryptjs";

import type { UserRole } from "@/generated/prisma/client";
import { canManageMembers } from "@/lib/authz-members";
import { DuplicateNameError, ForbiddenError, LastAdminError, NotFoundError } from "@/lib/errors";
import { sendMail } from "@/lib/mailer";
import { assertWithinQuota } from "@/lib/plans/gating";
import { prisma } from "@/lib/prisma";

import { acceptInvitationSchema, changeRoleSchema, inviteMemberSchema } from "./schemas";
import { generateInvitationToken, hashInvitationToken, invitationExpiry, isInvitationTokenValid } from "./tokens";

// Mutaciones de la gestión de miembros (FASE 4). Son la fuente de verdad de
// los permisos (la UI solo oculta acciones): solo ADMIN (y MANGO) gestiona.
// `User` no es un modelo escopado: la pertenencia al tenant se verifica
// explícitamente en cada operación.

/// Actor de una mutación de miembros: usuario de la sesión con su tenant.
export interface MemberActor {
  userId: string;
  role: UserRole;
  tenantId: string;
}

function assertCanManage(actor: MemberActor): void {
  if (!canManageMembers(actor.role)) {
    throw new ForbiddenError("No tienes permisos para gestionar miembros.");
  }
}

/// Miembro del tenant del actor; para el solicitante, un miembro de otra
/// organización es indistinguible de uno inexistente.
async function findTenantMember(userId: string, tenantId: string) {
  const member = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!member) {
    throw new NotFoundError("El miembro no existe.");
  }
  return member;
}

function buildInviteUrl(origin: string, token: string): string {
  return `${origin}/invite?token=${token}`;
}

async function sendInvitationMail(email: string, inviteUrl: string, tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const organization = tenant?.name ?? "una organización";
  await sendMail({
    to: email,
    subject: `Te han invitado a ${organization}`,
    html: `<p>Has sido invitado a unirte a <strong>${organization}</strong> en Project Manager.</p><p><a href="${inviteUrl}">Activar mi cuenta</a></p><p>Este enlace caduca en 7 días y es de un solo uso. Si no esperabas esta invitación, ignora este correo.</p>`,
  });
}

/// ¿Error de unicidad de Prisma (email duplicado en la carrera)?
function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export interface InviteResult {
  memberId: string;
  inviteUrl: string;
}

/// Invita a un nuevo miembro: crea el `User` en estado INVITED y su token de
/// activación dentro de una transacción serializable que respeta la cuota de
/// usuarios (activos + invitados, FR-009). Devuelve SIEMPRE la URL de
/// invitación para poder compartirla manualmente (research D8).
export async function inviteMember(actor: MemberActor, rawInput: unknown, origin: string): Promise<InviteResult> {
  assertCanManage(actor);
  const input = inviteMemberSchema.parse(rawInput);

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    // Sin revelar a qué organización pertenece (edge «email ya registrado»).
    throw new DuplicateNameError("Ese correo electrónico no está disponible.");
  }

  const token = generateInvitationToken();
  let memberId: string;
  try {
    memberId = await prisma.$transaction(
      async (tx) => {
        await assertWithinQuota(tx, actor.tenantId, "users");
        const created = await tx.user.create({
          data: {
            // Nombre provisional: el invitado define el suyo al activar (FR-003).
            name: input.email.split("@")[0] ?? input.email,
            email: input.email,
            role: input.role,
            status: "INVITED",
            tenantId: actor.tenantId,
            password: null,
          },
        });
        await tx.invitationToken.create({
          data: { userId: created.id, tokenHash: hashInvitationToken(token), expiresAt: invitationExpiry() },
        });
        return created.id;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new DuplicateNameError("Ese correo electrónico no está disponible.");
    }
    throw error;
  }

  const inviteUrl = buildInviteUrl(origin, token);
  await sendInvitationMail(input.email, inviteUrl, actor.tenantId);
  return { memberId, inviteUrl };
}

/// Reenvía una invitación pendiente: invalida el enlace anterior y emite uno
/// nuevo con caducidad renovada (FR-005).
export async function resendInvitation(
  actor: MemberActor,
  memberId: string,
  origin: string,
): Promise<{ inviteUrl: string }> {
  assertCanManage(actor);
  const member = await findTenantMember(memberId, actor.tenantId);
  if (member.status !== "INVITED") {
    throw new ForbiddenError("Solo se pueden reenviar invitaciones pendientes.");
  }

  const token = generateInvitationToken();
  await prisma.$transaction([
    prisma.invitationToken.updateMany({ where: { userId: member.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.invitationToken.create({
      data: { userId: member.id, tokenHash: hashInvitationToken(token), expiresAt: invitationExpiry() },
    }),
  ]);

  const inviteUrl = buildInviteUrl(origin, token);
  await sendInvitationMail(member.email, inviteUrl, actor.tenantId);
  return { inviteUrl };
}

/// Cancela una invitación pendiente: elimina al miembro invitado (sus tokens
/// caen en cascada) y libera el cupo del plan (FR-005).
export async function cancelInvitation(actor: MemberActor, memberId: string): Promise<void> {
  assertCanManage(actor);
  const member = await findTenantMember(memberId, actor.tenantId);
  if (member.status !== "INVITED") {
    throw new ForbiddenError("Solo se pueden cancelar invitaciones pendientes.");
  }
  await prisma.user.delete({ where: { id: member.id } });
}

export type AcceptInvitationResult = { ok: true } | { ok: false };

/// Activa la cuenta de un miembro invitado con un token vigente de un solo
/// uso: fija nombre y contraseña y pasa el estado a ACTIVE (FR-003).
export async function acceptInvitation(rawInput: unknown): Promise<AcceptInvitationResult> {
  const input = acceptInvitationSchema.parse(rawInput);

  const record = await prisma.invitationToken.findUnique({
    where: { tokenHash: hashInvitationToken(input.token) },
    include: { user: { select: { id: true, status: true } } },
  });
  if (!record || !isInvitationTokenValid(record) || record.user.status !== "INVITED") {
    return { ok: false };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user.id },
      data: { name: input.name, password: hashedPassword, status: "ACTIVE" },
    }),
    prisma.invitationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true };
}

/// Cuenta los administradores activos del tenant excluyendo a `exceptUserId`.
async function countOtherActiveAdmins(
  tx: Pick<typeof prisma, "user">,
  tenantId: string,
  exceptUserId: string,
): Promise<number> {
  return tx.user.count({
    where: { tenantId, role: "ADMIN", status: "ACTIVE", id: { not: exceptUserId } },
  });
}

/// Cambia el rol de un miembro. Nunca el propio (FR-006) y nunca dejando a la
/// organización sin administradores activos (FR-008); el guard corre en una
/// transacción serializable para resistir degradaciones concurrentes.
export async function changeMemberRole(actor: MemberActor, rawInput: unknown): Promise<void> {
  assertCanManage(actor);
  const input = changeRoleSchema.parse(rawInput);
  if (input.userId === actor.userId) {
    throw new ForbiddenError("No puedes cambiar tu propio rol.");
  }

  await prisma.$transaction(
    async (tx) => {
      const member = await tx.user.findFirst({ where: { id: input.userId, tenantId: actor.tenantId } });
      if (!member) {
        throw new NotFoundError("El miembro no existe.");
      }
      if (member.role === "ADMIN" && member.status === "ACTIVE" && input.role !== "ADMIN") {
        const others = await countOtherActiveAdmins(tx, actor.tenantId, member.id);
        if (others === 0) {
          throw new LastAdminError();
        }
      }
      await tx.user.update({ where: { id: member.id }, data: { role: input.role } });
    },
    { isolationLevel: "Serializable" },
  );
}

/// Desactiva a un miembro activo: pierde el acceso en su siguiente interacción
/// (FR-007) y su trabajo asignado permanece intacto (FR-010).
export async function deactivateMember(actor: MemberActor, memberId: string): Promise<void> {
  assertCanManage(actor);

  await prisma.$transaction(
    async (tx) => {
      const member = await tx.user.findFirst({ where: { id: memberId, tenantId: actor.tenantId } });
      if (!member) {
        throw new NotFoundError("El miembro no existe.");
      }
      if (member.status !== "ACTIVE") {
        throw new ForbiddenError("Solo se pueden desactivar miembros activos.");
      }
      if (member.role === "ADMIN") {
        const others = await countOtherActiveAdmins(tx, actor.tenantId, member.id);
        if (others === 0) {
          throw new LastAdminError();
        }
      }
      await tx.user.update({ where: { id: member.id }, data: { status: "INACTIVE" } });
    },
    { isolationLevel: "Serializable" },
  );
}

/// Reactiva a un miembro inactivo; vuelve a consumir cupo, así que la cuota se
/// re-verifica en la misma transacción (FR-009).
export async function reactivateMember(actor: MemberActor, memberId: string): Promise<void> {
  assertCanManage(actor);

  await prisma.$transaction(
    async (tx) => {
      const member = await tx.user.findFirst({ where: { id: memberId, tenantId: actor.tenantId } });
      if (!member) {
        throw new NotFoundError("El miembro no existe.");
      }
      if (member.status !== "INACTIVE") {
        throw new ForbiddenError("Solo se pueden reactivar miembros inactivos.");
      }
      await assertWithinQuota(tx, actor.tenantId, "users");
      await tx.user.update({ where: { id: member.id }, data: { status: "ACTIVE" } });
    },
    { isolationLevel: "Serializable" },
  );
}
