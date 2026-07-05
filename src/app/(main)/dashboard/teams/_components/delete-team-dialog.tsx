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

import { deleteTeamAction, getTeamDeletionImpactAction } from "../actions";

interface DeleteTeamDialogProps {
  teamId: string;
  teamName: string;
  /// Destino tras eliminar (p. ej. volver al listado desde el detalle).
  redirectTo?: string;
}

/// Confirmación de eliminación (FR-015): advierte cuántas notas del equipo se
/// eliminarán en cascada. Los miembros nunca se eliminan, solo se desasocian.
export function DeleteTeamDialog({ teamId, teamName, redirectTo }: DeleteTeamDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [noteCount, setNoteCount] = React.useState<number | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      return;
    }
    setNoteCount(null);
    void getTeamDeletionImpactAction(teamId).then((result) => {
      setNoteCount(result.ok ? result.data.noteCount : 0);
    });
  };

  const impactText =
    noteCount === null
      ? "Calculando notas asociadas…"
      : noteCount === 0
        ? "Este equipo no tiene notas asociadas. Sus miembros no se eliminarán."
        : noteCount === 1
          ? "Se eliminará también 1 nota del equipo. Sus miembros no se eliminarán."
          : `Se eliminarán también ${noteCount} notas del equipo. Sus miembros no se eliminarán.`;

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTeamAction(teamId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Equipo «${teamName}» eliminado.`);
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
          <AlertDialogTitle>¿Eliminar «{teamName}»?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción es definitiva y no puede deshacerse. {impactText}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending || noteCount === null}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Eliminando…" : "Eliminar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
