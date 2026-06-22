"use client";

import type { ReactNode } from "react";

import { domAnimation, LazyMotion } from "motion/react";

/**
 * Carga diferida de las features de animación de `motion`: permite usar los componentes ligeros
 * `m.*` en la landing en lugar de `motion.*`, reduciendo el JavaScript enviado al cliente
 * (Principio IV de la constitución).
 */
export function MotionProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
