"use client";

import type { ReactNode } from "react";

import { m, useReducedMotion } from "motion/react";

interface RevealProps {
  children: ReactNode;
  /** Retraso de entrada en segundos (para escalonar elementos de una misma sección). */
  delay?: number;
  className?: string;
}

/**
 * Envoltorio de animación "scroll-reveal": el contenido aparece con un leve desplazamiento al
 * entrar en el viewport. Respeta `prefers-reduced-motion`: cuando está activo, renderiza el
 * estado final sin transición.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
