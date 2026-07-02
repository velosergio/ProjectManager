"use client";

import { useState } from "react";

import Link from "next/link";

import { Check } from "lucide-react";

type Cycle = "monthly" | "annual";

interface Plan {
  name: string;
  /** Precio mensual en COP. */
  priceMonthly: number;
  /** Precio mensual equivalente facturando anual (2 meses gratis). */
  priceAnnual: number;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Gratuito",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Para empezar a organizar tus primeros proyectos.",
    features: ["Hasta 3 proyectos", "Kanban y calendario", "1 usuario", "Soporte de la comunidad"],
    cta: "Empezar gratis",
  },
  {
    name: "Pro",
    priceMonthly: 30000,
    priceAnnual: 25000,
    description: "Para equipos que necesitan planear y medir.",
    features: [
      "Proyectos ilimitados",
      "Gantt y dashboard ejecutivo",
      "Hasta 10 usuarios",
      "Gestión documental",
      "Recordatorios por email",
    ],
    cta: "Probar Pro",
    highlighted: true,
  },
  {
    name: "Pro+",
    priceMonthly: 50000,
    priceAnnual: 41667,
    description: "Para organizaciones que escalan su operación.",
    features: [
      "Todo lo de Pro",
      "Usuarios ilimitados",
      "Analítica avanzada",
      "Recordatorios push y email",
      "Soporte prioritario",
    ],
    cta: "Probar Pro+",
  },
];

const copFormatter = new Intl.NumberFormat("es-CO");

function formatPrice(value: number): string {
  return value === 0 ? "Gratis" : `$${copFormatter.format(value)}`;
}

export function LandingPricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-semibold text-4xl tracking-tight">Planes para cada etapa</h2>
          <p className="mt-4 text-pretty text-zinc-400">
            Empieza gratis y crece cuando lo necesites. Precios en pesos colombianos (COP).
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div
            role="tablist"
            aria-label="Ciclo de facturación"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur"
          >
            <button
              type="button"
              role="tab"
              aria-selected={cycle === "monthly"}
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-4 py-1.5 font-medium text-sm transition-colors ${
                cycle === "monthly" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cycle === "annual"}
              onClick={() => setCycle("annual")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium text-sm transition-colors ${
                cycle === "annual" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Anual
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[0.7rem] text-emerald-300">
                2 meses gratis
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = cycle === "monthly" ? plan.priceMonthly : plan.priceAnnual;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur ${
                  plan.highlighted
                    ? "border-violet-400/50 bg-gradient-to-b from-violet-500/15 to-transparent shadow-[0_0_50px_-12px_rgba(168,85,247,0.55)]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {plan.highlighted ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 font-medium text-white text-xs">
                    Más popular
                  </span>
                ) : null}

                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-semibold text-4xl tracking-tight">{formatPrice(price)}</span>
                  {price > 0 ? <span className="text-sm text-zinc-400">COP / mes</span> : null}
                </div>
                <p className="mt-1 h-4 text-xs text-zinc-500">
                  {price > 0 && cycle === "annual" ? "Facturado anualmente" : ""}
                </p>

                <Link
                  href="/register"
                  className={`mt-6 inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-medium text-sm transition-transform hover:scale-[1.02] ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_24px_rgba(168,85,247,0.45)]"
                      : "border border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-zinc-300">
                      <Check className="mt-0.5 size-4 shrink-0 text-violet-300" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Pagos seguros procesados con <span className="text-zinc-300">Wompi</span>. Cancela cuando quieras.
        </p>
      </div>
    </section>
  );
}
