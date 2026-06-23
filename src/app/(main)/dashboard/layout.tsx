import type { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { UserRole } from "@/generated/prisma/client";
import { getOrCreateNotificationPreferences } from "@/lib/notifications";
import { PLAN_NAMES } from "@/lib/plans/definitions";
import { SIDEBAR_COLLAPSIBLE_VALUES, SIDEBAR_VARIANT_VALUES } from "@/lib/preferences/layout";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";

import { SearchDialog } from "./_components/sidebar/search-dialog";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  // Contexto de la sesión: usuario real + plan vigente para la navegación.
  const ctx = await getTenantContext();
  const [variant, collapsible, sessionUser, subscription, notificationPreferences] = await Promise.all([
    getPreference("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    ctx ? prisma.user.findUnique({ where: { id: ctx.userId } }) : Promise.resolve(null),
    ctx?.tenantId
      ? prisma.subscription.findUnique({ where: { tenantId: ctx.tenantId }, include: { plan: true } })
      : Promise.resolve(null),
    ctx
      ? getOrCreateNotificationPreferences(ctx.userId)
      : Promise.resolve({
          emailAlerts: true,
          productUpdates: false,
          taskReminders: true,
        }),
  ]);

  // Navegación adaptada a rol y plan (FR-022/FR-023).
  const access = ctx ? { role: ctx.role, planCode: subscription?.plan.code ?? null } : null;
  const planLabel = access?.role === "MANGO" ? "Mango (global)" : access?.planCode ? PLAN_NAMES[access.planCode] : null;

  // Usuario real mostrado en los menús del sidebar y la cabecera.
  const currentUser = {
    id: sessionUser?.id ?? "current",
    name: sessionUser?.name ?? "Usuario",
    email: sessionUser?.email ?? "",
    avatar: sessionUser?.image ?? "",
    role: (ctx?.role ?? "ADMIN") as UserRole,
  };

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant={variant}
        collapsible={collapsible}
        access={access}
        planLabel={planLabel}
        user={currentUser}
        notificationPreferences={notificationPreferences}
      />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-hidden",
        )}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog />
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        {/* Pages can set data-content-padding="false" to render full-bleed app layouts. */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 has-data-[content-padding=false]:p-0 md:p-6 md:has-data-[content-padding=false]:p-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
