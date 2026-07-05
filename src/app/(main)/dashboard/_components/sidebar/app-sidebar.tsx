"use client";

import Link from "next/link";

import { CircleHelp, ClipboardList, Command, Database, File, Search, Settings } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import type { UserRole } from "@/generated/prisma/client";
import type { AccessContext } from "@/lib/authz";
import type { NotificationPreferenceView } from "@/lib/notifications";
import { filterSidebarItems } from "@/navigation/sidebar/filter-sidebar-items";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

const _data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  access?: AccessContext | null;
  planLabel?: string | null;
  user: { name: string; email: string; avatar: string; role: UserRole; tenantId: string | null };
  notificationPreferences: NotificationPreferenceView;
};

export function AppSidebar({ access, planLabel, user, notificationPreferences, ...props }: AppSidebarProps) {
  // El filtrado por rol/plan se hace en el cliente para no serializar los
  // iconos (componentes) a través del límite servidor → cliente.
  const items = access ? filterSidebarItems(sidebarItems, access) : sidebarItems;

  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/dashboard">
                <Command />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {planLabel && (
            <SidebarMenuItem>
              <div className="px-2 group-data-[collapsible=icon]:hidden">
                <Badge variant="secondary" className="w-full justify-center">
                  Plan: {planLabel}
                </Badge>
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} planLabel={planLabel ?? null} notificationPreferences={notificationPreferences} />
      </SidebarFooter>
    </Sidebar>
  );
}
