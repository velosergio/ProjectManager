"use client";

import * as React from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { TASK_STATUS_LABELS } from "@/lib/projects/labels";
import { cn } from "@/lib/utils";

import type { CatalogOption, TaskRow } from "../../_components/types";
import { deleteTask, toggleTaskDone } from "../../actions";
import { TaskFormDialog } from "./task-form-dialog";

interface TaskListProps {
  projectId: string;
  tasks: TaskRow[];
  members: CatalogOption[];
  canManage: boolean;
}

/// Lista de tareas del proyecto (FR-009/FR-019): completar con persistencia
/// real, vencidas destacadas y estados vacíos accionables.
export function TaskList({ projectId, tasks, members, canManage }: TaskListProps) {
  const [isPending, startTransition] = React.useTransition();

  const handleToggle = (task: TaskRow, checked: boolean) => {
    startTransition(async () => {
      const result = await toggleTaskDone(task.id, checked, projectId);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  const handleDelete = (task: TaskRow) => {
    startTransition(async () => {
      const result = await deleteTask(projectId, task.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Tarea «${task.title}» eliminada.`);
    });
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-tight">Tareas</h2>
        {canManage && <TaskFormDialog projectId={projectId} members={members} />}
      </div>

      {tasks.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Este proyecto aún no tiene tareas</EmptyTitle>
            <EmptyDescription>Divide el trabajo en tareas para poder hacer seguimiento del avance.</EmptyDescription>
          </EmptyHeader>
          {canManage && (
            <EmptyContent>
              <TaskFormDialog projectId={projectId} members={members} triggerLabel="Crear la primera tarea" />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
          <div className="divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-4">
                <Checkbox
                  checked={task.status === "DONE"}
                  onCheckedChange={(checked) => handleToggle(task, checked === true)}
                  disabled={!canManage || isPending}
                  aria-label={`Completar ${task.title}`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "truncate font-medium text-sm",
                      task.status === "DONE" && "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </span>
                  {task.description && (
                    <span className="truncate text-muted-foreground text-xs">{task.description}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {task.overdue && (
                    <Badge variant="destructive">
                      <CalendarClock data-icon="inline-start" />
                      Vencida
                    </Badge>
                  )}
                  <Badge variant="outline">{TASK_STATUS_LABELS[task.status]}</Badge>
                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        task.overdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {format(task.dueDate, "d MMM", { locale: es })}
                    </span>
                  )}
                  <span className="hidden text-muted-foreground text-xs sm:inline">
                    {task.assignee?.name ?? "Sin asignar"}
                  </span>
                  {canManage && (
                    <>
                      <TaskFormDialog projectId={projectId} task={task} members={members} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(task)}
                        disabled={isPending}
                        aria-label={`Eliminar ${task.title}`}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
