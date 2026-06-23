import { auth } from "@/lib/auth";

import { CalendarPanel } from "./_components/calendar-panel";
import { FocusCard } from "./_components/focus-card";
import { ProjectsSection } from "./_components/projects-section";
import { QuickActions } from "./_components/quick-actions";
import { QuoteCard } from "./_components/quote-card";
import { RecentNotesCard } from "./_components/recent-notes-card";
import { SummaryCards } from "./_components/summary-cards";
import { TasksSection } from "./_components/tasks-section";
import { WeeklySummaryCard } from "./_components/weekly-summary-card";

/// Devuelve el saludo apropiado según la hora del día.
function obtenerSaludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function Page() {
  const session = await auth();
  const nombre = session?.user?.name?.split(" ")[0] ?? "";
  const saludo = nombre ? `${obtenerSaludo()}, ${nombre}.` : `${obtenerSaludo()}.`;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="lg:col-span-9">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl text-foreground leading-none tracking-tight">{saludo}</h1>
            <p className="text-lg text-muted-foreground leading-none">
              Hagamos que hoy sea un día productivo y con sentido.
            </p>
          </div>
          <SummaryCards />
          <TasksSection />
          <ProjectsSection />
          <QuickActions />
          <QuoteCard />
        </div>
      </section>

      <section className="flex flex-col gap-6 lg:col-span-3">
        <CalendarPanel />
        <FocusCard />
        <RecentNotesCard />
        <WeeklySummaryCard />
      </section>
    </div>
  );
}
