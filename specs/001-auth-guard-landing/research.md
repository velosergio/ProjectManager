# Research: Protección de auth global y landing pública

**Fecha**: 2026-06-22 · **Feature**: 001-auth-guard-landing

Este documento resuelve las decisiones técnicas del plan. No quedaban marcadores
`NEEDS CLARIFICATION` en el contexto técnico; se documentan las decisiones clave, su
justificación y las alternativas descartadas.

## 1. Mecanismo de protección de rutas

- **Decisión**: Middleware de Next.js (`src/middleware.ts`) que centraliza la decisión
  público/protegido y las redirecciones.
- **Rationale**: Protege todas las rutas internas en un único punto, antes de renderizar
  contenido. El grupo `(main)` contiene tanto vistas protegidas como las páginas de
  autenticación (`/auth/*`), por lo que un guard a nivel de layout de `(main)` bloquearía el
  propio login. El middleware permite una lista blanca precisa (`/`, `/auth/*`, `/api/auth/*`)
  y evita repetir checks en cada layout.
- **Alternativas consideradas**:
  - *Guard por layout con `auth()` en server components*: rechazada porque `(main)` mezcla
    rutas públicas (auth) y protegidas; obligaría a guards dispersos y frágiles.
  - *Verificación por página*: rechazada por repetición y riesgo de olvido en vistas nuevas.

## 2. NextAuth v5 en runtime edge: split de configuración

- **Decisión**: Separar la configuración en `src/lib/auth.config.ts` (base edge-safe, sin
  adapter ni `bcrypt`) y `src/lib/auth.ts` (importa `authConfig` y añade `PrismaAdapter` y el
  provider `Credentials` con `authorize`). El middleware instancia `NextAuth(authConfig)` para
  obtener un `auth` ejecutable en edge que solo lee el JWT de sesión.
- **Rationale**: El middleware de Next.js corre en el runtime edge, donde `@prisma/client` y
  `bcryptjs` no funcionan. La estrategia de sesión ya es `jwt`, y los callbacks `jwt`/`session`
  actuales no acceden a base de datos, por lo que la verificación de sesión en edge es viable
  con la config base. Este es el patrón documentado oficialmente por NextAuth v5 ("split
  config"). La instancia completa con adapter se sigue usando en `app/api/auth/[...nextauth]`.
- **Alternativas consideradas**:
  - *Forzar runtime Node en el middleware*: aún experimental/variable entre versiones; mayor
    riesgo y peor portabilidad. Rechazada.
  - *Importar `auth.ts` (con adapter) directamente en el middleware*: rompe en edge por Prisma
    y bcrypt. Rechazada.
- **Detalle de implementación**: `authConfig` contiene `pages.signIn`, `session.strategy: "jwt"`
  y los callbacks; `providers` puede declararse vacío en la base y completarse en `auth.ts`
  (el middleware solo necesita leer el token, no autenticar). Se mantiene `callbacks.jwt`/
  `session` en la base para que el `req.auth` del middleware tenga forma consistente.

## 3. Lógica de redirección (sin bucles)

- **Decisión**: En el middleware, calcular `isLoggedIn = !!req.auth` y clasificar la ruta:
  - Ruta pública (`/`, `/auth/*`): si `isLoggedIn` → redirigir a `/dashboard/default`.
  - Ruta `/` o `/auth/*` sin sesión → permitir (público).
  - Cualquier otra ruta (protegida) sin sesión → redirigir a `/`.
  - `/api/auth/*` y assets → excluidos vía `matcher` (no pasan por la lógica).
- **Rationale**: Clasificar explícitamente evita bucles: el destino de no-autenticados (`/`) es
  público y nunca se vuelve a redirigir; el destino de autenticados (`/dashboard/default`) es
  protegido pero el usuario sí tiene sesión, así que pasa.
- **`matcher`**: patrón que excluye `_next/static`, `_next/image`, `favicon.ico`, archivos con
  extensión y `api` (o al menos `api/auth`). Ejemplo de exclusión:
  `"/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"`.

## 4. Librería de animación: `motion`

- **Decisión**: Añadir `motion` (sucesora de `framer-motion`, mismo API `motion/react`).
- **Rationale**: Ofrece entradas escalonadas, `whileInView` para scroll-reveal y respeto nativo
  a movimiento reducido mediante el hook `useReducedMotion`. Compatible con React 19.
- **Alternativas consideradas**:
  - *Solo CSS + IntersectionObserver* (`tw-animate-css`): cero dependencias, pero más código
    manual para reveals escalonados y orquestación. Rechazada por DX y resultado.
- **`prefers-reduced-motion`**: se centraliza en un componente `Reveal` que usa
  `useReducedMotion()`; cuando es `true`, se renderiza el contenido sin transición (estado
  final visible). Las animaciones decorativas de fondo (glow) se reducen o se vuelven estáticas.

## 5. Estética y theming de la landing

- **Decisión**: La landing fuerza su propio esquema oscuro vía clases Tailwind locales en el
  `layout.tsx` de `(external)` (p. ej. contenedor con fondo oscuro y tokens propios), sin
  depender del `ThemeProvider`/preferencias del panel.
- **Rationale**: Es una página de marketing autónoma; debe verse igual para cualquier visitante
  con independencia de la preferencia de tema guardada del panel interno. Evita dependencias con
  el store de preferencias y posibles parpadeos.
- **Alternativas consideradas**:
  - *Respetar el tema global*: rechazada porque la dirección visual aprobada es "dark premium"
    fija; un visitante nuevo no tiene preferencia guardada y la coherencia de marca prima.
- **Marca**: acentos morados (color primario/violeta) con degradados puntuales mango→morado
  (ámbar/naranja → púrpura) como guiño a "MangoMorado". Glassmorphism mediante `backdrop-blur`
  y bordes/superficies translúcidas.

## 6. Contenido derivado del roadmap

- **Decisión**: Las secciones de características y planes se redactan a partir del `ROADMAP.md`,
  asumiendo funcionalidad desarrollada. Características: Kanban, Gantt, Calendario, Dashboard
  ejecutivo, Gestión documental, Bitácora/Auditoría, Recordatorios. Planes: Gratuito,
  Pro (30.000 COP/mes), Pro+ (50.000 COP/mes), con mención a Wompi.
- **Rationale**: Mantiene la landing fiel al producto real planificado y coherente con el
  lenguaje del proyecto (español).

## Resumen de decisiones

| Tema | Decisión |
|------|----------|
| Protección | Middleware central edge |
| Auth en edge | Split `auth.config.ts` + `auth.ts` |
| Redirecciones | Público vs protegido, sin bucles, vía `matcher` |
| Animaciones | `motion` + `useReducedMotion` |
| Theming landing | Dark premium forzado en `(external)/layout.tsx` |
| Contenido | Derivado de `ROADMAP.md`, en español |
