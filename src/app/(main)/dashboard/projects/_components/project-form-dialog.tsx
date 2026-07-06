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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCalendarDate } from "@/lib/format-date";
import {
  PROJECT_PRIORITY_LABELS,
  PROJECT_PRIORITY_ORDER,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from "@/lib/projects/labels";

import { createClientInline, createProcessType, createProject, createTag, updateProject } from "../actions";
import type { CatalogOption, FormCatalogs, ProjectRow } from "./types";

/// Sentinela para "sin selección" (Radix Select no admite value="").
const NONE = "none";
/// Sentinela del selector de cliente que abre el subdiálogo de alta (US5 de
/// FASE 3): nunca llega al estado del formulario.
const CREATE_CLIENT = "__create-client__";

/// Estado local del subdiálogo «Crear cliente…» (independiente del RHF del
/// proyecto: cancelar o fallar no toca el formulario).
const EMPTY_NEW_CLIENT = { name: "", email: "", phone: "" };

const formSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(200, "El nombre no puede superar los 200 caracteres."),
    description: z.string().trim().max(5000, "La descripción es demasiado larga."),
    clientId: z.string(),
    ownerId: z.string(),
    processTypeId: z.string(),
    status: z.enum(["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "ARCHIVED"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "La fecha de cierre no puede ser anterior a la fecha de inicio.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof formSchema>;

function toFormValues(project?: ProjectRow): FormValues {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    clientId: project?.client?.id ?? NONE,
    ownerId: project?.owner?.id ?? NONE,
    processTypeId: project?.processType?.id ?? NONE,
    status: project?.status ?? "PENDING",
    priority: project?.priority ?? "MEDIUM",
    startDate: project?.startDate ? formatCalendarDate(project.startDate, "yyyy-MM-dd") : "",
    endDate: project?.endDate ? formatCalendarDate(project.endDate, "yyyy-MM-dd") : "",
  };
}

interface ProjectFormDialogProps {
  mode: "create" | "edit";
  project?: ProjectRow;
  catalogs: FormCatalogs;
  canManageCatalogs: boolean;
  triggerLabel?: string;
}

export function ProjectFormDialog({
  mode,
  project,
  catalogs,
  canManageCatalogs,
  triggerLabel,
}: ProjectFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [processTypes, setProcessTypes] = React.useState<CatalogOption[]>(catalogs.processTypes);
  const [newTypeName, setNewTypeName] = React.useState("");
  const [creatingType, setCreatingType] = React.useState(false);
  const [tags, setTags] = React.useState<CatalogOption[]>(catalogs.tags);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(project?.tags.map((tag) => tag.id) ?? []);
  const [newTagName, setNewTagName] = React.useState("");
  const [creatingTag, setCreatingTag] = React.useState(false);
  const [clientOptions, setClientOptions] = React.useState<CatalogOption[]>(catalogs.clients);
  const [clientDialogOpen, setClientDialogOpen] = React.useState(false);
  const [newClient, setNewClient] = React.useState(EMPTY_NEW_CLIENT);
  const [creatingClient, setCreatingClient] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(project),
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset(toFormValues(project));
      setSelectedTagIds(project?.tags.map((tag) => tag.id) ?? []);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      return;
    }
    setCreatingTag(true);
    const result = await createTag({ name });
    setCreatingTag(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTags((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
    setSelectedTagIds((prev) => [...prev, result.data.id]);
    setNewTagName("");
    toast.success(`Etiqueta «${result.data.name}» creada.`);
  };

  /// Alta al vuelo (US5 de FASE 3): crea el cliente, lo añade a la lista local
  /// y lo deja seleccionado. El estado RHF del proyecto no se toca en ningún
  /// otro campo; cancelar cierra el subdiálogo sin efectos.
  const handleCreateClient = async () => {
    if (newClient.name.trim() === "") {
      return;
    }
    setCreatingClient(true);
    const result = await createClientInline(newClient);
    setCreatingClient(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setClientOptions((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
    form.setValue("clientId", result.data.id);
    setNewClient(EMPTY_NEW_CLIENT);
    setClientDialogOpen(false);
    toast.success(`Cliente «${result.data.name}» creado y seleccionado.`);
  };

  const handleCreateType = async () => {
    const name = newTypeName.trim();
    if (!name) {
      return;
    }
    setCreatingType(true);
    const result = await createProcessType({ name });
    setCreatingType(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setProcessTypes((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
    form.setValue("processTypeId", result.data.id);
    setNewTypeName("");
    toast.success(`Tipo «${result.data.name}» creado.`);
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        name: values.name,
        description: values.description || null,
        clientId: values.clientId === NONE ? "" : values.clientId,
        ownerId: values.ownerId === NONE ? "" : values.ownerId,
        processTypeId: values.processTypeId === NONE ? "" : values.processTypeId,
        status: values.status,
        priority: values.priority,
        startDate: values.startDate,
        endDate: values.endDate,
        tagIds: selectedTagIds,
      };
      const result = mode === "create" ? await createProject(payload) : await updateProject(project?.id ?? "", payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Proyecto creado." : "Proyecto actualizado.");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus data-icon="inline-start" />
            {triggerLabel ?? "Nuevo proyecto"}
          </Button>
        ) : (
          <Button variant="ghost" size="sm">
            <Pencil data-icon="inline-start" />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo proyecto" : "Editar proyecto"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Solo el nombre es obligatorio; el resto puede completarse después."
              : "Modifica los datos del proyecto y guarda los cambios."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-name">Nombre</FieldLabel>
                  <Input
                    {...field}
                    id="project-name"
                    placeholder="Nombre del proyecto"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-description">Descripción</FieldLabel>
                  <Textarea
                    {...field}
                    id="project-description"
                    placeholder="Objetivo o contexto del proyecto"
                    rows={3}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="project-client">Cliente</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        // La opción de alta abre el subdiálogo sin tocar el valor.
                        if (value === CREATE_CLIENT) {
                          setClientDialogOpen(true);
                          return;
                        }
                        field.onChange(value);
                      }}
                    >
                      <SelectTrigger id="project-client" className="w-full">
                        <SelectValue placeholder="Sin cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin cliente</SelectItem>
                        {clientOptions.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                        {canManageCatalogs && <SelectItem value={CREATE_CLIENT}>Crear cliente…</SelectItem>}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="project-owner">Responsable</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="project-owner" className="w-full">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sin asignar</SelectItem>
                        {catalogs.members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="project-status">Estado</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="project-status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUS_ORDER.map((status) => (
                          <SelectItem key={status} value={status}>
                            {PROJECT_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="project-priority">Prioridad</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="project-priority" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_PRIORITY_ORDER.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PROJECT_PRIORITY_LABELS[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="project-start">Fecha de inicio</FieldLabel>
                    <Input {...field} id="project-start" type="date" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="project-end">Fecha de cierre estimada</FieldLabel>
                    <Input {...field} id="project-end" type="date" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              control={form.control}
              name="processTypeId"
              render={({ field }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="project-type">Tipo de proceso</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="project-type" className="w-full">
                      <SelectValue placeholder="Sin tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin tipo</SelectItem>
                      {processTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {canManageCatalogs && (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newTypeName}
                        onChange={(event) => setNewTypeName(event.target.value)}
                        placeholder="Nuevo tipo (p. ej. Consultoría)"
                        aria-label="Nombre del nuevo tipo de proceso"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCreateType}
                        disabled={creatingType || newTypeName.trim() === ""}
                      >
                        {creatingType ? "Añadiendo…" : "Añadir"}
                      </Button>
                    </div>
                  )}
                </Field>
              )}
            />
            <Field className="gap-1.5">
              <FieldLabel asChild>
                <span id="project-tags-label">Etiquetas</span>
              </FieldLabel>
              {tags.length > 0 && (
                <fieldset className="flex flex-wrap gap-1.5" aria-labelledby="project-tags-label">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        aria-pressed={selected}
                        className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <Badge variant={selected ? "default" : "outline"}>{tag.name}</Badge>
                      </button>
                    );
                  })}
                </fieldset>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="Nueva etiqueta"
                  aria-label="Nombre de la nueva etiqueta"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateTag}
                  disabled={creatingTag || newTagName.trim() === ""}
                >
                  {creatingTag ? "Añadiendo…" : "Añadir"}
                </Button>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : mode === "create" ? "Crear proyecto" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>

        {/* Subdiálogo de alta de cliente (US5 de FASE 3): overlay hermano, el
            formulario del proyecto sigue montado y conserva todo su estado. */}
        <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear cliente</DialogTitle>
              <DialogDescription>
                Alta rápida: solo el nombre es obligatorio. El cliente quedará seleccionado en el proyecto.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="gap-4">
              <Field className="gap-1.5">
                <FieldLabel htmlFor="inline-client-name">Nombre</FieldLabel>
                <Input
                  id="inline-client-name"
                  value={newClient.name}
                  onChange={(event) => setNewClient((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nombre del contacto o empresa"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="inline-client-email">Email</FieldLabel>
                <Input
                  id="inline-client-email"
                  type="email"
                  value={newClient.email}
                  onChange={(event) => setNewClient((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="contacto@empresa.com"
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="inline-client-phone">Teléfono</FieldLabel>
                <Input
                  id="inline-client-phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(event) => setNewClient((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+57 300 123 4567"
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClientDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateClient}
                disabled={creatingClient || newClient.name.trim() === ""}
              >
                {creatingClient ? "Creando…" : "Crear y seleccionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
