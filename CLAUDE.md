# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/002-core-multitenant/plan.md
<!-- SPECKIT END -->

## Idioma

Toda la documentación, comentarios de propósito y mensajes de interfaz se escriben en **español**
(con acentos y ortografía correctos). Los identificadores de código y términos técnicos
consolidados quedan en inglés. Ver `.specify/memory/constitution.md` (Principio V).

## Qué es este proyecto

Es un **Project Manager multitenant** (SaaS) en construcción, partiendo de la plantilla
`next-shadcn-admin-dashboard` ("Studio Admin"). Muchas rutas bajo `src/app/(main)/dashboard/`
(crm, finance, ecommerce, logistics, etc.) son **demos heredados de la plantilla**, no features
del producto final. El alcance real y el orden de implementación están en `ROADMAP.md`
(multitenant con `tenantId`, planes Gratuito/Pro/Pro+, roles `admin`/`mango`, Kanban, Gantt,
calendario, pagos vía Wompi). Al añadir features, guíate por `ROADMAP.md`, no por los demos.

## Spec Driven Development

El proyecto usa **Spec Kit** (carpeta `.specify/`). El trabajo se organiza en specs bajo `specs/`
con `spec.md`, `plan.md` y `tasks.md`. El bloque SPECKIT de arriba apunta al plan activo: léelo
antes de implementar. Las skills `speckit-*` (specify, plan, tasks, implement, analyze, etc.)
conducen ese flujo.

## Comandos

```bash
npm run dev            # servidor de desarrollo (Next.js)
npm run build          # build de producción (output: standalone)
npm run start          # servir el build

npm run check          # Biome: lint + formato (verificación)
npm run check:fix      # Biome: corregir lint + formato
npm run lint           # solo lint
npm run format         # solo formato (escribe)

npm run db:generate    # prisma generate
npm run db:migrate     # prisma migrate dev (crea/aplica migración en dev)
npm run db:push        # prisma db push (sincroniza schema sin migración)
npm run db:studio      # Prisma Studio
npm run db:seed        # ejecuta prisma/seed.ts

npm run doctor         # React Doctor (calidad React)
npm run generate:presets   # regenera los presets de tema en theme.ts (ver abajo)
```

No hay framework de pruebas configurado todavía, aunque la constitución exige pruebas para la
lógica de negocio (Principio II). Antes de escribir tests, hay que elegir y configurar el runner.

## Puertas de calidad (obligatorias antes de fusionar a `main`)

La constitución (`.specify/memory/constitution.md`) es vinculante. En resumen:

1. `npm run check` (Biome) pasa **al 100 %**, sin errores ni advertencias.
2. React Doctor (`npm run doctor`) sin diagnósticos pendientes.
3. TypeScript y `npm run build` sin errores.
4. La suite de pruebas pasa (cuando exista).

**Prohibido alcanzar el 100 % con trampas**: no desactivar reglas en masa, no excluir archivos
del análisis, no silenciar diagnósticos sin corregir la causa, no relajar la config de Biome/React
Doctor. Husky + lint-staged corren en pre-commit; no usar `--no-verify` sin autorización documentada.

## Stack

- **Next.js 16 (App Router)** + **React 19** + **TypeScript estricto**. Alias de import: `@/*` → `src/*`.
- **React Compiler activado** (`reactCompiler: true` en `next.config.mjs`) — no añadir `useMemo`/
  `useCallback` manuales por defecto; el compilador memoiza.
- **Tailwind CSS v4** + **shadcn/ui** (Radix / base-ui). Notificaciones unificadas con **Sonner**.
- **Prisma 7 + MySQL** (en producción/Docker, MariaDB). Cliente "Rust-free" vía **driver adapter**
  `@prisma/adapter-mariadb` (ver sección «Datos»).
- **NextAuth v5 (beta)** con provider Credentials + adapter Prisma, estrategia JWT.
- Estado: **Zustand** (ligero) y **TanStack Query**. Tablas: **TanStack Table**. Formularios:
  **React Hook Form** + **Zod**. Drag & drop: **dnd-kit**. Calendario: **FullCalendar**.

## Arquitectura

**Colocación por feature.** Cada ruta vive en `src/app/` y guarda sus piezas locales en `_components/`
(prefijo `_` = carpeta privada, no es ruta). Grupos de rutas:

- `src/app/(main)/auth/v1/` — login y registro.
- `src/app/(main)/dashboard/` — app autenticada; layout monta el sidebar (`_components/sidebar/`).
  `(legacy)` y la mayoría de subrutas son demos de la plantilla.
- `src/app/(external)/` — páginas públicas/landing.
- `src/app/api/auth/[...nextauth]/route.ts` reexporta los `handlers` de `src/lib/auth.ts`;
  `src/app/api/auth/register/route.ts` crea usuarios (hash con bcrypt, validación Zod).

