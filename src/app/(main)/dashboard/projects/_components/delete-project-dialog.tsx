"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { deleteProject } from "../actions";

interface DeleteProjectDialogProps {
  projectId: string;
  projectName: string;
  /// Destino tras eliminar (p. ej. volver al listado desde el detalle).
  redirectTo?: string;
}

/// Confirmación de eliminación definitiva (FR-002): avisa del arrastre de
/// tareas antes de borrar.
export function DeleteProjectDialog({ projectId, projectName, redirectTo }: DeleteProjectDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Proyecto «${projectName}» eliminado.`);
      if (redirectTo) {
        router.push(redirectTo);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 data-icon="inline-start" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar «{projectName}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es definitiva: se eliminarán también todas las tareas asociadas al proyecto. Si solo quieres
            retirarlo de la operación, cambia su estado a «Archivado».
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Eliminando…" : "Eliminar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
