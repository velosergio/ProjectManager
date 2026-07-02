import { Suspense } from "react";

import Link from "next/link";

import { ShieldCheck } from "lucide-react";

import { ResetPasswordForm } from "../_components/auth/reset-password-form";

export default function ResetPasswordV1() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <ShieldCheck className="mx-auto size-12 text-primary-foreground" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">Nueva contraseña</h1>
              <p className="text-primary-foreground/80 text-xl">Asegura tu cuenta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Definir nueva contraseña</div>
            <div className="mx-auto max-w-xl text-muted-foreground">Elige una contraseña nueva para tu cuenta.</div>
          </div>
          <div className="space-y-4">
            <Suspense fallback={null}>
              <ResetPasswordForm />
            </Suspense>
            <p className="text-center text-muted-foreground text-xs">
              <Link prefetch={false} href="login" className="text-primary">
                Volver a iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
