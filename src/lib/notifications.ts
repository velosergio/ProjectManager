import { z } from "zod";

import type { NotificationPreference } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const notificationPreferenceSchema = z.object({
  emailAlerts: z.boolean(),
  productUpdates: z.boolean(),
  taskReminders: z.boolean(),
});

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;

/// Forma serializable que consume la UI (sin metadatos de fila).
export type NotificationPreferenceView = NotificationPreferenceInput;

function toView(pref: NotificationPreference): NotificationPreferenceView {
  return {
    emailAlerts: pref.emailAlerts,
    productUpdates: pref.productUpdates,
    taskReminders: pref.taskReminders,
  };
}

/// Devuelve las preferencias del usuario, creándolas con defaults si no existen.
export async function getOrCreateNotificationPreferences(userId: string): Promise<NotificationPreferenceView> {
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return toView(pref);
}

/// Persiste las preferencias del usuario (upsert idempotente).
export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferenceInput,
): Promise<NotificationPreferenceView> {
  const parsed = notificationPreferenceSchema.parse(input);
  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    update: parsed,
    create: { userId, ...parsed },
  });
  return toView(pref);
}
