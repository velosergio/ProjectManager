"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ClientFormDialog } from "./client-form-dialog";
import { DeleteClientDialog } from "./delete-client-dialog";
import type { ClientListRow, TagOption } from "./types";

interface ClientsTableProps {
  clients: ClientListRow[];
  tags: TagOption[];
  canManage: boolean;
  page: number;
  pageCount: number;
  hasFilters: boolean;
}

function pageHref(pathname: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `${pathname}?${next.toString()}`;
}

/// Listado de clientes (FR-001): nombre enlazado al detalle, contacto,
/// etiquetas y acciones de gestión solo para roles con permiso.
export function ClientsTable({ clients, tags, canManage, page, pageCount, hasFilters }: ClientsTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (clients.length === 0 && hasFilters) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Sin resultados</EmptyTitle>
          <EmptyDescription>Ningún cliente coincide con la búsqueda o los filtros aplicados.</EmptyDescription>
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
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Proyectos</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="max-w-64">
                  <Link href={`/dashboard/clients/${client.id}`} className="font-medium hover:underline">
                    {client.name}
                  </Link>
                  {client.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="text-xs">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{client._count.projects}</TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <ClientFormDialog mode="edit" client={client} tags={tags} />
                      <DeleteClientDialog clientId={client.id} clientName={client.name} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
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
