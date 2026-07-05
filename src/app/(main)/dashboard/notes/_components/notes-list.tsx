"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

import { DeleteNoteDialog } from "./delete-note-dialog";
import { NoteFormDialog } from "./note-form-dialog";
import { NOTE_SCOPE_LABELS, type NoteListItem } from "./types";

interface NotesListProps {
  notes: NoteListItem[];
  page: number;
  pageCount: number;
  hasFilters: boolean;
  /// Término buscado, para el estado vacío con contexto (FR-021).
  searchTerm?: string;
}

const dateFormatter = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

function pageHref(pathname: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `${pathname}?${next.toString()}`;
}

/// Listado central de notas (FR-021): tarjetas con autor, fecha, alcance y
/// contexto enlazado; acciones de edición/eliminación según permisos ya
/// resueltos en el servidor.
export function NotesList({ notes, page, pageCount, hasFilters, searchTerm }: NotesListProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (notes.length === 0 && hasFilters) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Sin resultados</EmptyTitle>
          <EmptyDescription>
            {searchTerm
              ? `Ninguna nota coincide con «${searchTerm}» y los filtros aplicados.`
              : "Ninguna nota coincide con los filtros aplicados."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href={pathname}>Limpiar filtros</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <CardTitle className="truncate">{note.title}</CardTitle>
                <p className="text-muted-foreground text-xs">
                  {note.authorName ?? "Autor eliminado"} · {dateFormatter.format(note.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{NOTE_SCOPE_LABELS[note.scope]}</Badge>
                {note.context && (
                  <Badge variant="outline" asChild>
                    <Link href={note.context.href}>{note.context.label}</Link>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <p className="line-clamp-3 whitespace-pre-line text-muted-foreground text-sm">{note.content}</p>
              {note.canModify && (
                <div className="flex shrink-0 items-center gap-1">
                  <NoteFormDialog mode="edit" note={{ id: note.id, title: note.title, content: note.content }} />
                  <DeleteNoteDialog noteId={note.id} noteTitle={note.title} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm tabular-nums">
            Página {page} de {pageCount}
          </p>
          <div className="flex items-center gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(pathname, searchParams, page - 1)}>Anterior</Link>
              </Button>
            )}
            {page >= pageCount ? (
              <Button variant="outline" size="sm" disabled>
                Siguiente
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(pathname, searchParams, page + 1)}>Siguiente</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
