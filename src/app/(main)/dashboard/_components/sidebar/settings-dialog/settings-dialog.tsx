"use client";

import { Bell, CreditCard, Palette, UserRound, Users } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserRole } from "@/generated/prisma/client";
import { canManageMembers } from "@/lib/authz-members";
import type { NotificationPreferenceView } from "@/lib/notifications";

import { AccountSettings } from "./account-settings";
import { AppearanceSettings } from "./appearance-settings";
import { MembersSettings } from "./members-settings";
import { NotificationsSettings } from "./notifications-settings";
import { PlanSettings } from "./plan-settings";

/// Secciones disponibles en el modal de Configuración.
export type SettingsSection = "appearance" | "account" | "notifications" | "plan" | "members";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  user: { name: string; email: string; image: string };
  planLabel: string | null;
  roleLabel: string;
  /// Rol y tenant reales de la sesión: gatean la pestaña «Miembros» (FASE 4).
  role: UserRole;
  tenantId: string | null;
  notificationPreferences: NotificationPreferenceView;
}

/// Modal de Configuración unificado con pestañas verticales.
/// Shell controlado: el padre gestiona `open`, `section` y sus callbacks.
export function SettingsDialog({
  open,
  onOpenChange,
  section,
  onSectionChange,
  user,
  planLabel,
  roleLabel,
  role,
  tenantId,
  notificationPreferences,
}: SettingsDialogProps) {
  const showMembers = canManageMembers(role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Configuración</DialogTitle>
          <DialogDescription>Gestiona tu apariencia, cuenta, notificaciones y plan.</DialogDescription>
        </DialogHeader>

        <Tabs
          orientation="vertical"
          value={section}
          onValueChange={onSectionChange as (value: string) => void}
          className="min-h-[440px]"
        >
          {/* Columna de pestañas */}
          <TabsList
            variant="line"
            className="h-full w-48 shrink-0 flex-col justify-start gap-1 rounded-none border-r bg-muted/40 px-2 py-4"
          >
            <TabsTrigger value="appearance" className="w-full justify-start gap-2 px-2">
              <Palette className="size-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger value="account" className="w-full justify-start gap-2 px-2">
              <UserRound className="size-4" />
              Cuenta
            </TabsTrigger>
            <TabsTrigger value="notifications" className="w-full justify-start gap-2 px-2">
              <Bell className="size-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="plan" className="w-full justify-start gap-2 px-2">
              <CreditCard className="size-4" />
              Plan
            </TabsTrigger>
            {showMembers && (
              <TabsTrigger value="members" className="w-full justify-start gap-2 px-2">
                <Users className="size-4" />
                Miembros
              </TabsTrigger>
            )}
          </TabsList>

          {/* Columna de contenido */}
          <div className="min-w-0 flex-1">
            <ScrollArea className="h-[440px]">
              <div className="p-6">
                <TabsContent value="appearance">
                  <AppearanceSettings />
                </TabsContent>

                <TabsContent value="account">
                  <AccountSettings user={user} />
                </TabsContent>

                <TabsContent value="notifications">
                  <NotificationsSettings initial={notificationPreferences} />
                </TabsContent>

                <TabsContent value="plan">
                  <PlanSettings planLabel={planLabel} roleLabel={roleLabel} />
                </TabsContent>

                {showMembers && (
                  <TabsContent value="members">
                    <MembersSettings role={role} tenantId={tenantId} />
                  </TabsContent>
                )}
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
