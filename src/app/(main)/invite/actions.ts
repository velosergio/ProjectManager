"use server";

import { ZodError } from "zod";

import { acceptInvitation } from "@/lib/members/mutations";

// Server Action pública de aceptación de invitación (FASE 4, US1/FR-003).
// El token firmado del payload ES la autenticación: no puede exigir sesión
// previa (falso positivo documentado en el recipe de server-auth-actions).

export type AcceptInvitationActionResult = { ok: true } | { ok: false; error: string };

// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function acceptInvitationAction(input: unknown): Promise<AcceptInvitationActionResult> {
  try {
    const result = await acceptInvitation(input);
    if (!result.ok) {
      return {
        ok: false,
        error: "El enlace de invitación no es válido o ha caducado. Pide que te reenvíen la invitación.",
      };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Los datos enviados no son válidos." };
    }
    return { ok: false, error: "Ocurrió un error inesperado. Inténtalo de nuevo." };
  }
}
