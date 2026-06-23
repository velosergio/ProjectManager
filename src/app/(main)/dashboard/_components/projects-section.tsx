import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { ClipboardCheck, Globe, Orbit, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const today = new Date();

const projects = [
  {
    title: "Hoja de ruta Q2",
    status: "En progreso",
    description: "Entregar mejor y de forma más inteligente.",
    progress: 68,
    due: `Vence el ${format(addDays(today, 9), "d 'de' MMM", { locale: es })}`,
    icon: Orbit,
  },
  {
    title: "Rediseño del sitio web",
    status: "Planificación",
    description: "Limpio, moderno y rápido.",
    progress: 42,
    due: `Vence el ${format(addDays(today, 21), "d 'de' MMM", { locale: es })}`,
    icon: Globe,
  },
  {
    title: "Incorporación",
    status: "Planificación",
    description: "Reducir los pasos iniciales.",
    progress: 31,
    due: `Vence el ${format(addDays(today, 18), "d 'de' MMM", { locale: es })}`,
    icon: ClipboardCheck,
  },
] as const;

export function ProjectsSection() {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">Proyectos</h2>
        <div className="flex items-center gap-2">
          <Select defaultValue="active">
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Activos" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="planning">Planificación</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Plus data-icon="inline-start" />
            Nuevo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.title} className="shadow-xs">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <project.icon className="size-4 text-muted-foreground" />
                  <span>{project.title}</span>
                </div>
              </CardTitle>
              <CardAction>
                <Badge variant="outline">{project.status}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <div className="text-sm leading-none">{project.description}</div>
                <div className="flex items-center gap-3">
                  <Progress value={project.progress} className="h-2" />
                  <span className="shrink-0 text-sm">{project.progress}%</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="py-2.5">
              <span className="text-muted-foreground">{project.due}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
