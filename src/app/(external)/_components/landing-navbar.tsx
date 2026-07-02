"use client";

import { useState } from "react";

import Link from "next/link";

import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", label: "Características" },
  { href: "#multitenant", label: "Plataforma" },
  { href: "#pricing", label: "Planes" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2.5" aria-label="MangoMorado — inicio">
            <span className="size-7 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-violet-600 shadow-[0_0_18px_rgba(139,92,246,0.5)]" />
            <span className="font-semibold text-base tracking-tight">
              Mango<span className="text-violet-300">Morado</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1.5 font-medium text-sm text-white shadow-[0_0_20px_rgba(168,85,247,0.45)] transition-transform hover:scale-[1.03]"
            >
              Crear cuenta
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-200 transition-colors hover:bg-white/5 md:hidden"
            aria-expanded={open}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:hidden">
          <nav className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#0d0a17]/95 p-3 backdrop-blur-xl">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-white/10" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-center font-medium text-sm text-white"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
