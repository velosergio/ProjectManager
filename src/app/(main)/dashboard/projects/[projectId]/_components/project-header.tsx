import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/projects/labels";

import { DeleteProjectDialog } from "../../_components/delete-project-dialog";
import { ProjectFormDialog } from "../../_components/project-form-dialog";
import type { FormCatalogs, ProjectRow } from "../../_components/types";

interface ProjectHeaderProps {
  project: ProjectRow;
  catalogs: FormCatalogs;
  canEdit: boolean;
  canDelete: boolean;
  canManageCatalogs: boolean;
}

function formatDate(date: Date | null): string {
  return date ? format(date, "d 'de' MMMM yyyy", { locale: es }) : "—";
}

/// Cabecera del detalle (FR-008): todos los campos del proyecto, etiquetas,
/// avance derivado y acciones según permisos.
export function ProjectHeader({ project, catalogs, canEdit, canDelete, canManageCatalogs }: ProjectHeaderProps) {
  const meta: Array<{ label: string; value: string }> = [
    { label: "Cliente", value: project.client === null ? "Sin cliente" : project.client.name },
    { label: "Responsable", value: project.owner === null ? "Sin asignar" : project.owner.name },
    { label: "Tipo de proceso", value: project.processType === null ? "Sin tipo" : project.processType.name },
    { label: "Fecha de inicio", value: formatDate(project.startDate) },
    { label: "Cierre estimado", value: formatDate(project.endDate) },
  ];

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
              <Badge
                variant={project.priority === "URGENT" || project.priority === "HIGH" ? "destructive" : "secondary"}
              >
                Prioridad: {PROJECT_PRIORITY_LABELS[project.priority]}
              </Badge>
              {project.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <ProjectFormDialog
                mode="edit"
                project={project}
                catalogs={catalogs}
                canManageCatalogs={canManageCatalogs}
              />
            )}
            {canDelete && (
              <DeleteProjectDialog projectId={project.id} projectName={project.name} redirectTo="/dashboard/projects" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {project.description && <p className="text-muted-foreground text-sm">{project.description}</p>}

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {meta.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">{item.label}</dt>
              <dd className="text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avance del proyecto</span>
            <span className="tabular-nums">
              {project.progress.done}/{project.progress.total} tareas · {project.progress.pct} %
            </span>
          </div>
          <Progress value={project.progress.pct} aria-label={`Avance ${project.progress.pct} %`} />
        </div>
      </CardContent>
    </Card>
  );
}
