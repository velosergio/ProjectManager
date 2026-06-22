---

description: "Lista de tareas para la feature 001-auth-guard-landing"
---

# Tasks: Protección de auth global y landing pública

**Input**: Documentos de diseño en `specs/001-auth-guard-landing/`

**Prerequisites**: plan.md (requerido), spec.md (historias de usuario), research.md, data-model.md,
contracts/routing-access.md, quickstart.md

**Tests**: NO se generan tareas de tests automatizados. El spec no los solicitó explícitamente y,
conforme al Principio II de la constitución, esta feature (navegación/redirección + presentación)
se verifica mediante los escenarios de `quickstart.md`. La verificación se hace en la fase de pulido.

**Organization**: Las tareas se agrupan por historia de usuario para implementación y prueba
independientes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Las descripciones incluyen rutas de archivo exactas

## Path Conventions

- Aplicación web Next.js (App Router). Rutas relativas a la raíz del repositorio: `src/...`

---

## Phase 1: Setup (Infraestructura compartida)

**Purpose**: Inicialización y dependencias.

- [X] T001 Instalar la dependencia de animaciones `motion` (actualiza `package.json` y
  `package-lock.json`): `npm install motion`

---

## Phase 2: Foundational (Prerrequisitos bloqueantes)

**Purpose**: Split de configuración de NextAuth necesario para que el middleware funcione en el
runtime edge. Bloquea las historias que usan el middleware (US1 y US3).

**⚠️ CRITICAL**: Ninguna tarea de US1/US3 puede empezar hasta completar esta fase.

- [X] T002 Crear configuración base edge-safe en `src/lib/auth.config.ts`: exportar
  `authConfig` con `pages.signIn: "/auth/v1/login"`, `session.strategy: "jwt"`, callbacks
  `jwt`/`session` (idénticos a los actuales) y `providers: []`. SIN `PrismaAdapter` ni `bcryptjs`.
- [X] T003 Refactorizar `src/lib/auth.ts` para hacer spread de `authConfig` e incorporar
  `PrismaAdapter(prisma)` y el provider `Credentials` con su `authorize` (manteniendo el
  comportamiento actual). El export `auth/handlers/signIn/signOut` no cambia su firma.

**Checkpoint**: Configuración de auth lista para usarse tanto en edge (middleware) como con adapter.

---

## Phase 3: User Story 1 - Protección de las vistas internas (Priority: P1) 🎯 MVP

**Goal**: Exigir sesión para todas las vistas internas; redirigir a `/` los accesos no autenticados.

**Independent Test**: Sin sesión, visitar `/dashboard/default`, `/chat`, `/mail` y una ruta
interna inexistente; todas redirigen a `/` sin exponer contenido protegido (contrato C1–C4, C9).

### Implementation for User Story 1

- [X] T004 [US1] Crear `src/proxy.ts`: instanciar `NextAuth(authConfig)` para obtener `auth`
  edge-safe; envolver con `auth((req) => {...})`; calcular `isLoggedIn = !!req.auth`; si la ruta
  NO es pública (`/`, `/auth/*`) y no hay sesión → `REDIRECT /`; exportar `config.matcher` que
  excluya `api`, `_next/static`, `_next/image`, `favicon.ico` y archivos con extensión
  (`"/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"`).
- [X] T005 [US1] Modificar `src/app/(external)/page.tsx` para eliminar el `redirect("/dashboard/default")`
  incondicional, de modo que `/` sea una ruta pública alcanzable (render mínimo provisional; la
  landing completa se compone en US2/T015).

**Checkpoint**: Las vistas internas quedan protegidas y `/` es accesible sin sesión (sin bucles).

---

## Phase 4: User Story 2 - Landing pública que presenta el producto (Priority: P1)

**Goal**: Landing moderna en `/` (dark premium + glow morado) que presenta MangoMorado con todas
las secciones requeridas y animaciones que respetan `prefers-reduced-motion`.

