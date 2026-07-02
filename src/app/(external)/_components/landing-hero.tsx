"use client";

import Link from "next/link";

import { ArrowRight, CheckCircle2, KanbanSquare, PlayCircle } from "lucide-react";
import { m, useReducedMotion, type Variants } from "motion/react";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function LandingHero() {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  return (
    <section className="relative px-4 pt-36 pb-20 sm:px-6 sm:pt-44">
      <m.div className="mx-auto max-w-3xl text-center" variants={container} initial={initial} animate="show">
        <m.div variants={item} className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Gestión de proyectos multitenant para tu equipo
          </span>
        </m.div>

        <m.h1 variants={item} className="mt-6 text-balance font-semibold text-5xl tracking-tight sm:text-6xl">
          Tu operación,{" "}
          <span className="bg-gradient-to-r from-amber-300 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            bajo control.
          </span>
        </m.h1>

        <m.p variants={item} className="mx-auto mt-6 max-w-xl text-pretty text-lg text-zinc-400">
          Planifica, ejecuta y mide tus proyectos en un solo lugar: Kanban, Gantt, calendario, documentos y un dashboard
          ejecutivo. Diseñado para organizaciones con datos aislados y roles claros.
        </m.p>

        <m.div variants={item} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-medium text-white shadow-[0_0_30px_rgba(168,85,247,0.45)] transition-transform hover:scale-[1.03]"
          >
            Empezar gratis
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-medium text-zinc-100 backdrop-blur transition-colors hover:bg-white/10"
          >
            <PlayCircle className="size-4" />
            Ver características
          </Link>
        </m.div>

        <m.p variants={item} className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500">
          <CheckCircle2 className="size-4 text-emerald-400/80" />
          Plan Gratuito disponible · Sin tarjeta de crédito
        </m.p>
      </m.div>

      {/* Mockup glass del producto. */}
      <m.div
        className="mx-auto mt-16 max-w-5xl"
        initial={reduceMotion ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_30px_120px_-30px_rgba(124,58,237,0.5)] backdrop-blur-xl">
          <div className="rounded-xl border border-white/10 bg-[#0c0a16]/80">
            <div className="flex items-center gap-1.5 border-white/10 border-b px-4 py-3">
              <span className="size-2.5 rounded-full bg-red-400/70" />
              <span className="size-2.5 rounded-full bg-amber-400/70" />
              <span className="size-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <KanbanSquare className="size-3.5" /> Tablero · MangoMorado
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
              {["Pendiente", "En proceso", "Finalizado"].map((col, colIndex) => (
                <div key={col} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="mb-3 text-xs text-zinc-400">{col}</p>
                  <div className="space-y-2.5">
                    {Array.from({ length: 3 - colIndex }).map((_, cardIndex) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: contenido decorativo estático del mockup
                        key={cardIndex}
                        className="rounded-md border border-white/5 bg-gradient-to-br from-white/[0.06] to-transparent p-2.5"
                      >
                        <div className="mb-2 h-2 w-2/3 rounded bg-zinc-600/70" />
                        <div className="h-1.5 w-full rounded bg-zinc-700/50" />
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="h-1.5 w-10 rounded-full bg-violet-500/50" />
                          <span className="size-4 rounded-full bg-gradient-to-br from-amber-400 to-violet-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </m.div>
    </section>
  );
}
