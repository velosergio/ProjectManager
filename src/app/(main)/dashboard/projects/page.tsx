import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { canManageCatalogs, canManageProjects } from "@/lib/authz-projects";
import { listClients, listMembers, listProcessTypes, listProjects, listTags } from "@/lib/projects/queries";
import { projectFiltersSchema } from "@/lib/projects/schemas";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { ProcessTypesManager } from "./_components/process-types-manager";
import { ProjectFormDialog } from "./_components/project-form-dialog";
import { ProjectsFilters } from "./_components/projects-filters";
import { ProjectsTable } from "./_components/projects-table";
import { TagsManager } from "./_components/tags-manager";

export const metadata = {
  title: "Proyectos",
};

/// Listado de proyectos de la organización: paginado en servidor, con filtros
/// combinables vía `searchParams` (FR-012) y acciones según rol (FR-018).
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return null;
  }
  if (!ctx.tenantId) {
    // `mango` sin organización seleccionada (edge case de la spec).
    return (
      <div className="p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Selecciona una organización</EmptyTitle>
            <EmptyDescription>
              Para ver proyectos, primero elige una organización desde la consola mango.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/dashboard/mango">Ir a la consola mango</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const raw = await searchParams;
  const filters = projectFiltersSchema.parse(raw);
  const db = await getTenantDb();

  const [result, clients, members, processTypes, tags] = await Promise.all([
    listProjects(db, filters),
    listClients(db),
    listMembers(db, ctx.tenantId),
    listProcessTypes(db),
    listTags(db),
  ]);

  const actor = { userId: ctx.userId, role: ctx.role };
  const canManage = canManageProjects(ctx.role);
  const canCatalogs = canManageCatalogs(ctx.role);
  const formCatalogs = { clients, members, processTypes, tags };

  const hasFilters = Boolean(
    filters.q ||
      filters.status ||
      filters.priority ||
      filters.ownerId ||
      filters.clientId ||
      filters.processTypeId ||
      filters.tagId,
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Proyectos</h1>
          <p className="text-muted-foreground text-sm">
            {result.total === 0 ? "Sin proyectos todavía." : `${result.total} proyecto(s) en tu organización.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCatalogs && <TagsManager tags={tags} />}
          {canCatalogs && <ProcessTypesManager processTypes={processTypes} />}
          {canManage && <ProjectFormDialog mode="create" catalogs={formCatalogs} canManageCatalogs={canCatalogs} />}
        </div>
      </div>

      <ProjectsFilters catalogs={formCatalogs} />

      {result.total === 0 && !hasFilters ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Aún no hay proyectos</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Crea el primer proyecto de tu organización para empezar a trabajar."
                : "Cuando tu organización tenga proyectos, aparecerán aquí."}
            </EmptyDescription>
          </EmptyHeader>
          {canManage && (
            <EmptyContent>
              <ProjectFormDialog
                mode="create"
                catalogs={formCatalogs}
                canManageCatalogs={canCatalogs}
                triggerLabel="Crear el primer proyecto"
              />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ProjectsTable
          projects={result.projects}
          actor={actor}
          catalogs={formCatalogs}
          canManageCatalogs={canCatalogs}
          page={result.page}
          pageCount={result.pageCount}
          hasFilters={hasFilters}
        />
      )}
    </div>
  );
}
