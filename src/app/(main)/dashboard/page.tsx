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
import { AcademyHighlights } from "./_components/widgets/academy/academy-highlights";
import { AssignmentStatus } from "./_components/widgets/academy/assignment-status";
import { ClassSchedule } from "./_components/widgets/academy/class-schedule";
import { PerformanceHighlights } from "./_components/widgets/academy/performance-highlights";
import { UpcomingEvents } from "./_components/widgets/academy/upcoming-events";
import { TrafficSources } from "./_components/widgets/analytics/traffic-sources";
import { MeetingsAndGoal } from "./_components/widgets/crm/meetings-and-goal";
import { RecentOpportunities } from "./_components/widgets/crm/recent-opportunities";
import { AccountAllocation } from "./_components/widgets/finance/account-allocation";
import { Shortcuts } from "./_components/widgets/finance/shortcuts";
import { SpendingOverview } from "./_components/widgets/finance/spending-overview";

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
    <div className="flex flex-col gap-6">
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

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl text-foreground leading-none tracking-tight">Negocio</h2>
        <MeetingsAndGoal />
        <RecentOpportunities />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl text-foreground leading-none tracking-tight">Finanzas</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <SpendingOverview />
          </div>
          <div className="xl:col-span-5">
            <AccountAllocation />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <Shortcuts />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl text-foreground leading-none tracking-tight">Analítica</h2>
        <TrafficSources />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl text-foreground leading-none tracking-tight">Academia</h2>
        <AcademyHighlights />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <ClassSchedule />
          </div>
          <div className="xl:col-span-7">
            <AssignmentStatus />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <PerformanceHighlights />
          </div>
          <div className="xl:col-span-4">
            <UpcomingEvents />
          </div>
        </div>
      </section>
    </div>
  );
}
