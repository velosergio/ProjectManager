"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canDeleteProject, canEditProject } from "@/lib/authz-projects";
import { formatCalendarDate } from "@/lib/format-date";
import { PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS } from "@/lib/projects/labels";

import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectFormDialog } from "./project-form-dialog";
import type { ClientActor, FormCatalogs, ProjectRow } from "./types";

interface ProjectsTableProps {
  projects: ProjectRow[];
  actor: ClientActor;
  catalogs: FormCatalogs;
  canManageCatalogs: boolean;
  page: number;
  pageCount: number;
  hasFilters: boolean;
}

function pageHref(pathname: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `${pathname}?${next.toString()}`;
}

export function ProjectsTable({
  projects,
  actor,
  catalogs,
  canManageCatalogs,
  page,
  pageCount,
  hasFilters,
}: ProjectsTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (projects.length === 0 && hasFilters) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Sin resultados</EmptyTitle>
          <EmptyDescription>Ningún proyecto coincide con la búsqueda o los filtros aplicados.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href={pathname}>Limpiar filtros</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border bg-background shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead className="min-w-32">Avance</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => {
              // Visibilidad optimista: sin las tareas del proyecto a mano, el
              // MEMBER asignado a tareas edita desde el detalle (el servidor
              // aplica la regla completa de FR-018 en cualquier caso).
              const canEdit = canEditProject(actor, { ownerId: project.ownerId, taskAssigneeIds: [] });
              return (
                <TableRow key={project.id}>
                  <TableCell className="max-w-64">
                    <Link href={`/dashboard/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    {project.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {project.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project.client?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        project.priority === "URGENT" || project.priority === "HIGH" ? "destructive" : "secondary"
                      }
                    >
                      {PROJECT_PRIORITY_LABELS[project.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={project.progress.pct} aria-label={`Avance ${project.progress.pct} %`} />
                      <span className="text-muted-foreground text-xs tabular-nums">{project.progress.pct} %</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.endDate ? formatCalendarDate(project.endDate, "d 'de' MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{project.owner?.name ?? "Sin asignar"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <ProjectFormDialog
                          mode="edit"
                          project={project}
                          catalogs={catalogs}
                          canManageCatalogs={canManageCatalogs}
                        />
                      )}
                      {canDeleteProject(actor.role) && (
                        <DeleteProjectDialog projectId={project.id} projectName={project.name} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm tabular-nums">
            Página {page} de {pageCount}
          </p>
          <div className="flex items-center gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(pathname, searchParams, page - 1)}>Anterior</Link>
              </Button>
            )}
            {page >= pageCount ? (
              <Button variant="outline" size="sm" disabled>
                Siguiente
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(pathname, searchParams, page + 1)}>Siguiente</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
