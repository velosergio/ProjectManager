import { createHash, randomBytes } from "node:crypto";

// Tokens de invitación (FASE 4, research D1). Espejo del patrón de
// `password-reset.ts`: solo se persiste el hash; el valor en claro viaja
// únicamente en el enlace. Funciones puras para poder probarlas sin BD.

export const INVITATION_TTL_DAYS = 7;

/// Hash SHA-256 del token; es lo único que se guarda en la base de datos.
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/// Token aleatorio en claro para el enlace de invitación.
export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/// Fecha de caducidad de una invitación emitida en `from` (7 días, FR-002).
export function invitationExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/// Vigencia de un token: un solo uso y caducidad estricta (FR-003/FR-005).
export function isInvitationTokenValid(
  record: { usedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  return record.usedAt === null && record.expiresAt.getTime() > now.getTime();
}
