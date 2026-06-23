import { z } from "zod";

import { prisma } from "@/lib/prisma";

// El email no es editable en esta fase; solo datos básicos del perfil (FR-024).
export const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/// Actualiza los campos permitidos del perfil del usuario indicado.
export async function updateUserProfile(userId: string, input: ProfileInput) {
  const parsed = profileSchema.parse(input);
  return prisma.user.update({ where: { id: userId }, data: { name: parsed.name } });
}
