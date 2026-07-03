import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canManageClients } from "@/lib/authz-clients";
import { getClientDetail } from "@/lib/clients/queries";
import { listTags } from "@/lib/projects/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { ClientHeader } from "./_components/client-header";
import { ClientProjects } from "./_components/client-projects";
import { ClientTracking } from "./_components/client-tracking";

export const metadata = {
  title: "Detalle del cliente",
};

/// Vista de detalle de un cliente (FR-006..FR-008): contacto, etiquetas,
/// seguimiento de proyectos y listado enlazado. `notFound()` cubre clientes
/// inexistentes o de otro tenant (aislamiento FR-014).
export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    notFound();
  }

  const { clientId } = await params;
  const db = await getTenantDb();
  const canManage = canManageClients(ctx.role);
  // El catálogo de etiquetas solo hace falta para el diálogo de edición.
  const [detail, tags] = await Promise.all([
    getClientDetail(db, clientId),
    canManage ? listTags(db) : Promise.resolve([]),
  ]);
  if (!detail) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2">
          <Link href="/dashboard/clients">
            <ArrowLeft data-icon="inline-start" />
            Volver a clientes
          </Link>
        </Button>
      </div>

      <ClientHeader client={detail} tags={tags} canManage={canManage} />
      <ClientTracking statusCounts={detail.statusCounts} lastActivityAt={detail.lastActivityAt} />
      <ClientProjects projects={detail.projects} />
    </div>
  );
}
