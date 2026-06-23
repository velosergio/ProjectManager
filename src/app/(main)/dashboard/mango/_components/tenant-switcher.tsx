"use client";

import { useTransition } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setMangoActiveTenant } from "@/server/server-actions";

interface TenantSwitcherProps {
  tenantId: string;
  isActive: boolean;
}

/// Botón para que `mango` entre o salga del contexto de una organización.
export function TenantSwitcher({ tenantId, isActive }: TenantSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      try {
        await setMangoActiveTenant(isActive ? null : tenantId);
        router.refresh();
      } catch {
        toast.error("No se pudo cambiar de organización.");
      }
    });
  };

  return (
    <Button variant={isActive ? "secondary" : "outline"} size="sm" disabled={isPending} onClick={toggle}>
      {isActive ? "Salir" : "Inspeccionar"}
    </Button>
  );
}
