import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { canManageClients } from "@/lib/authz-clients";
import { listClients } from "@/lib/clients/queries";
import { clientFiltersSchema } from "@/lib/clients/schemas";
import { listTags } from "@/lib/projects/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { ClientFormDialog } from "./_components/client-form-dialog";
import { ClientsFilters } from "./_components/clients-filters";
import { ClientsTable } from "./_components/clients-table";

export const metadata = {
  title: "Clientes",
};

/// Listado de clientes de la organización (FR-001): paginado en servidor,
/// con búsqueda y filtros vía `searchParams` (US3) y acciones según rol.
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return null;
  }
  if (!ctx.tenantId) {
    // `mango` sin organización seleccionada (mismo edge case que proyectos).
    return (
      <div className="p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Selecciona una organización</EmptyTitle>
            <EmptyDescription>
              Para ver clientes, primero elige una organización desde la consola mango.
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
  const filters = clientFiltersSchema.parse(raw);
  const db = await getTenantDb();

  const [result, tags] = await Promise.all([listClients(db, filters), listTags(db)]);

  const canManage = canManageClients(ctx.role);
  const hasFilters = Boolean(filters.q ?? filters.tagId ?? filters.active);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            {result.total === 0 ? "Sin clientes todavía." : `${result.total} cliente(s) en tu organización.`}
          </p>
        </div>
        {canManage && <ClientFormDialog mode="create" tags={tags} />}
      </div>

      {(result.total > 0 || hasFilters) && <ClientsFilters tags={tags} />}

      {result.total === 0 && !hasFilters ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Aún no hay clientes</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Crea el primer cliente para vincularlo a tus proyectos."
                : "Cuando tu organización tenga clientes, aparecerán aquí."}
            </EmptyDescription>
          </EmptyHeader>
          {canManage && (
            <EmptyContent>
              <ClientFormDialog mode="create" tags={tags} triggerLabel="Crear el primer cliente" />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <ClientsTable
          clients={result.clients}
          tags={tags}
          canManage={canManage}
          page={result.page}
          pageCount={result.pageCount}
          hasFilters={hasFilters}
        />
      )}
    </div>
  );
}
