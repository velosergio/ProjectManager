"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createTeamAction, updateTeamAction } from "../actions";
import type { MemberOption, TeamListRow } from "./types";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  description: z.string().trim().max(500, "La descripción no puede superar los 500 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

interface TeamFormDialogProps {
  mode: "create" | "edit";
  team?: TeamListRow;
  /// Miembros elegibles del tenant (solo se usa en modo creación; en edición
  /// la composición se gestiona desde el detalle del equipo).
  memberOptions: MemberOption[];
  triggerLabel?: string;
}

/// Alta y edición de equipos (FR-012): nombre obligatorio y descripción
/// opcional. En la creación permite elegir la composición inicial (FR-013).
export function TeamFormDialog({ mode, team, memberOptions, triggerLabel }: TeamFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: team?.name ?? "", description: team?.description ?? "" },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ name: team?.name ?? "", description: team?.description ?? "" });
      setSelectedMemberIds([]);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createTeamAction({ ...values, memberIds: selectedMemberIds })
          : await updateTeamAction(team?.id ?? "", values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Equipo creado." : "Equipo actualizado.");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus data-icon="inline-start" />
            {triggerLabel ?? "Nuevo equipo"}
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo equipo" : "Editar equipo"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Solo el nombre es obligatorio; puedes elegir los miembros iniciales ahora o después."
              : "Modifica el nombre o la descripción; la composición se gestiona desde el detalle."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="team-name">Nombre</FieldLabel>
                  <Input {...field} id="team-name" placeholder="Nombre del equipo" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="team-description">Descripción</FieldLabel>
                  <Textarea
                    {...field}
                    id="team-description"
                    placeholder="Propósito del equipo (opcional)"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {mode === "create" && memberOptions.length > 0 && (
              <Field className="gap-1.5">
                <FieldLabel asChild>
                  <span id="team-members-label">Miembros iniciales</span>
                </FieldLabel>
                <fieldset className="flex flex-wrap gap-1.5" aria-labelledby="team-members-label">
                  {memberOptions.map((member) => {
                    const selected = selectedMemberIds.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.id)}
                        aria-pressed={selected}
                        className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <Badge variant={selected ? "default" : "outline"}>{member.name}</Badge>
                      </button>
                    );
                  })}
                </fieldset>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : mode === "create" ? "Crear equipo" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
