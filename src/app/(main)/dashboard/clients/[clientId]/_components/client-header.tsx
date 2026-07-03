import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ClientDetail } from "@/lib/clients/queries";

import { ClientFormDialog } from "../../_components/client-form-dialog";
import { DeleteClientDialog } from "../../_components/delete-client-dialog";
import type { ClientListRow, TagOption } from "../../_components/types";

interface ClientHeaderProps {
  client: ClientDetail;
  tags: TagOption[];
  canManage: boolean;
}

/// Cabecera del detalle (FR-006): datos de contacto, etiquetas y acciones de
/// gestión reutilizando los diálogos del listado, gated por rol (FR-013).
export function ClientHeader({ client, tags, canManage }: ClientHeaderProps) {
  // Adapta el detalle a la fila que esperan los diálogos del listado.
  const row: ClientListRow = {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    tags: client.tags,
    _count: { projects: client.projects.length },
  };

  const meta: Array<{ label: string; value: string }> = [
    { label: "Email", value: client.email ?? "—" },
    { label: "Teléfono", value: client.phone ?? "—" },
    { label: "Cliente desde", value: format(client.createdAt, "d 'de' MMMM yyyy", { locale: es }) },
  ];

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{client.name}</h1>
            {client.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {client.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {canManage && (
            <div className="flex items-center gap-1">
              <ClientFormDialog mode="edit" client={row} tags={tags} />
              <DeleteClientDialog clientId={client.id} clientName={client.name} redirectTo="/dashboard/clients" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          {meta.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">{item.label}</dt>
              <dd className="text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
