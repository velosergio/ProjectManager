import Link from "next/link";

import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { NoteListItem } from "../notes/_components/types";

/// Fecha relativa corta para el widget (Hoy/Ayer/«d de MMM»).
function formatNoteDate(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' MMM", { locale: es });
}

/// Widget «Notas recientes» del panel (FR-024): las 4 últimas notas reales
/// del tenant con enlace a su contexto, estado vacío con CTA y acceso al
/// listado central. Sin contenido demo (US5).
export function RecentNotesCard({ notes }: { readonly notes: NoteListItem[] }) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Notas recientes</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/dashboard/notes">Ver todas</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <FileText className="size-5 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Aún no hay notas en tu organización.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/notes">Crear la primera nota</Link>
            </Button>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex items-start gap-4">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <Link
                  href={note.context?.href ?? "/dashboard/notes"}
                  className="block truncate font-medium text-sm leading-none hover:underline"
                >
                  {note.title}
                </Link>
                <div className="mt-1 text-muted-foreground text-xs">
                  {formatNoteDate(note.updatedAt)}
                  {note.context ? ` · ${note.context.label}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
