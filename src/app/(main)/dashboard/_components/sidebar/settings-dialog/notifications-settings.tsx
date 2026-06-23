"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferenceView } from "@/lib/notifications";
import { updateNotificationPreferences } from "@/server/notifications";

const TOGGLES: ReadonlyArray<{
  key: keyof NotificationPreferenceView;
  label: string;
  description: string;
}> = [
  {
    key: "emailAlerts",
    label: "Avisos por correo",
    description: "Recibe correos sobre la actividad de tu cuenta y proyectos.",
  },
  {
    key: "productUpdates",
    label: "Novedades de producto",
    description: "Anuncios y nuevas funciones del producto.",
  },
  {
    key: "taskReminders",
    label: "Recordatorios de tareas",
    description: "Avisos de tareas próximas a vencer.",
  },
];

/// Pestaña «Notificaciones» del modal de Configuración: tres interruptores de
/// guardado automático con reversión optimista ante un fallo de persistencia.
export function NotificationsSettings({ initial }: { readonly initial: NotificationPreferenceView }) {
  const [prefs, setPrefs] = useState(initial);
  const [pendingKey, setPendingKey] = useState<keyof NotificationPreferenceView | null>(null);

  const onToggle = async (key: keyof NotificationPreferenceView, value: boolean) => {
    const previous = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setPendingKey(key);
    try {
      const saved = await updateNotificationPreferences(next);
      setPrefs(saved);
    } catch {
      setPrefs(previous);
      toast.error("No se pudo guardar la preferencia. Inténtalo de nuevo.");
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="flex flex-col">
      {TOGGLES.map((toggle, index) => (
        <div key={toggle.key}>
          {index > 0 && <Separator className="my-3" />}
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-0.5">
              <Label htmlFor={`notif-${toggle.key}`} className="font-medium text-sm">
                {toggle.label}
              </Label>
              <p className="text-muted-foreground text-xs">{toggle.description}</p>
            </div>
            <Switch
              id={`notif-${toggle.key}`}
              checked={prefs[toggle.key]}
              disabled={pendingKey === toggle.key}
              onCheckedChange={(value) => void onToggle(toggle.key, value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
