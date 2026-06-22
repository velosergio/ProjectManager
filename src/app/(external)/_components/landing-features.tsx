import type { LucideIcon } from "lucide-react";
import { BellRing, CalendarDays, FileText, GanttChart, History, KanbanSquare, LayoutDashboard } from "lucide-react";

import { Reveal } from "./reveal";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: KanbanSquare,
    title: "Kanban",
    description: "Tableros con drag & drop, swimlanes, filtros y asignación de responsables.",
  },
  {
    icon: GanttChart,
    title: "Gantt",
    description: "Planeación temporal con dependencias, duración, hitos y reprogramación.",
  },
  {
    icon: CalendarDays,
    title: "Calendario",
    description: "Vista mensual y agenda con eventos de inicio, cierre, pagos y actuaciones.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard ejecutivo",
    description: "KPIs de operación y gestión: vencimientos, carga por usuario y prioridades.",
  },
  {
    icon: FileText,
    title: "Gestión documental",
    description: "Subida de archivos, versionado, adjuntos por proyecto e historial completo.",
  },
  {
    icon: History,
    title: "Bitácora y auditoría",
    description: "Trazabilidad de cada acción: quién, qué, cuándo y sobre qué entidad.",
  },
  {
    icon: BellRing,
    title: "Recordatorios",
    description: "Alertas por email y push para vencimientos, pagos y próximas actuaciones.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-semibold text-4xl tracking-tight">Todo lo que tu equipo necesita</h2>
          <p className="mt-4 text-pretty text-zinc-400">
            Un único espacio para planear, ejecutar y dar seguimiento, sin saltar entre herramientas dispersas.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 0.08}>
              <article className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-violet-300 ring-1 ring-violet-400/20 transition-colors group-hover:text-violet-200">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-medium text-lg">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
