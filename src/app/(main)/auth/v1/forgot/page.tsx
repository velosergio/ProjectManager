import Link from "next/link";

import { KeyRound } from "lucide-react";

import { ForgotPasswordForm } from "../../_components/forgot-password-form";

export default function ForgotPasswordV1() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <KeyRound className="mx-auto size-12 text-primary-foreground" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">¿Olvidaste tu contraseña?</h1>
              <p className="text-primary-foreground/80 text-xl">Te ayudamos a recuperarla</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="font-medium tracking-tight">Restablecer contraseña</div>
            <div className="mx-auto max-w-xl text-muted-foreground">
              Ingresa tu correo electrónico y te enviaremos un enlace para definir una nueva contraseña.
            </div>
          </div>
          <div className="space-y-4">
            <ForgotPasswordForm />
            <p className="text-center text-muted-foreground text-xs">
              ¿Recordaste tu contraseña?{" "}
              <Link prefetch={false} href="login" className="text-primary">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
