"use client";

import * as React from "react";

import Link from "next/link";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { toggleTaskDone } from "../projects/actions";

export interface PanelTaskItem {
  id: string;
  title: string;
  done: boolean;
  dueDate: Date | null;
  overdue: boolean;
  projectId: string;
  projectName: string;
  assigneeName: string | null;
}

/// Lista interactiva de la sección «Tareas» del panel: completar persiste de
/// verdad (FR-015) y las vencidas se destacan (FR-019).
export function PanelTasksList({ tasks }: { tasks: PanelTaskItem[] }) {
  const [isPending, startTransition] = React.useTransition();

  const handleToggle = (task: PanelTaskItem, checked: boolean) => {
    startTransition(async () => {
      const result = await toggleTaskDone(task.id, checked, task.projectId);
      if (!result.ok) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-xs">
      <div className="divide-y">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-4">
            <Checkbox
              checked={task.done}
              onCheckedChange={(checked) => handleToggle(task, checked === true)}
              disabled={isPending}
              aria-label={`Completar ${task.title}`}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={cn("truncate font-medium text-sm", task.done && "text-muted-foreground line-through")}>
                {task.title}
              </span>
              <Link
                href={`/dashboard/projects/${task.projectId}`}
                className="truncate text-muted-foreground text-xs hover:underline"
              >
                {task.projectName}
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {task.overdue && <Badge variant="destructive">Vencida</Badge>}
              {task.dueDate && (
                <span
                  className={cn("text-xs tabular-nums", task.overdue ? "text-destructive" : "text-muted-foreground")}
                >
                  {format(task.dueDate, "d MMM", { locale: es })}
                </span>
              )}
              <span className="hidden text-muted-foreground text-xs sm:inline">
                {task.assigneeName ?? "Sin asignar"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
