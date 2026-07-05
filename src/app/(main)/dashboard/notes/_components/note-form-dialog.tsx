"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { NoteScope } from "@/generated/prisma/client";

import { createNoteAction, updateNoteAction } from "../actions";
import { NOTE_SCOPE_LABELS, type NoteFormNote, type NoteRefOptions } from "./types";

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(200, "El título no puede superar los 200 caracteres."),
  content: z.string().trim().min(1, "El contenido es obligatorio."),
});

type FormValues = z.infer<typeof formSchema>;

/// Alcance fijado por el contexto (US4/US5): la nota nace vinculada y el
/// selector no se muestra.
export interface FixedNoteContext {
  scope: Exclude<NoteScope, "GLOBAL">;
  referenceId: string;
  label: string;
}

interface NoteFormDialogProps {
  mode: "create" | "edit";
  note?: NoteFormNote;
  /// Referencias elegibles cuando el alcance es libre (listado central).
  refOptions?: NoteRefOptions;
  fixedContext?: FixedNoteContext;
  triggerLabel?: string;
  /// Trigger a medida (p. ej. el botón de acciones rápidas del panel).
  trigger?: React.ReactNode;
  /// Callback tras guardar con éxito (además del refresco RSC).
  onSaved?: () => void;
}

const EMPTY_OPTIONS: NoteRefOptions = { projects: [], tasks: [], teams: [] };

/// Alta y edición de notas (FR-016..FR-019): título y contenido obligatorios;
/// en la creación, alcance único con referencia dependiente (o fijado por el
/// contexto). En la edición el alcance no se reasigna (contrato US3).
export function NoteFormDialog({
  mode,
  note,
  refOptions,
  fixedContext,
  triggerLabel,
  trigger,
  onSaved,
}: NoteFormDialogProps) {
  const options = refOptions ?? EMPTY_OPTIONS;
  const initialScope: NoteScope = fixedContext ? fixedContext.scope : "GLOBAL";
  const initialReference = fixedContext ? fixedContext.referenceId : "";
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [scope, setScope] = React.useState<NoteScope>(initialScope);
  const [referenceId, setReferenceId] = React.useState<string>(initialReference);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: note?.title ?? "", content: note?.content ?? "" },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset({ title: note?.title ?? "", content: note?.content ?? "" });
      setScope(initialScope);
      setReferenceId(initialReference);
    }
  };

  const referenceOptions =
    scope === "PROJECT"
      ? options.projects.map((project) => ({ id: project.id, label: project.name }))
      : scope === "TASK"
        ? options.tasks.map((task) => ({ id: task.id, label: task.title }))
        : scope === "TEAM"
          ? options.teams.map((team) => ({ id: team.id, label: team.name }))
          : [];

  const referenceLabel = scope === "PROJECT" ? "Proyecto" : scope === "TASK" ? "Tarea" : "Equipo";
  const needsReference = scope !== "GLOBAL" && !fixedContext;

  const onSubmit = (values: FormValues) => {
    if (needsReference && !referenceId) {
      toast.error(`Selecciona el ${referenceLabel.toLowerCase()} de la nota.`);
      return;
    }
    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateNoteAction({ noteId: note?.id ?? "", ...values })
          : await createNoteAction(
              scope === "GLOBAL"
                ? { scope, ...values }
                : scope === "PROJECT"
                  ? { scope, projectId: referenceId, ...values }
                  : scope === "TASK"
                    ? { scope, taskId: referenceId, ...values }
                    : { scope, teamId: referenceId, ...values },
            );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Nota creada." : "Nota actualizada.");
      setOpen(false);
      onSaved?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ??
          (mode === "create" ? (
            <Button>
              <Plus data-icon="inline-start" />
              {triggerLabel ?? "Nueva nota"}
            </Button>
          ) : (
            <Button variant="ghost" size="sm">
              <Pencil data-icon="inline-start" />
              Editar
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva nota" : "Editar nota"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Modifica el título o el contenido; el alcance no puede cambiarse."
              : fixedContext
                ? `La nota quedará vinculada a ${fixedContext.label}.`
                : "Elige el alcance de la nota: general o vinculada a un proyecto, tarea o equipo."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            {mode === "create" && !fixedContext && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="note-scope">Alcance</FieldLabel>
                  <Select
                    value={scope}
                    onValueChange={(value) => {
                      setScope(value as NoteScope);
                      setReferenceId("");
                    }}
                  >
                    <SelectTrigger id="note-scope" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GLOBAL">{NOTE_SCOPE_LABELS.GLOBAL}</SelectItem>
                      <SelectItem value="PROJECT" disabled={options.projects.length === 0}>
                        {NOTE_SCOPE_LABELS.PROJECT}
                      </SelectItem>
                      <SelectItem value="TASK" disabled={options.tasks.length === 0}>
                        {NOTE_SCOPE_LABELS.TASK}
                      </SelectItem>
                      <SelectItem value="TEAM" disabled={options.teams.length === 0}>
                        {NOTE_SCOPE_LABELS.TEAM}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {scope !== "GLOBAL" && (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="note-reference">{referenceLabel}</FieldLabel>
                    <Select value={referenceId} onValueChange={setReferenceId}>
                      <SelectTrigger id="note-reference" className="w-full">
                        <SelectValue placeholder={`Selecciona ${referenceLabel.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {referenceOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
            )}
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="note-title">Título</FieldLabel>
                  <Input {...field} id="note-title" placeholder="Título de la nota" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="content"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="note-content">Contenido</FieldLabel>
                  <Textarea
                    {...field}
                    id="note-content"
                    rows={6}
                    placeholder="Escribe el contenido de la nota…"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : mode === "create" ? "Crear nota" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
