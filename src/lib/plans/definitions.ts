import type { PlanCode } from "@/generated/prisma/client";

// Features por plan (config tipada, parametrizable). Las cuotas numéricas NO
// viven aquí: están en la tabla `Plan` (nullable = ilimitado). Ver `gating.ts`.

/// Nombre visible de cada plan (la fuente de verdad de las cuotas y precios es
/// la tabla `Plan`; esto es solo etiqueta de UI).
export const PLAN_NAMES: Record<PlanCode, string> = {
  GRATUITO: "Gratuito",
  PRO: "Pro",
  PRO_PLUS: "Pro+",
};

export type PlanFeature = "kanban" | "gantt" | "calendar" | "executiveDashboard" | "audit";

export const PLAN_FEATURES: Record<PlanCode, Record<PlanFeature, boolean>> = {
  GRATUITO: { kanban: true, gantt: false, calendar: true, executiveDashboard: false, audit: false },
  PRO: { kanban: true, gantt: true, calendar: true, executiveDashboard: true, audit: false },
  PRO_PLUS: { kanban: true, gantt: true, calendar: true, executiveDashboard: true, audit: true },
};
