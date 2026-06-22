import type { ReactNode } from "react";

import { MotionProvider } from "./_components/motion-provider";

/**
 * Layout de marketing para las rutas públicas (`(external)`).
 *
 * Fuerza una estética "dark premium" propia, independiente del `ThemeProvider` del panel: la
 * landing debe verse igual para cualquier visitante sin sesión, con independencia de la
 * preferencia de tema guardada. Por eso usa colores explícitos en lugar de los tokens del tema.
 */
export default function ExternalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#08060f] text-zinc-100 antialiased">
      {/* Glow morado de fondo, decorativo. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-12rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[140px]" />
        <div className="absolute top-[20rem] right-[-10rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/15 blur-[140px]" />
        <div className="absolute bottom-[-10rem] left-[-8rem] h-[24rem] w-[24rem] rounded-full bg-amber-500/10 blur-[150px]" />
      </div>
      <MotionProvider>
        <div className="relative z-10 selection:bg-violet-500/30 selection:text-white">{children}</div>
      </MotionProvider>
    </div>
  );
}
