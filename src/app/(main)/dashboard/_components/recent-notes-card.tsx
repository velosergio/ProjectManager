import { format, isToday, isYesterday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { BookOpen, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const today = new Date();

function formatNoteDate(date: Date) {
  if (isToday(date)) return "Hoy";
  if (isYesterday(date)) return "Ayer";
  return format(date, "d 'de' MMM", { locale: es });
}

const recentNotes = [
  { title: "Principios de diseño que escalan", date: formatNoteDate(today), icon: FileText },
  {
    title: `Ideas de contenido – ${format(today, "MMMM", { locale: es })}`,
    date: formatNoteDate(subDays(today, 1)),
    icon: FileText,
  },
  { title: "Aprendizajes de la semana", date: formatNoteDate(subDays(today, 4)), icon: FileText },
  { title: "Libros que estoy leyendo", date: formatNoteDate(subDays(today, 5)), icon: BookOpen },
] as const;

export function RecentNotesCard() {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>Notas recientes</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Ver todas
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {recentNotes.map((note) => (
          <div key={note.title} className="flex items-start gap-4">
            <note.icon className="size-5 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate font-medium text-sm leading-none">{note.title}</div>
              <div className="text-muted-foreground text-xs">{note.date}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
