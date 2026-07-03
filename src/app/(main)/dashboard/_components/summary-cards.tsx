import { Clock3, FolderKanban, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPanelSummary } from "@/lib/projects/queries";
import { getTenantDb } from "@/lib/tenant-db-session";

/// Tarjetas de resumen del panel con cifras reales (FR-016): tareas de hoy y
/// progreso semanal (alcance personal) y proyectos en curso de la organización.
export async function SummaryCards({ userId }: { userId: string }) {
  const db = await getTenantDb();
  const summary = await getPanelSummary(db, userId);

  const cards = [
    {
      title: "Hoy",
      value: String(summary.tasksToday),
      description: summary.tasksToday === 1 ? "tarea programada" : "tareas programadas",
      icon: Clock3,
    },
    {
      title: "Esta semana",
      value: `${summary.weeklyProgressPct}%`,
      description: `${summary.weekDone} de ${summary.weekTotal} tareas finalizadas`,
      icon: TrendingUp,
    },
    {
      title: "Proyectos",
      value: String(summary.activeProjects),
      description: summary.activeProjects === 1 ? "proyecto en curso" : "proyectos en curso",
      icon: FolderKanban,
    },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((item) => (
        <Card key={item.title} className="shadow-xs">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="grid size-7 place-items-center rounded-lg border bg-muted">
                  <item.icon className="size-4" />
                </div>
                {item.title}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="text-2xl leading-none tracking-tight">{item.value}</div>
              <p className="text-muted-foreground tabular-nums leading-none">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
