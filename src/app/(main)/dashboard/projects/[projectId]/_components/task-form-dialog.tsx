"use client";

import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER } from "@/lib/projects/labels";

import type { CatalogOption, TaskRow } from "../../_components/types";
import { createTask, updateTask } from "../../actions";

const NONE = "none";

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(200, "El título no puede superar los 200 caracteres."),
  description: z.string().trim().max(5000, "La descripción es demasiado larga."),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  assigneeId: z.string(),
  dueDate: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function toFormValues(task?: TaskRow): FormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "TODO",
    assigneeId: task?.assigneeId ?? NONE,
    dueDate: task?.dueDate ? format(task.dueDate, "yyyy-MM-dd") : "",
  };
}

interface TaskFormDialogProps {
  projectId: string;
  task?: TaskRow;
  members: CatalogOption[];
  triggerLabel?: string;
}

export function TaskFormDialog({ projectId, task, members, triggerLabel }: TaskFormDialogProps) {
  const mode = task ? "edit" : "create";
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(task),
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset(toFormValues(task));
    }
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        title: values.title,
        description: values.description || null,
        status: values.status,
        assigneeId: values.assigneeId === NONE ? "" : values.assigneeId,
        dueDate: values.dueDate,
      };
      const result =
        mode === "create" ? await createTask(projectId, payload) : await updateTask(projectId, task?.id ?? "", payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Tarea creada." : "Tarea actualizada.");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus data-icon="inline-start" />
            {triggerLabel ?? "Nueva tarea"}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label={`Editar ${task?.title}`}>
            <Pencil />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nueva tarea" : "Editar tarea"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Solo el título es obligatorio." : "Modifica los datos de la tarea."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="task-title">Título</FieldLabel>
                  <Input {...field} id="task-title" placeholder="Qué hay que hacer" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="task-description">Descripción</FieldLabel>
                  <Textarea {...field} id="task-description" placeholder="Detalles opcionales" rows={3} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="task-status">Estado</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="task-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_STATUS_ORDER.map((status) => (
                          <SelectItem key={status} value={status}>
                            {TASK_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="task-assignee">Responsable</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="task-assignee" className="w-full">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin asignar</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="dueDate"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="task-due">Fecha límite</FieldLabel>
                  <Input {...field} id="task-due" type="date" aria-invalid={fieldState.invalid} />
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
              {isPending ? "Guardando…" : mode === "create" ? "Crear tarea" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