**Independent Test**: Sin sesión, abrir `/` y comprobar navbar, hero, características (≥7),
multitenant/roles, planes con toggle mensual/anual, CTA final y footer; enlaces a login/registro
funcionan; navegable por teclado; con movimiento reducido las animaciones se reducen (FR-007–FR-020).

### Implementation for User Story 2

- [X] T006 [P] [US2] Crear `src/app/(external)/layout.tsx`: layout de marketing que fuerza la
  estética dark premium (fondo oscuro + tokens de marca mango/morado vía clases locales),
  independiente del `ThemeProvider` del panel; envuelve `children`.
- [X] T007 [P] [US2] Crear `src/app/(external)/_components/reveal.tsx`: wrapper de animación
  scroll-reveal con `motion/react` y `useReducedMotion()` (cuando es `true`, renderiza el estado
  final sin transición). Componente cliente reutilizable por las secciones.
- [X] T008 [P] [US2] Crear `src/app/(external)/_components/landing-navbar.tsx`: navbar sticky con
  glassmorphism (`backdrop-blur`), logo MangoMorado, enlaces a `#features` y `#pricing`, botón
  "Iniciar sesión" (`/auth/v1/login`) y CTA "Crear cuenta" (`/auth/v1/register`).
- [X] T009 [P] [US2] Crear `src/app/(external)/_components/landing-hero.tsx`: titular, texto
  descriptivo, dos CTAs, mockup glass del producto y glow morado de fondo (animado, reduce-motion
  consciente).
- [X] T010 [P] [US2] Crear `src/app/(external)/_components/landing-features.tsx`: grid con ≥7
  características del roadmap (Kanban, Gantt, Calendario, Dashboard ejecutivo, Gestión documental,
  Bitácora/Auditoría, Recordatorios) con iconos `lucide-react`, envueltas en `Reveal`. Ancla `#features`.
- [X] T011 [P] [US2] Crear `src/app/(external)/_components/landing-multitenant.tsx`: sección que
  explica el aislamiento multitenant por organización y los roles `admin` y `mango`.
- [X] T012 [P] [US2] Crear `src/app/(external)/_components/landing-pricing.tsx` (componente cliente):
  planes Gratuito / Pro (30.000 COP/mes) / Pro+ (50.000 COP/mes), Pro destacado, conmutador
  mensual/anual que actualiza precios, mención a pago con Wompi. Ancla `#pricing`.
- [X] T013 [P] [US2] Crear `src/app/(external)/_components/landing-cta.tsx`: banda de llamada a la
  acción final con CTA a registro.
- [X] T014 [P] [US2] Crear `src/app/(external)/_components/landing-footer.tsx`: footer con marca,
  enlaces y aviso de copyright.
- [X] T015 [US2] Componer todas las secciones en `src/app/(external)/page.tsx` en orden (navbar,
  hero, features, multitenant, pricing, cta, footer). Depende de T006–T014.

**Checkpoint**: La landing pública está completa y funcional en `/`.

---

## Phase 5: User Story 3 - Redirección del usuario autenticado fuera de la landing (Priority: P2)

**Goal**: Un usuario con sesión que entra a `/` o a `/auth/*` es redirigido a `/dashboard/default`.

**Independent Test**: Con sesión activa, visitar `/` y `/auth/v1/login`; ambos redirigen a
`/dashboard/default` (contrato C10–C11), mientras `/dashboard/*` y `/chat` siguen accesibles (C12–C13).

### Implementation for User Story 3

- [X] T016 [US3] Extender `src/proxy.ts` (mismo archivo que T004): si `isLoggedIn` y la ruta
  es pública (`/` o `/auth/*`) → `REDIRECT /dashboard/default`. Mantener invariantes sin bucles.

**Checkpoint**: Las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación de calidad, accesibilidad y rendimiento transversales.

