"use client";

import * as React from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { DeleteNoteDialog } from "../../../notes/_components/delete-note-dialog";
import { NoteFormDialog } from "../../../notes/_components/note-form-dialog";
import { listTaskNotesAction } from "../../../notes/actions";

interface TaskNotesSheetProps {
  tenantId: string;
  taskId: string;
  taskTitle: string;
  canCreate: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

/// Notas de una tarea en un Sheet lateral (FR-022, research D7): la tarea no
/// tiene página propia, así que sus notas se consultan y crean sin salir del
/// detalle del proyecto (TanStack Query + Server Action).
export function TaskNotesSheet({ tenantId, taskId, taskTitle, canCreate }: TaskNotesSheetProps) {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const notesKey = [tenantId, "notes", "task", taskId] as const;

  const notesQuery = useQuery({
    queryKey: notesKey,
    queryFn: async () => {
      const result = await listTaskNotesAction(taskId);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: open,
  });

  const invalidateNotes = () => void queryClient.invalidateQueries({ queryKey: notesKey });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notas de ${taskTitle}`}>
          <StickyNote />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notas de la tarea</SheetTitle>
          <SheetDescription className="truncate">{taskTitle}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-4">
          {canCreate && (
            <NoteFormDialog
              mode="create"
              fixedContext={{ scope: "TASK", referenceId: taskId, label: `la tarea «${taskTitle}»` }}
              triggerLabel="Nueva nota"
              onSaved={invalidateNotes}
            />
          )}

          {notesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : notesQuery.isError ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">No se pudieron cargar las notas.</p>
              <Button variant="outline" size="sm" onClick={() => void notesQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : notesQuery.data.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">
              Esta tarea aún no tiene notas.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {notesQuery.data.map((note) => (
                <li key={note.id} className="rounded-xl border bg-background p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium text-sm">{note.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {note.authorName ?? "Autor eliminado"} · {dateFormatter.format(note.updatedAt)}
                      </p>
                    </div>
                    {note.canModify && (
                      <div className="flex shrink-0 items-center">
                        <NoteFormDialog
                          mode="edit"
                          note={{ id: note.id, title: note.title, content: note.content }}
                          onSaved={invalidateNotes}
                        />
                        <DeleteNoteDialog noteId={note.id} noteTitle={note.title} onDeleted={invalidateNotes} />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-muted-foreground text-sm">{note.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
