import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const upcomingEvents = [
  {
    dayOffset: 6,
    title: "Exposición de ciencias",
    time: "08:30 - 12:30",
    type: "En campus",
  },
  {
    dayOffset: 9,
    title: "Reunión de padres",
    time: "14:00 - 17:00",
    type: "Reunión",
  },
  {
    dayOffset: 12,
    title: "Jornada deportiva",
    time: "09:00 - 16:00",
    type: "Deportes",
  },
  {
    dayOffset: 15,
    title: "Simulacro de examen grado 11",
    time: "09:00 - 12:00",
    type: "Examen",
  },
  {
    dayOffset: 18,
    title: "Planeación de departamento",
    time: "15:30 - 16:30",
    type: "Reunión",
  },
];

export function UpcomingEvents() {
  const today = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Próximos eventos (Academia)</CardTitle>
        <CardAction className="flex items-center gap-1 text-muted-foreground text-xs">
          Ver calendario <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {upcomingEvents.map((event) => {
          const eventDate = addDays(today, event.dayOffset);

          return (
            <div key={event.title} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="size-11 shrink-0 overflow-hidden rounded-sm border">
                  <div className="grid h-1/3 place-items-center border-b bg-muted font-medium text-[10px] uppercase leading-none">
                    {format(eventDate, "MMM", { locale: es })}
                  </div>
                  <div className="grid h-2/3 place-items-center text-lg leading-none">{format(eventDate, "d")}</div>
                </div>

                <div className="flex min-w-0 flex-col gap-1">
                  <div className="truncate font-medium text-sm leading-none">{event.title}</div>
                  <div className="text-muted-foreground text-xs leading-none">{event.time}</div>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 rounded-md px-2.5 py-1 font-medium text-[10px]">
                {event.type}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
