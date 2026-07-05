"use client";

import * as React from "react";

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

import { deleteNoteAction } from "../actions";

interface DeleteNoteDialogProps {
  noteId: string;
  noteTitle: string;
  /// Callback tras eliminar con éxito (además del refresco RSC).
  onDeleted?: () => void;
}

/// Confirmación de eliminación de una nota (FR-019).
export function DeleteNoteDialog({ noteId, noteTitle, onDeleted }: DeleteNoteDialogProps) {
  const [isPending, startTransition] = React.useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteNoteAction(noteId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Nota «${noteTitle}» eliminada.`);
      onDeleted?.();
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
          <AlertDialogTitle>¿Eliminar «{noteTitle}»?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción es definitiva y no puede deshacerse.</AlertDialogDescription>
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
