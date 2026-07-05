"use client";

import * as React from "react";

import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/generated/prisma/client";

import type { MemberOption, TeamMemberRow } from "../../_components/types";
import { setTeamMembersAction } from "../../actions";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANGO: "Mango",
  MANAGER: "Gestor",
  MEMBER: "Miembro",
  VIEWER: "Observador",
};

interface TeamMembersCardProps {
  teamId: string;
  members: TeamMemberRow[];
  memberOptions: MemberOption[];
  canManage: boolean;
}

/// Composición del equipo (FR-013): listado de miembros con añadir/retirar.
/// Cada cambio reemplaza la composición completa vía `setTeamMembersAction`;
/// el RSC del detalle se refresca con el `revalidatePath` de la action.
export function TeamMembersCard({ teamId, members, memberOptions, canManage }: TeamMembersCardProps) {
  const [isPending, startTransition] = React.useTransition();

  const memberIds = members.map((member) => member.id);
  const candidates = memberOptions.filter((option) => !memberIds.includes(option.id));

  const applyMembers = (nextIds: string[], successMessage: string) => {
    startTransition(async () => {
      const result = await setTeamMembersAction({ teamId, memberIds: nextIds });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
    });
  };

  const addMember = (option: MemberOption) => {
    applyMembers([...memberIds, option.id], `${option.name} añadido al equipo.`);
  };

  const removeMember = (member: TeamMemberRow) => {
    applyMembers(
      memberIds.filter((id) => id !== member.id),
      `${member.name} retirado del equipo.`,
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Miembros del equipo</CardTitle>
          <CardDescription>
            {members.length === 0 ? "Este equipo aún no tiene miembros." : `${members.length} miembro(s) en el equipo.`}
          </CardDescription>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending || candidates.length === 0}>
                <UserPlus data-icon="inline-start" />
                Añadir miembro
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Miembros disponibles</DropdownMenuLabel>
              {candidates.map((option) => (
                <DropdownMenuItem key={option.id} onSelect={() => addMember(option)}>
                  <span className="truncate">{option.name}</span>
                  <span className="ml-auto truncate ps-2 text-muted-foreground text-xs">{option.email}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {canManage
              ? "Añade miembros con el botón de arriba para empezar a trabajar en equipo."
              : "Cuando el equipo tenga miembros, aparecerán aquí."}
          </p>
        ) : (
          <ul className="divide-y">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{member.name}</p>
                  <p className="truncate text-muted-foreground text-xs">{member.email}</p>
                </div>
                <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                {member.status !== "ACTIVE" && <Badge variant="secondary">Inactivo</Badge>}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => removeMember(member)}
                    aria-label={`Retirar a ${member.name} del equipo`}
                  >
                    <X />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
