"use client";

import * as React from "react";

import { Check, Pencil, Settings2, Trash2, X } from "lucide-react";
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

import { createProcessType, deleteProcessType, renameProcessType } from "../actions";
import type { CatalogOption } from "./types";

interface ProcessTypesManagerProps {
  processTypes: CatalogOption[];
}

/// Gestión del catálogo de tipos de proceso del tenant (FR-021). El acceso ya
/// viene gateado por rol desde el servidor (solo ADMIN/MANAGER lo montan).
export function ProcessTypesManager({ processTypes }: ProcessTypesManagerProps) {
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
      const result = await createProcessType({ name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tipo «${result.data.name}» creado.`);
      setNewName("");
    });
  };

  const handleRename = (typeId: string) => {
    const name = editingName.trim();
    if (!name) {
      return;
    }
    startTransition(async () => {
      const result = await renameProcessType(typeId, { name });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tipo renombrado.");
      setEditingId(null);
    });
  };

  const handleDelete = (type: CatalogOption) => {
    startTransition(async () => {
      const result = await deleteProcessType(type.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tipo «${type.name}» eliminado. Los proyectos que lo usaban quedan sin tipo.`);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 data-icon="inline-start" />
          Tipos de proceso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipos de proceso</DialogTitle>
          <DialogDescription>
            Catálogo propio de tu organización. Al eliminar un tipo en uso, los proyectos afectados quedan «sin tipo».
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nuevo tipo (p. ej. Ordinario laboral)"
            aria-label="Nombre del nuevo tipo de proceso"
          />
          <Button onClick={handleCreate} disabled={isPending || newName.trim() === ""}>
            Añadir
          </Button>
        </div>

        {processTypes.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>Catálogo vacío</EmptyTitle>
              <EmptyDescription>Crea el primer tipo de proceso para clasificar tus proyectos.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {processTypes.map((type) => (
              <li key={type.id} className="flex items-center justify-between gap-2 p-2 ps-3">
                {editingId === type.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      aria-label={`Nuevo nombre para ${type.name}`}
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRename(type.id)}
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
                    <span className="truncate text-sm">{type.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(type.id);
                          setEditingName(type.name);
                        }}
                        aria-label={`Renombrar ${type.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(type)}
                        disabled={isPending}
                        aria-label={`Eliminar ${type.name}`}
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
