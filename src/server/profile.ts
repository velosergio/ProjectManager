"use server";

import { MissingTenantContextError } from "@/lib/errors";
import { type ProfileInput, updateUserProfile } from "@/lib/profile";
import { getTenantContext } from "@/lib/tenant-context";

/// Guarda el perfil del usuario de la sesión (escopado a su propio id).
export async function updateProfile(input: ProfileInput) {
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new MissingTenantContextError("No hay sesión activa.");
  }
  await updateUserProfile(ctx.userId, input);
}
