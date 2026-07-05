import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

// El email no es editable en esta fase; solo datos básicos del perfil (FR-024).
export const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  // URL del avatar; vacío = sin avatar (se guarda como null). La subida a MinIO queda pendiente.
  image: z.url("Ingresa una URL de imagen válida.").or(z.literal("")).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/// Actualiza los campos permitidos del perfil del usuario indicado.
export async function updateUserProfile(userId: string, input: ProfileInput) {
  const parsed = profileSchema.parse(input);
  return prisma.user.update({
    where: { id: userId },
    data: { name: parsed.name, image: parsed.image ? parsed.image : null },
  });
}

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

/// Verifica la contraseña actual y guarda la nueva (hash bcrypt). Lanza `Error`
/// con mensaje en español si la cuenta no tiene contraseña o la actual no coincide.
export async function changeUserPassword(userId: string, input: PasswordChangeInput) {
  const parsed = passwordChangeSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) {
    throw new Error("Esta cuenta no tiene una contraseña configurada.");
  }

  const matches = await bcrypt.compare(parsed.currentPassword, user.password);
  if (!matches) {
    throw new Error("La contraseña actual no es correcta.");
  }

  const hashed = await bcrypt.hash(parsed.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}
