"use server";

import { requireUser } from "@/lib/auth";
import { MissingTenantContextError } from "@/lib/errors";
import {
  getOrCreateNotificationPreferences,
  type NotificationPreferenceInput,
  type NotificationPreferenceView,
  updateNotificationPreferences as persistNotificationPreferences,
} from "@/lib/notifications";
import { getTenantContext } from "@/lib/tenant-context";

/// Lee (o crea con defaults) las preferencias de notificación del usuario.
export async function getNotificationPreferences(): Promise<NotificationPreferenceView> {
  await requireUser();
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new MissingTenantContextError("No hay sesión activa.");
  }
  return getOrCreateNotificationPreferences(ctx.userId);
}

/// Guarda las preferencias de notificación del usuario de la sesión.
export async function updateNotificationPreferences(
  input: NotificationPreferenceInput,
): Promise<NotificationPreferenceView> {
  await requireUser();
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new MissingTenantContextError("No hay sesión activa.");
  }
  return persistNotificationPreferences(ctx.userId, input);
}
