"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, EllipsisVertical, UserPlus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole, UserStatus } from "@/generated/prisma/client";
import { ASSIGNABLE_ROLES, canManageMembers } from "@/lib/authz-members";
import type { MemberView } from "@/lib/members/queries";

import {
  cancelInvitationAction,
  changeMemberRoleAction,
  deactivateMemberAction,
  inviteMemberAction,
  listMembersAction,
  reactivateMemberAction,
  resendInvitationAction,
} from "./members-actions";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANGO: "Mango (global)",
  MANAGER: "Gerente",
  MEMBER: "Miembro",
  VIEWER: "Lector",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Activo",
  INVITED: "Invitado",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspendido",
};

/// Versión de formulario del schema de invitación: email como texto plano
/// (RHF necesita entrada `string`; la normalización y la validación finales
/// las aplica la Server Action con `inviteMemberSchema`).
const inviteFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El correo electrónico es obligatorio.")
    .max(254, "El correo electrónico es demasiado largo.")
    .refine((value) => z.email().safeParse(value).success, {
      message: "El correo electrónico no tiene un formato válido.",
    }),
  role: z.enum(ASSIGNABLE_ROLES, { message: "El rol seleccionado no es válido." }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

/// Pestaña «Miembros» del modal de Configuración (FASE 4, US1): listado con
/// rol/estado, invitación por enlace, reenvío/cancelación, cambio de rol y
/// desactivar/reactivar. Primer uso de la convención TanStack Query: keys
/// escopadas por tenant e invalidación tras cada mutación.
export function MembersSettings({ role, tenantId }: { readonly role: UserRole; readonly tenantId: string | null }) {
  const canManage = canManageMembers(role);
  const queryClient = useQueryClient();
  const membersKey = [tenantId ?? "sin-tenant", "members"] as const;
  const [lastInvite, setLastInvite] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const membersQuery = useQuery({
    queryKey: membersKey,
    queryFn: async () => {
      const result = await listMembersAction();
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const invalidateMembers = () => void queryClient.invalidateQueries({ queryKey: membersKey });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });

  const inviteMutation = useMutation({
    mutationFn: inviteMemberAction,
    onSuccess: (result, variables) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      invalidateMembers();
      form.reset({ email: "", role: "MEMBER" });
      const email = (variables as InviteFormValues).email;
      setLastInvite({ email, url: result.data.inviteUrl });
      setCopied(false);
      toast.success("Invitación enviada. Comparte el enlace si el correo no llega.");
    },
    onError: () => toast.error("No se pudo enviar la invitación. Inténtalo de nuevo."),
  });

  /// Mutación genérica: ejecuta la action, notifica y refresca el listado.
  const runAction = async (action: () => Promise<{ ok: true; data?: unknown } | { ok: false; error: string }>) => {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    invalidateMembers();
    return result;
  };

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  if (membersQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (membersQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">{membersQuery.error.message}</p>
        <Button variant="outline" size="sm" onClick={() => void membersQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { members, selfId } = membersQuery.data;

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => inviteMutation.mutate(values))}
          className="flex flex-col gap-2"
        >
          <div className="flex items-end gap-2">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="flex-1 gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-email">Invitar por correo</FieldLabel>
                  <Input
                    {...field}
                    id="invite-email"
                    type="email"
                    placeholder="persona@empresa.com"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Field className="w-36 gap-1.5">
                  <FieldLabel htmlFor="invite-role">Rol</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((assignable) => (
                        <SelectItem key={assignable} value={assignable}>
                          {ROLE_LABELS[assignable]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Button type="submit" disabled={inviteMutation.isPending}>
              <UserPlus data-icon="inline-start" />
              {inviteMutation.isPending ? "Invitando…" : "Invitar"}
            </Button>
          </div>
          {form.formState.errors.email && <FieldError errors={[form.formState.errors.email]} />}
        </form>
      )}

      {lastInvite && (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
          <p className="text-sm">
            Enlace de invitación para <strong>{lastInvite.email}</strong> (caduca en 7 días):
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={lastInvite.url} className="flex-1 text-xs" onFocus={(e) => e.target.select()} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Copiar enlace de invitación"
              onClick={() => void copyInviteUrl(lastInvite.url)}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        {members.length === 0 && <p className="text-muted-foreground text-sm">Aún no hay miembros que mostrar.</p>}
        {members.map((member, index) => (
          <div key={member.id}>
            {index > 0 && <Separator className="my-2" />}
            <MemberRow
              member={member}
              isSelf={member.id === selfId}
              canManage={canManage}
              onChangeRole={async (nextRole) => {
                await runAction(() => changeMemberRoleAction({ userId: member.id, role: nextRole }));
              }}
              onResend={async () => {
                const result = await runAction(() => resendInvitationAction(member.id));
                const data = result?.ok ? (result.data as { inviteUrl: string }) : null;
                if (data) {
                  setLastInvite({ email: member.email, url: data.inviteUrl });
                  setCopied(false);
                  toast.success("Invitación reenviada con un enlace nuevo.");
                }
              }}
              onCancel={async () => {
                const result = await runAction(() => cancelInvitationAction(member.id));
                if (result) toast.success("Invitación cancelada.");
              }}
              onDeactivate={async () => {
                const result = await runAction(() => deactivateMemberAction(member.id));
                if (result) toast.success("Miembro desactivado: su acceso queda revocado.");
              }}
              onReactivate={async () => {
                const result = await runAction(() => reactivateMemberAction(member.id));
                if (result) toast.success("Miembro reactivado.");
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function statusBadge(member: MemberView) {
  if (member.status === "INVITED") {
    return (
      <Badge variant="outline">{member.invitation?.expired ? "Invitación caducada" : STATUS_LABELS.INVITED}</Badge>
    );
  }
  if (member.status === "ACTIVE") {
    return <Badge variant="secondary">{STATUS_LABELS.ACTIVE}</Badge>;
  }
  return <Badge variant="destructive">{STATUS_LABELS[member.status]}</Badge>;
}

function MemberRow({
  member,
  isSelf,
  canManage,
  onChangeRole,
  onResend,
  onCancel,
  onDeactivate,
  onReactivate,
}: {
  readonly member: MemberView;
  readonly isSelf: boolean;
  readonly canManage: boolean;
  readonly onChangeRole: (role: UserRole) => Promise<void>;
  readonly onResend: () => Promise<void>;
  readonly onCancel: () => Promise<void>;
  readonly onDeactivate: () => Promise<void>;
  readonly onReactivate: () => Promise<void>;
}) {
  const canEditRole = canManage && !isSelf && member.role !== "MANGO";
  const hasActions = canManage && !isSelf;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-sm">
          {member.name}
          {isSelf && <span className="text-muted-foreground"> (tú)</span>}
        </div>
        <div className="truncate text-muted-foreground text-xs">{member.email}</div>
        {/* Carga de trabajo (US6/FR-011): visible para dimensionar equipos. */}
        <div className="text-muted-foreground text-xs tabular-nums">
          {member.workload.activeTasks} tarea(s) · {member.workload.activeProjects} proyecto(s) activos
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {statusBadge(member)}
        {canEditRole ? (
          <Select value={member.role} onValueChange={(value) => void onChangeRole(value as UserRole)}>
            <SelectTrigger size="sm" className="w-32" aria-label={`Rol de ${member.name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((assignable) => (
                <SelectItem key={assignable} value={assignable}>
                  {ROLE_LABELS[assignable]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="w-32 text-muted-foreground text-xs">{ROLE_LABELS[member.role]}</span>
        )}
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${member.name}`}>
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.status === "INVITED" && (
                <>
                  <DropdownMenuItem onClick={() => void onResend()}>Reenviar invitación</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => void onCancel()}>
                    Cancelar invitación
                  </DropdownMenuItem>
                </>
              )}
              {member.status === "ACTIVE" && (
                <DropdownMenuItem variant="destructive" onClick={() => void onDeactivate()}>
                  Desactivar acceso
                </DropdownMenuItem>
              )}
              {member.status === "INACTIVE" && (
                <DropdownMenuItem onClick={() => void onReactivate()}>Reactivar acceso</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
