import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTenantContext } from "@/lib/tenant-context";
import { getAdminDb } from "@/lib/tenant-db-session";

import { TenantSwitcher } from "./_components/tenant-switcher";

export const metadata = {
  title: "Consola mango",
};

/// Consola exclusiva del super usuario `mango`: vista transversal de todas las
/// organizaciones con selector de tenant (FR-021). Acceso restringido por rol.
export default async function MangoConsolePage() {
  const ctx = await getTenantContext();
  if (ctx?.role !== "MANGO") {
    notFound();
  }

  // `getAdminDb()` cruza la frontera de tenant (única vía autorizada).
  const db = await getAdminDb();
  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { projects: true, users: true } },
    },
  });

  const activeTenantId = ctx.tenantId;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Consola mango</h1>
        <p className="text-muted-foreground text-sm">
          Acceso transversal a todas las organizaciones. {tenants.length} organización(es) registradas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizaciones</CardTitle>
          <CardDescription>
            {activeTenantId
              ? "Estás inspeccionando una organización. Pulsa «Salir» para volver a la vista global."
              : "Selecciona una organización para inspeccionar sus datos."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Sin organizaciones</EmptyTitle>
                <EmptyDescription>Todavía no se ha registrado ninguna organización.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Usuarios</TableHead>
                  <TableHead className="text-right">Proyectos</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id} data-active={tenant.id === activeTenantId}>
                    <TableCell className="font-medium">
                      {tenant.name}
                      {tenant.id === activeTenantId && (
                        <Badge variant="secondary" className="ml-2">
                          Inspeccionando
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{tenant.subscription?.plan.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.subscription?.status ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{tenant._count.users}</TableCell>
                    <TableCell className="text-right">{tenant._count.projects}</TableCell>
                    <TableCell className="text-right">
                      <TenantSwitcher tenantId={tenant.id} isActive={tenant.id === activeTenantId} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
