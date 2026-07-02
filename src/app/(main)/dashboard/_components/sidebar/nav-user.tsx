"use client";

import { useState } from "react";

import { EllipsisVertical, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { UserRole } from "@/generated/prisma/client";
import type { NotificationPreferenceView } from "@/lib/notifications";
import { getInitials } from "@/lib/utils";

import { SettingsDialog, type SettingsSection } from "./settings-dialog/settings-dialog";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANGO: "Mango (global)",
  MANAGER: "Gerente",
  MEMBER: "Miembro",
  VIEWER: "Lector",
};

type NavUserProps = {
  readonly user: { name: string; email: string; avatar: string; role: UserRole };
  readonly planLabel: string | null;
  readonly notificationPreferences: NotificationPreferenceView;
};

export function NavUser({ user, planLabel, notificationPreferences }: NavUserProps) {
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("account");

  const openSection = (next: SettingsSection) => {
    setSection(next);
    setOpen(true);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-muted-foreground text-xs">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openSection("appearance")}>
                <Settings />
                Configuración
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut({ callbackUrl: "/login" })}>
              <LogOut />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <SettingsDialog
        open={open}
        onOpenChange={setOpen}
        section={section}
        onSectionChange={setSection}
        user={{ name: user.name, email: user.email, image: user.avatar }}
        planLabel={planLabel}
        roleLabel={ROLE_LABELS[user.role]}
        notificationPreferences={notificationPreferences}
      />
    </SidebarMenu>
  );
}