**Capas compartidas:**
- `src/lib/` — `auth.ts` (config NextAuth), `prisma.ts` (singleton de PrismaClient), `utils.ts` (`cn`), `fonts/`.
- `src/server/server-actions.ts` — Server Actions para leer/escribir cookies y preferencias.
- `src/config/app-config.ts` — metadatos de la app (todavía con el branding "Studio Admin").
- `src/navigation/sidebar/sidebar-items.ts` — definición de items del menú.
- `src/components/ui/` y `src/components/calendar/` — componentes generados de shadcn/calendario.

**Sistema de preferencias y temas** (`src/lib/preferences/`): tema, fuente, layout y forma del
sidebar se persisten según una política por clave (`preferences-config.ts`): las claves
**layout-críticas** (`sidebar_variant`, `sidebar_collapsible`) deben leerse en el servidor (cookie),
nunca `localStorage`, porque afectan al SSR. Los presets de tema viven en `src/styles/presets/*.css`
y se compilan a `src/lib/preferences/theme.ts` mediante `npm run generate:presets` (hay un bloque
`generated:themePresets` — no editarlo a mano; añadir/editar el `.css` y regenerar).

## Datos (Prisma)

**Configuración Prisma 7** (cliente sin engine de Rust):
- El generador es `prisma-client` (no `prisma-client-js`) con `output = "../src/generated/prisma"`.
  El cliente se genera fuera de `node_modules`, en `src/generated/` (ignorado por git y por Biome);
  **no editarlo a mano** y regenerarlo con `npm run db:generate`. Importarlo siempre desde
  `@/generated/prisma/client` (no desde `@prisma/client`). `postinstall` lo regenera en cada install.
- Prisma 7 **exige un driver adapter**: `src/lib/prisma.ts` instancia `PrismaClient` con
  `PrismaMariaDb(process.env.DATABASE_URL)` (`@prisma/adapter-mariadb`, compatible con el esquema
  `mysql://`). El middleware/edge sigue sin importar Prisma (ver `proxy.ts`).
- La URL del datasource **ya no vive en el schema** (Prisma 7 lo prohíbe): está en `prisma.config.ts`
  (raíz), que carga `.env.local`/`.env` vía `dotenv` para el CLI. El `datasource` del schema solo
  declara `provider = "mysql"`.

`prisma/schema.prisma` define `User` (enums `UserRole` con ADMIN/**MANGO**/MANAGER/MEMBER/VIEWER y
`UserStatus`; `User` gana `tenantId` nullable) y los modelos del adapter de NextAuth (`Account`,
`Session`, `VerificationToken`). La FASE 1 añadió los modelos de negocio: `Tenant`, `Plan`,
`Subscription`, `Client`, `Project`, `Process`, `Task`, `FileAsset`, `Event` y `PasswordResetToken`,
con migración versionada en `prisma/migrations/` y seed de planes en `prisma/seed.ts`.

**Aislamiento multitenant (FR-002).** El scoping por `tenantId` se aplica con una **extensión de
cliente Prisma** (Prisma 7 ya no soporta `$use`). El código de feature **debe** leer/escribir datos
de negocio a través de `getTenantDb()` (cliente escopado al tenant de la sesión) o `getAdminDb()`
(acceso global, solo rol `mango`) de `src/lib/tenant-db-session.ts` — **nunca** el cliente base
`@/lib/prisma` para entidades de negocio. La lógica pura de scoping vive en `src/lib/tenant-db.ts`.
El gating de planes (cuotas + features) está en `src/lib/plans/`. El `tenantId` y el `role` viajan en
el JWT de NextAuth (ver `src/types/next-auth.d.ts`).

## Convenciones de Biome (notables)

- Formato: 2 espacios, ancho 120, comillas dobles, `trailingCommas: all`, fin de línea `lf`.
- Imports se auto-organizan en grupos: react → next → paquetes → alias `@/` → rutas relativas.
- Reglas activas estrictas: `noFloatingPromises`, `noMisusedPromises`, `useNullishCoalescing`,
  `useSortedClasses` (clases Tailwind ordenadas), `useFilenamingConvention`, `noImportCycles`,
  `noCommonJs` (usar ESM).
- Biome **ignora** `src/components/ui/` y `src/components/calendar/` (código generado).

## Producción

`Dockerfile` multi-stage (deps → builder → runner) con `output: standalone`, pensado para EasyPanel;
MariaDB y Redis se gestionan como servicios externos. El entrypoint corre migraciones antes de
arrancar. Variables de entorno en `.env.example` (copiar a `.env.local`): `DATABASE_URL`,
`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `REDIS_URL`, config de MinIO, SMTP opcional.
