import {
  Banknote,
  Calendar,
  ChartBar,
  Gauge,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { UserRole } from "@/generated/prisma/client";
import type { PlanFeature } from "@/lib/plans/definitions";

export type NavBadge = "new" | "soon";

/// Restricciones de acceso de un item: por rol global y/o por feature del plan.
/// Sin restricciones, el item es visible para cualquier sesión.
export interface NavAccess {
  requiredRole?: UserRole;
  requiredFeature?: PlanFeature;
}

export interface NavSubItem extends NavAccess {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase extends NavAccess {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 0,
    label: "Plataforma",
    items: [
      {
        id: "mango-console",
        title: "Consola mango",
        url: "/dashboard/mango",
        icon: ShieldCheck,
        requiredRole: "MANGO",
      },
    ],
  },
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        id: "panel",
        title: "Panel",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "crm",
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
      },
      {
        id: "finance",
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
      {
        id: "analytics",
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: Gauge,
        // Tablero ejecutivo: solo en planes que incluyen la feature.
        requiredFeature: "executiveDashboard",
      },
      {
        id: "academy",
        title: "Academy",
        url: "/dashboard/academy",
        icon: GraduationCap,
      },
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      {
        id: "calendar",
        title: "Calendar",
        url: "/dashboard/calendar",
        icon: Calendar,
      },
      {
        id: "kanban",
        title: "Kanban",
        url: "/dashboard/kanban",
        icon: Kanban,
      },
      {
        id: "invoice",
        title: "Invoice",
        url: "/dashboard/invoice",
        icon: ReceiptText,
      },
      {
        id: "users",
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "roles",
        title: "Roles",
        url: "/dashboard/roles",
        icon: Lock,
      },
    ],
  },
];
