import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canManageTeams } from "@/lib/authz-teams";
import { getTeamDetail } from "@/lib/teams/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { DeleteTeamDialog } from "../_components/delete-team-dialog";
import { TeamFormDialog } from "../_components/team-form-dialog";
import type { MemberOption } from "../_components/types";
import { TeamMembersCard } from "./_components/team-members-card";
import { TeamNotesSection } from "./_components/team-notes-section";

export const metadata = {
  title: "Detalle del equipo",
};

/// Vista de detalle de un equipo (FR-014): datos, composición con
/// añadir/retirar miembros y acciones de gestión. `notFound()` cubre equipos
/// inexistentes o de otro tenant (aislamiento).
export default async function TeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    notFound();
  }

  const { teamId } = await params;
  const db = await getTenantDb();
  const canManage = canManageTeams(ctx.role);
  // Las opciones de miembros solo hacen falta para gestionar la composición.
  // `User` no es un modelo escopado: el filtro por tenant es explícito.
  const [team, memberOptions] = await Promise.all([
    getTeamDetail(db, teamId),
    canManage
      ? db.user.findMany({
          where: { tenantId: ctx.tenantId, status: "ACTIVE" },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([] as MemberOption[]),
  ]);
  if (!team) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2">
          <Link href="/dashboard/teams">
            <ArrowLeft data-icon="inline-start" />
            Volver a equipos
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{team.name}</h1>
          {team.description && <p className="mt-1 max-w-2xl text-muted-foreground text-sm">{team.description}</p>}
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <TeamFormDialog
              mode="edit"
              team={{
                id: team.id,
                name: team.name,
                description: team.description,
                memberCount: team.members.length,
                noteCount: 0,
              }}
              memberOptions={[]}
            />
            <DeleteTeamDialog teamId={team.id} teamName={team.name} redirectTo="/dashboard/teams" />
          </div>
        )}
      </div>

      <TeamMembersCard teamId={team.id} members={team.members} memberOptions={memberOptions} canManage={canManage} />

      <TeamNotesSection teamId={team.id} teamName={team.name} />
    </div>
  );
}
