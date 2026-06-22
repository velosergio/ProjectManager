import { Building2, Crown, ShieldCheck, Users } from "lucide-react";

import { Reveal } from "./reveal";

const ROLES = [
  {
    icon: Users,
    name: "admin",
    description: "Administra su organización: gestiona usuarios, proyectos y datos dentro de su propio tenant.",
  },
  {
    icon: Crown,
    name: "mango",
    description:
      "Super usuario global: visibilidad transversal a todos los tenants, con medición, seguimiento y analítica.",
  },
];

const HIGHLIGHTS = [
  {
    icon: Building2,
    title: "Un tenant por organización",
    description: "Cada cliente opera en su propio espacio; los datos de negocio se aíslan por organización.",
  },
  {
    icon: ShieldCheck,
    title: "Aislamiento garantizado",
    description: "El scoping por organización se fuerza en cada consulta: un tenant nunca lee datos de otro.",
  },
];

export function LandingMultitenant() {
  return (
    <section id="multitenant" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-violet-200 text-xs">
              Arquitectura multitenant
            </span>
            <h2 className="mt-5 text-balance font-semibold text-4xl tracking-tight">Datos aislados, roles claros</h2>
            <p className="mt-4 text-pretty text-zinc-400">
              Cada organización trabaja en su propio entorno con sus proyectos, clientes y archivos. Los permisos se
              definen por roles globales para que cada quien vea exactamente lo que le corresponde.
            </p>

            <div className="mt-8 space-y-4">
              {HIGHLIGHTS.map((highlight) => (
                <div key={highlight.title} className="flex gap-3">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
                    <highlight.icon className="size-4.5" />
                  </span>
                  <div>
                    <h3 className="font-medium">{highlight.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{highlight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="space-y-4">
            {ROLES.map((role) => (
              <div
                key={role.name}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 backdrop-blur"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-violet-500/20 text-amber-200 ring-1 ring-white/10">
                    <role.icon className="size-5" />
                  </span>
                  <code className="rounded-md bg-white/5 px-2 py-1 font-mono text-sm text-violet-200">{role.name}</code>
                </div>
                <p className="mt-4 text-sm text-zinc-400">{role.description}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
