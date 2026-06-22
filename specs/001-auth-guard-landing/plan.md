# Implementation Plan: Protección de auth global y landing pública

**Branch**: `001-auth-guard-landing` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-auth-guard-landing/spec.md`

## Summary

Se protege el acceso a todas las vistas internas exigiendo sesión autenticada y se construye
una landing page pública en `/`. La protección se centraliza en un middleware de Next.js que
redirige a `/` a los visitantes no autenticados que intenten entrar a rutas protegidas, y
redirige a `/dashboard/default` a los usuarios autenticados que abran `/` o las páginas de
autenticación. Las rutas públicas son `/`, `/auth/*` y `/api/auth/*`.

Enfoque técnico: dado que el middleware corre en el runtime edge y la configuración actual de
NextAuth v5 usa `PrismaAdapter` + `bcrypt` (incompatibles con edge), se separa la configuración
en una base edge-safe (`auth.config.ts`) reutilizada por el middleware y por la instancia
completa con adapter (`auth.ts`). La landing se implementa en el grupo de rutas `(external)` con
estética dark premium propia (independiente del tema del panel) y animaciones con la librería
`motion`, respetando `prefers-reduced-motion`.

## Technical Context

**Language/Version**: TypeScript 5/6 (modo estricto), React 19, Node para server components

**Primary Dependencies**: Next.js 16 (App Router), NextAuth v5 (beta.28), Tailwind CSS v4,
shadcn/ui, lucide-react, `tw-animate-css`; nueva dependencia: `motion` (animaciones del cliente)

**Storage**: N/A para esta feature — se reutiliza la sesión JWT existente; no se añaden modelos
Prisma ni migraciones

**Testing**: Verificación manual mediante `quickstart.md` (escenarios de aceptación del spec) +
puertas automatizadas de la constitución (`biome check`, React Doctor, `next build`)

**Target Platform**: Aplicación web (navegadores modernos de escritorio y móvil)

**Project Type**: Aplicación web Next.js (App Router) con grupos de rutas `(main)` y `(external)`

**Performance Goals**: Landing con render predominantemente en servidor; JS de cliente limitado
a la interactividad (navbar, toggle de planes, animaciones). Animaciones a ~60 fps sin bloquear
el hilo principal. Middleware con sobrecarga mínima por petición (solo lectura de sesión).

**Constraints**: El middleware DEBE ser edge-safe (sin Prisma ni bcrypt). Sin bucles de
redirección. Respetar `prefers-reduced-motion`. Mantener `biome check` y React Doctor al 100 %.

**Scale/Scope**: 1 middleware, 1 split de configuración de auth, 1 landing page compuesta por
~7 secciones/componentes, redirecciones en 1 grupo de rutas.

## Constitution Check

*GATE: Debe pasar antes de la investigación (Fase 0). Re-evaluar tras el diseño (Fase 1).*

- **I. Calidad del Código No Negociable**: ✅ El plan no introduce supresiones de Biome ni
  silencia diagnósticos. Todo el código nuevo debe pasar `biome check` y React Doctor al 100 %.
  TypeScript estricto sin `any` injustificado. Sin trampas en las puertas.
- **II. Estándares de Prueba**: ✅ Esta feature es de navegación/redirección y presentación
  (UI). No introduce lógica de negocio nueva con reglas de dominio que exijan pruebas
  unitarias; la verificación se hace vía `quickstart.md` (escenarios de aceptación). La lógica
  del middleware (decisión público/protegido) se documenta de forma determinista y verificable.
  No hay corrección de bug que requiera prueba de regresión.
- **III. Coherencia de la Experiencia del Usuario**: ✅ Se reutilizan componentes shadcn/ui
  (Button, etc.) y Tailwind v4. Accesibilidad obligatoria (teclado, ARIA, contraste). La landing
  fuerza su estética oscura por ser página de marketing autónoma; esto es una decisión de
  producto explícita y no rompe el tema del panel interno.
- **IV. Requisitos de Rendimiento**: ✅ Render en servidor por defecto; islas de cliente solo
  donde hay interacción/animación. Sin consultas a base de datos nuevas. Imágenes/recursos
  optimizados; el "mockup" del hero se construye con CSS/markup, no imágenes pesadas.
- **V. Documentación en Español**: ✅ Spec, plan y artefactos en español; textos de UI en
  español. Identificadores de código en inglés según convención del ecosistema.

**Resultado**: PASA. Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-guard-landing/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── contracts/           # Fase 1 (/speckit-plan)
│   └── routing-access.md
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── proxy.ts                              # NUEVO: protección de rutas (proxy/middleware edge, Next 16)
├── lib/
│   ├── auth.config.ts                    # NUEVO: config base edge-safe de NextAuth
│   └── auth.ts                           # MODIFICADO: importa authConfig + adapter/provider
└── app/
    ├── (external)/
    │   ├── layout.tsx                    # NUEVO: layout de marketing (fuerza dark)
    │   ├── page.tsx                      # MODIFICADO: renderiza la landing (sin redirect)
    │   └── _components/                  # NUEVO: secciones de la landing
    │       ├── landing-navbar.tsx
    │       ├── landing-hero.tsx
    │       ├── landing-features.tsx
    │       ├── landing-multitenant.tsx
    │       ├── landing-pricing.tsx
    │       ├── landing-cta.tsx
    │       ├── landing-footer.tsx
    │       └── reveal.tsx                # wrapper de animación scroll-reveal (motion)
    └── (main)/                           # sin cambios estructurales (queda protegido por middleware)
```

**Structure Decision**: Aplicación web Next.js App Router con grupos de rutas existentes. La
protección es transversal vía `src/proxy.ts` (convención de Next 16 que reemplaza a
`middleware.ts`; no requiere tocar cada layout). La landing
vive en el grupo `(external)` ya existente, con sus secciones aisladas en `_components/` para
mantener archivos enfocados (Principio de aislamiento). El split de auth (`auth.config.ts` +
`auth.ts`) es la condición técnica para que el middleware funcione en edge.

## Complexity Tracking

> No aplica. El Constitution Check pasa sin violaciones; no se requiere justificar complejidad
> añadida. El split de configuración de auth no es complejidad superflua, sino el patrón
> idiomático y necesario para ejecutar la verificación de sesión en el runtime edge del
> middleware.
