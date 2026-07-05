import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { canManageTeams } from "@/lib/authz-teams";
import { listTeams } from "@/lib/teams/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { TeamFormDialog } from "./_components/team-form-dialog";
import { TeamsTable } from "./_components/teams-table";
import type { MemberOption } from "./_components/types";

export const metadata = {
  title: "Equipos",
};

/// Listado de equipos de la organización (FR-014): nombre, descripción y
/// conteo de miembros, con acciones según rol (`authz-teams`).
export default async function TeamsPage() {
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
              Para ver equipos, primero elige una organización desde la consola mango.
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

  const db = await getTenantDb();
  const canManage = canManageTeams(ctx.role);
  // Las opciones de miembros solo hacen falta para el diálogo de creación.
  // `User` no es un modelo escopado: el filtro por tenant es explícito.
  const [teams, memberOptions] = await Promise.all([
    listTeams(db),
    canManage
      ? db.user.findMany({
          where: { tenantId: ctx.tenantId, status: "ACTIVE" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([] as MemberOption[]),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Equipos</h1>
          <p className="text-muted-foreground text-sm">
            {teams.length === 0 ? "Sin equipos todavía." : `${teams.length} equipo(s) en tu organización.`}
          </p>
        </div>
        {canManage && <TeamFormDialog mode="create" memberOptions={memberOptions} />}
      </div>

      {teams.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Aún no hay equipos</EmptyTitle>
            <EmptyDescription>
              {canManage
                ? "Crea el primer equipo para agrupar a los miembros de tu organización."
                : "Cuando tu organización tenga equipos, aparecerán aquí."}
            </EmptyDescription>
          </EmptyHeader>
          {canManage && (
            <EmptyContent>
              <TeamFormDialog mode="create" memberOptions={memberOptions} triggerLabel="Crear el primer equipo" />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <TeamsTable teams={teams} canManage={canManage} />
      )}
    </div>
  );
}
