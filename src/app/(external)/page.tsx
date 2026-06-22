import type { Metadata } from "next";

import { LandingCta } from "./_components/landing-cta";
import { LandingFeatures } from "./_components/landing-features";
import { LandingFooter } from "./_components/landing-footer";
import { LandingHero } from "./_components/landing-hero";
import { LandingMultitenant } from "./_components/landing-multitenant";
import { LandingNavbar } from "./_components/landing-navbar";
import { LandingPricing } from "./_components/landing-pricing";

export const metadata: Metadata = {
  title: "MangoMorado — Gestión de proyectos multitenant",
  description:
    "Planifica, ejecuta y mide tus proyectos en un solo lugar: Kanban, Gantt, calendario, documentos y dashboard ejecutivo. Diseñado para organizaciones con datos aislados y roles claros.",
};

export default function Home() {
  return (
    <>
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingMultitenant />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </>
  );
}
