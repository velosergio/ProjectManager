import Link from "next/link";

import { MailX, UserRoundPlus } from "lucide-react";

import { hashInvitationToken, isInvitationTokenValid } from "@/lib/members/tokens";
import { prisma } from "@/lib/prisma";

import { InviteForm } from "../_components/auth/invite-form";

// Aceptación de invitación (FASE 4, US1/FR-003). Página pública: valida el
// token en el servidor y, si es vigente, muestra el formulario de activación.

interface InviteContext {
  email: string;
  organization: string;
}

/// Resuelve la invitación vigente del token; null si es inválida, usada o
/// caducada (edge «Invitación caducada»).
async function resolveInvitation(token: string | undefined): Promise<InviteContext | null> {
  if (!token) {
    return null;
  }
  const record = await prisma.invitationToken.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    include: { user: { select: { email: true, status: true, tenant: { select: { name: true } } } } },
  });
  if (!record || !isInvitationTokenValid(record) || record.user.status !== "INVITED") {
    return null;
  }
  return { email: record.user.email, organization: record.user.tenant?.name ?? "una organización" };
}

export default async function InvitePage({ searchParams }: Readonly<{ searchParams: Promise<{ token?: string }> }>) {
  const { token } = await searchParams;
  const invitation = await resolveInvitation(token);

  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <UserRoundPlus className="mx-auto size-12 text-primary-foreground" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Únete al equipo</h1>
              <p className="text-primary-foreground/80 text-xl">Activa tu cuenta para empezar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          {invitation ? (
            <>
              <div className="space-y-4 text-center">
                <div className="font-medium tracking-tight">Activa tu cuenta</div>
                <div className="mx-auto max-w-xl text-muted-foreground">
                  Te invitaron a unirte a <strong>{invitation.organization}</strong> como{" "}
                  <strong>{invitation.email}</strong>. Define tu nombre y contraseña para empezar.
                </div>
              </div>
              <div className="space-y-4">
                <InviteForm token={token ?? ""} />
                <p className="text-center text-muted-foreground text-xs">
                  ¿Ya tienes cuenta?{" "}
                  <Link prefetch={false} href="/login" className="text-primary">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <MailX className="mx-auto size-10 text-muted-foreground" />
              <div className="font-medium tracking-tight">Enlace de invitación no válido</div>
              <div className="mx-auto max-w-xl text-muted-foreground">
                Este enlace no es válido, ya fue usado o ha caducado. Pide al administrador de tu organización que
                reenvíe la invitación para recibir un enlace nuevo.
              </div>
              <p className="text-center text-muted-foreground text-xs">
                <Link prefetch={false} href="/login" className="text-primary">
                  Volver a iniciar sesión
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
