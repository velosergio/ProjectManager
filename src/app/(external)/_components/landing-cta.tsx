import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Reveal } from "./reveal";

export function LandingCta() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/15 to-amber-500/10 px-6 py-16 text-center backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute top-[-6rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/30 blur-[120px]"
          />
          <div className="relative">
            <h2 className="text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
              Empieza a gestionar mejor hoy
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-zinc-300">
              Crea tu organización en minutos y lleva tus proyectos a un solo lugar. Sin tarjeta de crédito.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-medium text-violet-700 transition-transform hover:scale-[1.03]"
              >
                Crear cuenta gratis
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 font-medium text-white transition-colors hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
