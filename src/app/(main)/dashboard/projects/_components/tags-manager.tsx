"use client";

import * as React from "react";

import { Check, Pencil, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

import { createTag, deleteTag, renameTag } from "../actions";
import type { CatalogOption } from "./types";

interface TagsManagerProps {
  tags: CatalogOption[];
}

/// Gestión de etiquetas del tenant (FR-013): crear, renombrar y eliminar.
/// Eliminar una etiqueta solo la desasocia de los proyectos.
export function TagsManager({ tags }: TagsManagerProps) {
  const [newName, setNewName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    startTransition(async () => {
      const result = await createTag({ name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Etiqueta «${result.data.name}» creada.`);
      setNewName("");
    });
  };

  const handleRename = (tagId: string) => {
    const name = editingName.trim();
    if (!name) {
      return;
    }
    startTransition(async () => {
      const result = await renameTag(tagId, { name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Etiqueta renombrada.");
      setEditingId(null);
    });
  };

  const handleDelete = (tag: CatalogOption) => {
    startTransition(async () => {
      const result = await deleteTag(tag.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Etiqueta «${tag.name}» eliminada de todos los proyectos.`);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Tags data-icon="inline-start" />
          Etiquetas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiquetas</DialogTitle>
          <DialogDescription>
            Clasifica los proyectos de tu organización. Renombrar una etiqueta la actualiza en todos los proyectos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nueva etiqueta (p. ej. Urgencias)"
            aria-label="Nombre de la nueva etiqueta"
          />
          <Button onClick={handleCreate} disabled={isPending || newName.trim() === ""}>
            Añadir
          </Button>
        </div>

        {tags.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Sin etiquetas</EmptyTitle>
              <EmptyDescription>Crea la primera etiqueta para clasificar tus proyectos.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {tags.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between gap-2 p-2 ps-3">
                {editingId === tag.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      aria-label={`Nuevo nombre para ${tag.name}`}
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRename(tag.id)}
                        disabled={isPending}
                        aria-label="Guardar nombre"
                      >
                        <Check />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancelar edición"
                      >
                        <X />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="truncate text-sm">{tag.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditingName(tag.name);
                        }}
                        aria-label={`Renombrar ${tag.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tag)}
                        disabled={isPending}
                        aria-label={`Eliminar ${tag.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
