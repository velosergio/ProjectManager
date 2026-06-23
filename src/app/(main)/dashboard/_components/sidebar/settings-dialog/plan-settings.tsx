import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/// Pestaña «Plan» del modal de Configuración: muestra el plan vigente y el rol de
/// la sesión en modo solo lectura. La facturación llegará en una fase posterior.
export function PlanSettings({
  planLabel,
  roleLabel,
}: {
  readonly planLabel: string | null;
  readonly roleLabel: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-0.5">
          <span className="font-medium text-sm">Plan actual</span>
          <span className="text-muted-foreground text-xs">Tu nivel de servicio vigente.</span>
        </div>
        <Badge variant="secondary">{planLabel ?? "Sin plan"}</Badge>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <div className="grid gap-0.5">
          <span className="font-medium text-sm">Rol</span>
          <span className="text-muted-foreground text-xs">Tu rol dentro de la organización.</span>
        </div>
        <Badge variant="outline">{roleLabel}</Badge>
      </div>

      <Separator />

      <p className="text-muted-foreground text-xs">La gestión de facturación y cambios de plan llegará próximamente.</p>
    </div>
  );
}
