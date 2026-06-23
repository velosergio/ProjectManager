import bcrypt from "bcryptjs";

import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

import { createHash, randomBytes } from "node:crypto";

const TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 60);
const MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_MAX_ATTEMPTS ?? 3);
const WINDOW_MINUTES = Number(process.env.PASSWORD_RESET_WINDOW_MINUTES ?? 15);

/// Solo se guarda el hash del token; el valor en claro viaja únicamente en el
/// enlace enviado por correo.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/// Emite un token de reset para un usuario y devuelve el valor en claro.
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_MINUTES * 60_000);
  await prisma.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return token;
}

/// Solicita un restablecimiento. Comportamiento neutro: nunca revela si el email
/// existe (FR-018). Aplica un rate-limit por usuario en una ventana de tiempo.
export async function requestPasswordReset(email: string, origin: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return;
  }

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const recent = await prisma.passwordResetToken.count({ where: { userId: user.id, createdAt: { gte: since } } });
  if (recent >= MAX_ATTEMPTS) {
    return;
  }

  const token = await createPasswordResetToken(user.id);
  const link = `${origin}/auth/v1/reset?token=${token}`;
  await sendMail({
    to: email,
    subject: "Restablece tu contraseña",
    html: `<p>Has solicitado restablecer tu contraseña.</p><p><a href="${link}">Definir una nueva contraseña</a></p><p>Este enlace caduca en ${TTL_MINUTES} minutos. Si no fuiste tú, ignora este correo.</p>`,
  });
}

export type ResetResult = { ok: true } | { ok: false };

/// Confirma el restablecimiento con un token de un solo uso y vigente.
export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashedPassword } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true };
}
