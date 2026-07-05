import { Suspense } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { findRecentNotes } from "@/lib/notes/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

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
import { toNoteListItem } from "./notes/_components/mappers";
import type { NoteListItem } from "./notes/_components/types";

/// Devuelve el saludo apropiado según la hora del día.
function obtenerSaludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

const SKELETON_SLOTS = ["uno", "dos", "tres"] as const;

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-40" />
      <div className="grid gap-4 md:grid-cols-3">
        {SKELETON_SLOTS.slice(0, rows).map((slot) => (
          <Skeleton key={slot} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, authSession, params] = await Promise.all([getTenantContext(), auth(), searchParams]);
  const nombre = authSession?.user?.name?.split(" ")[0] ?? "";
  const saludo = nombre ? `${obtenerSaludo()}, ${nombre}.` : `${obtenerSaludo()}.`;

  const pstatus = typeof params.pstatus === "string" ? params.pstatus : undefined;
  const trange = typeof params.trange === "string" ? params.trange : undefined;

  // Notas recientes reales para el widget (FR-024): las 4 últimas del tenant.
  let recentNotes: NoteListItem[] = [];
  if (session?.tenantId) {
    const db = await getTenantDb();
    const recent = await findRecentNotes(db);
    recentNotes = recent.map((note) => toNoteListItem(note, { userId: session.userId, role: session.role }));
  }

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

            {session?.tenantId ? (
              <>
                <Suspense fallback={<SectionSkeleton />}>
                  <SummaryCards userId={session.userId} />
                </Suspense>
                <Suspense fallback={<SectionSkeleton rows={1} />}>
                  <TasksSection userId={session.userId} rangeParam={trange} />
                </Suspense>
                <Suspense fallback={<SectionSkeleton />}>
                  <ProjectsSection statusParam={pstatus} />
                </Suspense>
              </>
            ) : (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyTitle>Sin organización activa</EmptyTitle>
                  <EmptyDescription>
                    {session?.role === "MANGO"
                      ? "Selecciona una organización desde la consola mango para ver sus proyectos y tareas."
                      : "Tu sesión no tiene una organización asociada."}
                  </EmptyDescription>
                </EmptyHeader>
                {session?.role === "MANGO" && (
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/dashboard/mango">Ir a la consola mango</Link>
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            )}

            <QuickActions />
            <QuoteCard />
          </div>
        </section>

        <section className="flex flex-col gap-6 lg:col-span-3">
          <CalendarPanel />
          <FocusCard />
          <RecentNotesCard notes={recentNotes} />
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
