"use client";

import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DeleteTeamDialog } from "./delete-team-dialog";
import { TeamFormDialog } from "./team-form-dialog";
import type { TeamListRow } from "./types";

interface TeamsTableProps {
  teams: TeamListRow[];
  canManage: boolean;
}

/// Listado de equipos (FR-014): nombre enlazado al detalle, descripción,
/// conteo de miembros y acciones de gestión solo para roles con permiso.
export function TeamsTable({ teams, canManage }: TeamsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Miembros</TableHead>
            {canManage && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell className="max-w-64">
                <Link href={`/dashboard/teams/${team.id}`} className="font-medium hover:underline">
                  {team.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-96 truncate text-muted-foreground">{team.description ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{team.memberCount}</TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <TeamFormDialog mode="edit" team={team} memberOptions={[]} />
                    <DeleteTeamDialog teamId={team.id} teamName={team.name} />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
