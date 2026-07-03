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

import { deleteClient, getClientDeletionImpact } from "../actions";

interface DeleteClientDialogProps {
  clientId: string;
  clientName: string;
  /// Destino tras eliminar (p. ej. volver al listado desde el detalle).
  redirectTo?: string;
}

/// Confirmación de eliminación (FR-005): advierte cuántos proyectos quedarán
/// «sin cliente». Los proyectos nunca se eliminan, solo se desvinculan.
export function DeleteClientDialog({ clientId, clientName, redirectTo }: DeleteClientDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [projectCount, setProjectCount] = React.useState<number | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      return;
    }
    setProjectCount(null);
    void getClientDeletionImpact(clientId).then((result) => {
      setProjectCount(result.ok ? result.data.projectCount : 0);
    });
  };

  const impactText =
    projectCount === null
      ? "Calculando proyectos vinculados…"
      : projectCount === 0
        ? "Este cliente no tiene proyectos vinculados."
        : projectCount === 1
          ? "1 proyecto quedará sin cliente (no se eliminará)."
          : `${projectCount} proyectos quedarán sin cliente (no se eliminarán).`;

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteClient(clientId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Cliente «${clientName}» eliminado.`);
      if (redirectTo) {
        router.push(redirectTo);
      }
    });
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 data-icon="inline-start" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar «{clientName}»?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción es definitiva y no puede deshacerse. {impactText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || projectCount === null}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Eliminando…" : "Eliminar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
