"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DeleteNoteDialog } from "./delete-note-dialog";
import { type FixedNoteContext, NoteFormDialog } from "./note-form-dialog";
import type { NoteListItem } from "./types";

interface NotesSectionProps {
  title: string;
  notes: NoteListItem[];
  canCreate: boolean;
  fixedContext: FixedNoteContext;
  emptyText: string;
}

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

/// Sección de notas embebida en un contexto (proyecto/equipo, FR-022): lista
/// de la más reciente a la más antigua y creación con alcance auto-vinculado.
export function NotesSection({ title, notes, canCreate, fixedContext, emptyText }: NotesSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">{title}</h2>
        {canCreate && <NoteFormDialog mode="create" fixedContext={fixedContext} triggerLabel="Nueva nota" />}
      </div>

      {notes.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <div className="grid gap-3">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-base">{note.title}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {note.authorName ?? "Autor eliminado"} · {dateFormatter.format(note.updatedAt)}
                  </p>
                </div>
                {note.canModify && (
                  <div className="flex shrink-0 items-center gap-1">
                    <NoteFormDialog mode="edit" note={{ id: note.id, title: note.title, content: note.content }} />
                    <DeleteNoteDialog noteId={note.id} noteTitle={note.title} />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground text-sm">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
