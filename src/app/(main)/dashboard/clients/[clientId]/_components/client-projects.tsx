import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClientDetail } from "@/lib/clients/queries";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/labels";

interface ClientProjectsProps {
  projects: ClientDetail["projects"];
}

/// Proyectos asociados al cliente (FR-008): cada uno enlaza a su detalle en la
/// feature de proyectos; estado vacío claro cuando no hay vínculos.
export function ClientProjects({ projects }: ClientProjectsProps) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Proyectos asociados</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Sin proyectos vinculados</EmptyTitle>
              <EmptyDescription>Cuando un proyecto tenga a este cliente asignado, aparecerá aquí.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última actualización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="max-w-64">
                      <Link href={`/dashboard/projects/${project.id}`} className="font-medium hover:underline">
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(project.updatedAt, "d 'de' MMMM yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
