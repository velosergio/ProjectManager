import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "Producto",
    links: [
      { href: "#features", label: "Características" },
      { href: "#multitenant", label: "Plataforma" },
      { href: "#pricing", label: "Planes" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/auth/v1/login", label: "Iniciar sesión" },
      { href: "/auth/v1/register", label: "Crear cuenta" },
    ],
  },
];

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-white/10 border-t px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5" aria-label="MangoMorado — inicio">
              <span className="size-7 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-violet-600" />
              <span className="font-semibold text-base tracking-tight">
                Mango<span className="text-violet-300">Morado</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-zinc-500">
              Gestión de proyectos multitenant para equipos que quieren su operación bajo control.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {FOOTER_LINKS.map((group) => (
              <div key={group.title}>
                <h3 className="font-medium text-sm text-zinc-200">{group.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-zinc-500 transition-colors hover:text-zinc-200">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-white/10 border-t pt-6 text-sm text-zinc-500">
          © {year} MangoMorado. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
