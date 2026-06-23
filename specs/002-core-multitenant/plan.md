# Implementation Plan: Core del sistema y arquitectura multitenant

**Branch**: `002-core-multitenant` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-core-multitenant/spec.md`

## Summary

Se establece la base multitenant del Project Manager: aislamiento estricto por `tenantId` con
scoping forzado en la capa de datos, planes con cuotas parametrizables y gating de features, roles
globales `admin`/`mango`, sesión JWT con `tenantId`+`role`, alta de organización en autoservicio,
recuperación de contraseña, el comando CLI `npm run mango` y la navegación adaptada a rol y plan
(incluida la consola exclusiva de `mango`).

Enfoque técnico: el aislamiento se implementa con **Prisma Client Extensions** (Prisma 7 no soporta
el antiguo `$use`) a través de una factoría `getTenantDb()` que devuelve un cliente escopado al
`tenantId` de la sesión; el rol `mango` accede de forma transversal mediante `getAdminDb()` (sin
scope, con aserción de rol). El `tenantId` y el `role` viajan en el JWT (reutilizando el split
edge-safe `auth.config.ts`/`auth.ts` de la feature 001). Los planes se modelan con cuotas en columnas
nullable de la tabla `Plan` (parametrizables, `null` = ilimitado) y features tipadas en config; el
gating se aplica en backend y se refleja en la UI. Se adopta **Vitest** para cubrir la lógica de
negocio (Principio II), con una prueba de aislamiento entre tenants como verificación central.

## Technical Context

**Language/Version**: TypeScript (modo estricto) sobre Next.js 16 (App Router) + React 19; Node para
server components, route handlers y scripts CLI.

**Primary Dependencies**: Prisma 7 (`prisma-client` sin engine de Rust) + `@prisma/adapter-mariadb`,
NextAuth v5 (beta.28, JWT + Credentials), `bcryptjs`, Zod, TanStack Query/Table, shadcn/ui, Sonner.
Nuevas: `@clack/prompts` (CLI), `nodemailer` (+ `@types/nodemailer`, correo de reset), `vitest`
(pruebas).

**Storage**: MySQL/MariaDB vía Prisma. Estrategia multitenant: base compartida, esquema compartido,
discriminador `tenantId` en entidades de negocio (índices por `tenantId`).

**Testing**: Vitest (unitarias de scoping, bypass `mango`, gating/cuotas, tokens de reset; e
integración de aislamiento entre tenants con DB de prueba). Más las puertas de la constitución:
`biome check`, React Doctor, `tsc`/`next build`.

**Target Platform**: Aplicación web (navegadores modernos) desplegada como `output: standalone`
(Docker/EasyPanel); el middleware corre en edge.

**Project Type**: Aplicación web Next.js (App Router) con grupos de rutas `(main)`/`(external)` + un
script CLI Node.

**Performance Goals**: Lectura de datos predominantemente en RSC; consultas escopadas con índice por
`tenantId` (sin N+1); las comprobaciones de cuota usan `count` indexado. Middleware con sobrecarga
mínima (solo lee el JWT). Interacciones de UI por debajo de ~100 ms percibidos (Principio IV).

**Constraints**: El middleware DEBE ser edge-safe (sin Prisma ni bcrypt). El scoping DEBE ser no
omitible desde código de feature (FR-002): el código de negocio usa `getTenantDb()`/`getAdminDb()`,
nunca el cliente base. Cuotas parametrizables sin cambios de código (FR-010). `biome check` y React
Doctor al 100 % sin trampas.

**Scale/Scope**: 1 esquema Prisma ampliado (8 modelos nuevos + ajustes a `User`), 1 migración
versionada, ~6 modelos de negocio escopados, 1 factoría de datos + extensión, split de auth ya
existente ampliado, gating de planes, 1 CLI, flujo de reset (2 rutas + 2 páginas), navegación
adaptada y consola `mango`.

## Constitution Check

*GATE: Debe pasar antes de la investigación (Fase 0). Re-evaluado tras el diseño (Fase 1).*

- **I. Calidad del Código No Negociable**: ✅ Sin supresiones masivas de Biome ni exclusiones; el
  cliente generado en `src/generated/` ya está ignorado. TypeScript estricto, sin `any`
  injustificado. La augmentación de tipos de NextAuth se hace con declaraciones tipadas, no `any`.
- **II. Estándares de Prueba**: ✅ Esta feature ES lógica de negocio crítica (aislamiento, cuotas,
  bypass, tokens), por lo que se adopta Vitest y se exigen pruebas: unitarias de scoping/gating y una
  prueba de aislamiento entre tenants (SC-001/SC-007). Configurar el runner es parte del alcance.
- **III. Coherencia de la Experiencia del Usuario**: ✅ Sidebar, perfil, indicador de plan y consola
  `mango` se construyen sobre shadcn/ui y el sistema de preferencias existente; estados de carga,
  vacío y error; notificaciones con Sonner; accesibilidad y tema claro/oscuro.
- **IV. Requisitos de Rendimiento**: ✅ Datos en RSC; `tenantId` indexado; sin N+1; cuotas con
  `count`. Middleware solo lee JWT. La extensión añade un `where` por query (coste despreciable).
- **V. Documentación en Español**: ✅ Spec, plan y artefactos en español; UI en español;
  identificadores y enums en inglés según convención del ecosistema.

**Resultado**: PASA. Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-core-multitenant/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Fase 0 (/speckit-plan)
├── data-model.md        # Fase 1 (/speckit-plan)
├── quickstart.md        # Fase 1 (/speckit-plan)
├── contracts/           # Fase 1 (/speckit-plan)
│   ├── tenant-data-access.md     # Contrato de la factoría de datos escopados
│   ├── auth-session.md           # Forma de la sesión/JWT y resolución de tenant
│   ├── plan-gating.md            # API de gating de cuotas y features
│   ├── mango-cli.md              # Contrato del comando npm run mango
│   └── password-reset.md         # Endpoints de recuperación de contraseña
└── tasks.md             # Fase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                 # MODIFICADO: enums (UserRole+MANGO, SubscriptionStatus, PlanCode),
│                                 #   modelos Tenant, Plan, Subscription, Client, Project, Process,
│                                 #   Task, FileAsset, Event; User gana tenantId (nullable) + role
├── migrations/                   # NUEVO: migración versionada inicial del core multitenant
└── seed.ts                       # MODIFICADO: siembra de los 3 planes con cuotas por defecto

scripts/
└── create-mango.ts               # NUEVO: CLI interactivo (npm run mango)

src/
├── lib/
│   ├── prisma.ts                 # SIN CAMBIOS funcionales: exporta el cliente base
│   ├── tenant-db.ts              # NUEVO: getTenantDb() / getAdminDb() + extensión de scoping
│   ├── tenant-context.ts         # NUEVO: lee tenantId/role de la sesión y la selección de mango
│   ├── auth.config.ts            # MODIFICADO: callbacks jwt/session con tenantId + role
│   ├── auth.ts                   # MODIFICADO: authorize() devuelve tenantId + role
│   ├── password-reset.ts         # NUEVO: emisión/verificación de tokens de reset
│   ├── mailer.ts                 # NUEVO: envío SMTP (fallback de consola en dev)
│   └── plans/
│       ├── definitions.ts        # NUEVO: features por plan (config tipada)
│       └── gating.ts             # NUEVO: assertFeature / assertWithinQuota
├── types/
│   └── next-auth.d.ts            # NUEVO: augmentación de Session/User/JWT (tenantId, role)
├── server/
│   └── server-actions.ts         # MODIFICADO: selección de tenant activo para mango (cookie)
├── navigation/sidebar/
│   └── sidebar-items.ts          # MODIFICADO: items con metadatos de rol/plan
└── app/
    ├── api/auth/
    │   ├── register/route.ts      # MODIFICADO: crea Tenant + admin + Subscription Gratuito (tx)
    │   └── password/
    │       ├── request/route.ts   # NUEVO: solicitud de reset (respuesta neutra)
    │       └── reset/route.ts      # NUEVO: confirmación de reset
    ├── (main)/auth/v1/
    │   ├── forgot/page.tsx         # NUEVO: solicitar restablecimiento
    │   └── reset/page.tsx          # NUEVO: definir nueva contraseña
    └── (main)/dashboard/
        ├── _components/sidebar/    # MODIFICADO: filtra items por rol/plan; indicador de plan
        ├── profile/                # NUEVO/AJUSTE: vista de perfil
        └── mango/                  # NUEVO: consola exclusiva + selector de tenant (solo MANGO)
            ├── page.tsx
            └── _components/
```

**Structure Decision**: Aplicación web Next.js App Router con colocación por feature (convención del
repo). El núcleo del aislamiento se concentra en `src/lib/tenant-db.ts` (factoría + extensión Prisma)
para que el resto del código consuma datos ya escopados. El gating vive en `src/lib/plans/`. El CLI
queda en `scripts/` (patrón existente con `tsconfig.scripts.json`). La consola de `mango` es una
subruta protegida por rol dentro de `(main)/dashboard/`.

## Complexity Tracking

> No aplica. El Constitution Check pasa sin violaciones. La factoría `getTenantDb()`/`getAdminDb()`
> con extensión de cliente no es complejidad superflua: es el patrón idiomático de Prisma 7 para
> forzar el scoping (el `$use` ya no existe) y es la condición técnica para cumplir FR-002 sin dejar
> el filtrado a la disciplina manual del código de feature.

## Post-Design Constitution Re-Check

*Re-evaluado tras generar `data-model.md`, `contracts/` y `quickstart.md`.*

PASA sin cambios. El diseño no introduce supresiones de calidad, mantiene el scoping no omitible,
indexa `tenantId`, conserva la documentación en español y define pruebas de aislamiento/gating como
parte del alcance. No se añade complejidad fuera de la justificada arriba.
