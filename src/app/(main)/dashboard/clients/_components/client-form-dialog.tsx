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

import { createClient, createTagForClient, updateClient } from "../actions";
import type { ClientListRow, TagOption } from "./types";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  email: z
    .string()
    .trim()
    .max(254, "El email es demasiado largo.")
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "El email no tiene un formato válido.",
    }),
  phone: z.string().trim().max(30, "El teléfono no puede superar los 30 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

function toFormValues(client?: ClientListRow): FormValues {
  return {
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
  };
}

interface ClientFormDialogProps {
  mode: "create" | "edit";
  client?: ClientListRow;
  tags: TagOption[];
  triggerLabel?: string;
}

/// Alta y edición de clientes (FR-002/FR-004): solo el nombre es obligatorio.
/// Las etiquetas usan el catálogo único del tenant (FR-011), con creación al
/// vuelo desde el propio asignador.
export function ClientFormDialog({ mode, client, tags, triggerLabel }: ClientFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [tagOptions, setTagOptions] = React.useState<TagOption[]>(tags);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>(client?.tags.map((tag) => tag.id) ?? []);
  const [newTagName, setNewTagName] = React.useState("");
  const [creatingTag, setCreatingTag] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toFormValues(client),
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      form.reset(toFormValues(client));
      setSelectedTagIds(client?.tags.map((tag) => tag.id) ?? []);
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
    const result = await createTagForClient({ name });
    setCreatingTag(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setTagOptions((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name, "es")));
    setSelectedTagIds((prev) => [...prev, result.data.id]);
    setNewTagName("");
    toast.success(`Etiqueta «${result.data.name}» creada.`);
  };

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        tagIds: selectedTagIds,
      };
      const result = mode === "create" ? await createClient(payload) : await updateClient(client?.id ?? "", payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Cliente creado." : "Cliente actualizado.");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus data-icon="inline-start" />
            {triggerLabel ?? "Nuevo cliente"}
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
          <DialogTitle>{mode === "create" ? "Nuevo cliente" : "Editar cliente"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Solo el nombre es obligatorio; email y teléfono pueden completarse después."
              : "Modifica los datos del cliente y guarda los cambios."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-name">Nombre</FieldLabel>
                  <Input
                    {...field}
                    id="client-name"
                    placeholder="Nombre del contacto o empresa"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="client-email"
                    type="email"
                    placeholder="contacto@empresa.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="client-phone">Teléfono</FieldLabel>
                  <Input
                    {...field}
                    id="client-phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Field className="gap-1.5">
              <FieldLabel asChild>
                <span id="client-tags-label">Etiquetas</span>
              </FieldLabel>
              {tagOptions.length > 0 && (
                <fieldset className="flex flex-wrap gap-1.5" aria-labelledby="client-tags-label">
                  {tagOptions.map((tag) => {
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
              {isPending ? "Guardando…" : mode === "create" ? "Crear cliente" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
