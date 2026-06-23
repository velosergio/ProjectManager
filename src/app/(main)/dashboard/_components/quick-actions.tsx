import { CheckSquare, FileText, Focus, Orbit, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

const quickActions = [
  { label: "Nueva nota", icon: FileText },
  { label: "Nueva tarea", icon: CheckSquare },
  { label: "Nuevo proyecto", icon: Orbit },
  { label: "Nueva meta", icon: Focus },
  { label: "Subir archivo", icon: Upload },
] as const;

export function QuickActions() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl tracking-tight">Acciones rápidas</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {quickActions.map((action) => (
          <Button key={action.label} variant="outline" className="justify-start">
            <action.icon data-icon="inline-start" />
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
