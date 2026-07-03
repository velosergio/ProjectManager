import Link from "next/link";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getPanelTasks, type PanelTaskRange } from "@/lib/projects/queries";
import { getTenantDb } from "@/lib/tenant-db-session";

import { PanelFilterSelect } from "./panel-filter-select";
import { PanelTasksList } from "./panel-tasks-list";

const RANGE_OPTIONS = [
  { value: "today", label: "Hoy" },
  { value: "tomorrow", label: "Mañana" },
  { value: "week", label: "Esta semana" },
];

function parseRange(value?: string): PanelTaskRange {
  return value === "tomorrow" || value === "week" ? value : "today";
}

/// Sección «Tareas» del panel: tareas reales asignadas al usuario actual o sin
/// responsable, según el filtro temporal (FR-015).
export async function TasksSection({ userId, rangeParam }: { userId: string; rangeParam?: string }) {
  const range = parseRange(rangeParam);
  const db = await getTenantDb();
  const tasks = await getPanelTasks(db, userId, range);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">Tareas</h2>
        <div className="flex items-center gap-2">
          <PanelFilterSelect
            paramKey="trange"
            value={range}
            options={RANGE_OPTIONS}
            ariaLabel="Filtrar tareas por rango temporal"
            className="w-36"
          />
          <Button asChild>
            <Link href="/dashboard/projects">
              <Plus data-icon="inline-start" />
              Nueva tarea
            </Link>
          </Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Nada pendiente en este rango</EmptyTitle>
            <EmptyDescription>
              Las tareas que te asignen (o sin responsable) con fecha en este rango aparecerán aquí.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/projects">Ir a proyectos para crear una tarea</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <PanelTasksList
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            done: task.status === "DONE",
            dueDate: task.dueDate,
            overdue: task.overdue,
            projectId: task.project.id,
            projectName: task.project.name,
            assigneeName: task.assignee?.name ?? null,
          }))}
        />
      )}
    </section>
  );
}