- [X] T017 [P] Verificar `prefers-reduced-motion` en toda la landing (Reveal y glow de fondo):
  con la preferencia activa no hay animaciones que distraigan y el contenido es legible (FR-018).
- [X] T018 [P] Pase de accesibilidad de la landing: navegación por teclado con foco visible,
  roles/etiquetas ARIA correctos y contraste suficiente (FR-019, Principio III).
- [X] T019 [P] Verificar diseño responsivo de la landing en móvil (~375px) y escritorio (FR-020).
- [X] T020 Ejecutar puertas de calidad de la constitución: `npm run check` (Biome), `npm run doctor`
  (React Doctor) y `npm run build` — todas deben pasar al 100 %.
- [X] T021 Ejecutar los escenarios de validación A–D de `quickstart.md` y confirmar resultados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; puede empezar de inmediato.
- **Foundational (Phase 2)**: depende del Setup; BLOQUEA US1 y US3 (que usan el middleware).
- **US1 (Phase 3)**: depende de Foundational. Es el MVP de seguridad.
- **US2 (Phase 4)**: depende solo del Setup (`motion`). Es independiente de US1 a nivel de
  implementación; puede desarrollarse en paralelo a US1. (T005 de US1 desbloquea el render real de `/`.)
- **US3 (Phase 5)**: depende de US1 (T004, mismo archivo `middleware.ts`).
- **Polish (Phase 6)**: depende de US2 (y de US1/US3 para el quickstart completo).

### User Story Dependencies

- **US1 (P1)**: tras Foundational. Sin dependencias de otras historias.
- **US2 (P1)**: tras Setup. Independiente; comparte `page.tsx` con T005 (secuencial, no paralelo).
- **US3 (P2)**: tras US1 (extiende `middleware.ts`).

### Within Each User Story

- US2: las secciones (T006–T014) son archivos distintos → paralelizables; la composición (T015)
  va al final.
- US1/US3 tocan el mismo `middleware.ts` → secuenciales entre sí.

### Parallel Opportunities

- US2 (T006–T014) puede ejecutarse en gran parte en paralelo (archivos independientes).
- US1 y US2 pueden avanzar en paralelo (distinto conjunto de archivos), salvo `page.tsx`.
- Polish T017–T019 son paralelizables.

---

## Parallel Example: User Story 2

```bash
# Lanzar en paralelo las secciones de la landing (archivos distintos):
Task: "Crear reveal.tsx en src/app/(external)/_components/reveal.tsx"
Task: "Crear landing-navbar.tsx en src/app/(external)/_components/"
Task: "Crear landing-hero.tsx en src/app/(external)/_components/"
Task: "Crear landing-features.tsx en src/app/(external)/_components/"
Task: "Crear landing-multitenant.tsx en src/app/(external)/_components/"
Task: "Crear landing-pricing.tsx en src/app/(external)/_components/"
Task: "Crear landing-cta.tsx en src/app/(external)/_components/"
Task: "Crear landing-footer.tsx en src/app/(external)/_components/"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1: Setup
2. Phase 2: Foundational (split de auth — CRÍTICO)
3. Phase 3: US1 (protección)
4. **PARAR y VALIDAR**: probar la protección de rutas de forma independiente.

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → seguridad activa (MVP de protección)
3. US2 → landing pública completa (MVP de producto cara al público)
4. US3 → mejora de experiencia para usuarios autenticados
5. Polish → calidad, accesibilidad y verificación

---

## Notes

- [P] = archivos distintos, sin dependencias.
- US1 y US3 comparten `src/proxy.ts`: NO paralelizar entre sí.
- `page.tsx` lo tocan T005 (US1) y T015 (US2): secuencial.
- Documentación y UI en español; identificadores de código en inglés (Principio V).
- Mantener Biome y React Doctor al 100 % sin trampas (Principio I).
- Hacer commit tras cada tarea o grupo lógico.
