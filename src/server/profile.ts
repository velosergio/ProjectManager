"use server";

import { requireUser } from "@/lib/auth";
import { MissingTenantContextError } from "@/lib/errors";
import { changeUserPassword, type PasswordChangeInput, type ProfileInput, updateUserProfile } from "@/lib/profile";
import { getTenantContext } from "@/lib/tenant-context";

/// Guarda el perfil del usuario de la sesión (escopado a su propio id).
export async function updateProfile(input: ProfileInput) {
  await requireUser();
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new MissingTenantContextError("No hay sesión activa.");
  }
  await updateUserProfile(ctx.userId, input);
}

/// Cambia la contraseña del usuario de la sesión (verifica la actual).
export async function changePassword(input: PasswordChangeInput) {
  await requireUser();
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new MissingTenantContextError("No hay sesión activa.");
  }
  await changeUserPassword(ctx.userId, input);
}
