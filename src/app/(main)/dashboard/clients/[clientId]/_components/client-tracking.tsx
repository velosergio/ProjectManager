import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectStatus } from "@/generated/prisma/client";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/lib/projects/labels";

interface ClientTrackingProps {
  statusCounts: Record<ProjectStatus, number>;
  lastActivityAt: Date;
}

/// Seguimiento del cliente (FR-007): proyectos por estado (labels en español,
/// único punto de verdad en `projects/labels.ts`) y última actividad.
export function ClientTracking({ statusCounts, lastActivityAt }: ClientTrackingProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Seguimiento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PROJECT_STATUS_ORDER.map((status) => (
            <div key={status} className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">{PROJECT_STATUS_LABELS[status]}</dt>
              <dd className="font-semibold text-2xl tabular-nums">{statusCounts[status]}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Última actividad</dt>
            <dd className="text-sm">{format(lastActivityAt, "d 'de' MMMM yyyy, HH:mm", { locale: es })}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
