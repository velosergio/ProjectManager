import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/lib/projects/labels";
import { getPanelProjects } from "@/lib/projects/queries";
import { projectStatusSchema } from "@/lib/projects/schemas";
import { getTenantDb } from "@/lib/tenant-db-session";

import { PanelFilterSelect } from "./panel-filter-select";

const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  ...PROJECT_STATUS_ORDER.map((status) => ({ value: status, label: PROJECT_STATUS_LABELS[status] })),
];

/// Sección «Proyectos» del panel: todos los proyectos reales de la
/// organización con estado, avance y cierre (FR-014).
export async function ProjectsSection({ statusParam }: { statusParam?: string }) {
  const parsed = projectStatusSchema.safeParse(statusParam);
  const status = parsed.success ? parsed.data : undefined;
  const db = await getTenantDb();
  const projects = await getPanelProjects(db, status);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">Proyectos</h2>
        <div className="flex items-center gap-2">
          <PanelFilterSelect
            paramKey="pstatus"
            value={status ?? "all"}
            options={FILTER_OPTIONS}
            ariaLabel="Filtrar proyectos por estado"
            className="w-36"
          />
          <Button asChild variant="outline">
            <Link href="/dashboard/projects">
              <Plus data-icon="inline-start" />
              Nuevo
            </Link>
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{status ? "Sin proyectos en este estado" : "Aún no hay proyectos"}</EmptyTitle>
            <EmptyDescription>
              {status
                ? "Prueba con otro estado o revisa el listado completo."
                : "Crea el primer proyecto de tu organización para empezar a trabajar."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/dashboard/projects">{status ? "Ver todos los proyectos" : "Crear el primer proyecto"}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="shadow-xs">
              <CardHeader>
                <CardTitle className="truncate">
                  <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {project.description && (
                    <p className="truncate text-muted-foreground text-sm">{project.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress.pct} aria-label={`Avance ${project.progress.pct} %`} />
                    <span className="text-muted-foreground text-xs tabular-nums">{project.progress.pct} %</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-muted-foreground text-xs">
                  {project.endDate
                    ? `Vence el ${format(project.endDate, "d 'de' MMM", { locale: es })}`
                    : "Sin fecha de cierre"}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
