# Implementation Plan: Gestión de Clientes (FASE 3)

**Branch**: `006-client-management` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-client-management/spec.md`

## Summary

Dar interfaz y ciclo de vida completo al catálogo de clientes que existe en datos desde la
FASE 1: CRUD con validación (nombre obligatorio, email/teléfono opcionales), vista detalle como
página dedicada con seguimiento (proyectos por estado, última actividad) y proyectos enlazados,
búsqueda y filtros combinables, etiquetas reutilizando el catálogo único del tenant (hoy solo
asociado a proyectos) y creación de clientes al vuelo desde el formulario de proyecto.

Enfoque técnico: replicar el patrón probado de la FASE 2. Única ampliación de esquema: relación
M:N implícita `Client ↔ Tag`. La lógica de negocio se concentra en `src/lib/clients/` (funciones
puras sobre el cliente escopado, cubiertas con Vitest) con permisos en `src/lib/authz-clients.ts`
(`ADMIN`/`MANAGER`/`MANGO` gestionan; `MEMBER`/`VIEWER` consultan). Se expone con Server Actions
delgadas validadas con Zod y UI RSC-first bajo `src/app/(main)/dashboard/clients/` con islas
cliente para formularios y filtros. Sin cuota por plan (aclarado en el spec).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Next.js 16 (App Router) + React 19 (React Compiler activo)

**Primary Dependencies**: Prisma 7 (`@/generated/prisma/client`, adapter MariaDB), NextAuth v5 (JWT con `tenantId`/`role`), shadcn/ui + Tailwind v4, React Hook Form + Zod, Sonner; sin dependencias nuevas

**Storage**: MySQL/MariaDB vía Prisma; una migración versionada (tabla de unión `Client ↔ Tag`)

**Testing**: Vitest (`tests/unit/`, `tests/integration/` contra la BD real de `.env.local`, patrón ya establecido)

**Target Platform**: Web (SSR/RSC), desplegable en Docker standalone

**Project Type**: Aplicación web Next.js App Router con colocación por feature

**Performance Goals**: búsqueda/filtros percibidos < 1 s con hasta 1.000 clientes (SC-002); alta de cliente < 30 s (SC-001)

**Constraints**: aislamiento total por `tenantId` (FR-014, SC-005); listado paginado en servidor (FR-015); UI en español con estados de carga/vacío/error coherentes (FR-016); RSC-first (Principio IV); sin cuota por plan (Clarifications)

**Scale/Scope**: cientos–1.000 clientes por tenant; 1 migración, ~6 componentes nuevos, 2 rutas nuevas, 1 formulario existente ampliado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Calidad del código | Sin dependencias nuevas; código nuevo pasa Biome/React Doctor/TS estricto; no se toca `src/components/ui/` ni `src/generated/` | ✅ |
| II. Estándares de prueba | La lógica de negocio (validaciones Zod, permisos, consultas de seguimiento, mutaciones con desvinculación) vive en `src/lib/clients/` y `src/lib/authz-clients.ts`, cubierta con Vitest unit + integración (aislamiento, etiquetas compartidas, filtros, borrado con desvinculación) | ✅ |
| III. Coherencia de UX | Solo shadcn/ui existentes; Sonner para notificaciones; estados vacíos/carga/error en listado y detalle; español; tema claro/oscuro; operable por teclado; mismos patrones de tabla/diálogo que la FASE 2 | ✅ |
| IV. Rendimiento | RSC para lectura (listado, detalle); paginación en servidor; seguimiento con una agregación `groupBy` + `_max` (sin N+1); islas cliente solo en formularios/filtros | ✅ |
| V. Documentación en español | Todos los artefactos de este spec y los comentarios de propósito en español | ✅ |

**Resultado pre-Phase 0**: PASS (sin violaciones que justificar).
**Resultado post-Phase 1**: PASS — ver re-evaluación al final.

## Project Structure

### Documentation (this feature)

```text
specs/006-client-management/
├── plan.md              # Este archivo
├── research.md          # Phase 0 (decisiones y alternativas)
├── data-model.md        # Phase 1 (esquema y migración)
├── quickstart.md        # Phase 1 (guía de validación manual)
├── contracts/
│   └── server-actions.md   # Phase 1 (contratos de las Server Actions)
└── tasks.md             # Phase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                    # + relación M:N implícita Client ↔ Tag
└── migrations/<ts>_client_tags/     # migración versionada (tabla de unión)

src/lib/
├── authz-clients.ts                 # NUEVO: permisos por rol sobre clientes (puro, testeable)
└── clients/                         # NUEVO: lógica de negocio de la feature
    ├── schemas.ts                   # Zod: cliente (nombre/email/teléfono), filtros del listado
    ├── queries.ts                   # listado paginado + búsqueda + filtros, detalle con seguimiento
    └── mutations.ts                 # create/update/delete cliente, asignación de etiquetas

src/app/(main)/dashboard/
├── clients/                         # NUEVO: sección de clientes
│   ├── page.tsx                     # RSC: listado con búsqueda/filtros/paginación vía searchParams
│   ├── actions.ts                   # Server Actions delgadas ("use server")
│   ├── _components/
│   │   ├── clients-table.tsx        # listado + estados vacíos (acciones solo si canManageClients)
│   │   ├── clients-filters.tsx      # buscador + filtro etiqueta + «con proyectos activos» (client)
│   │   ├── client-form-dialog.tsx   # crear/editar cliente con etiquetas (RHF+Zod, client)
│   │   └── delete-client-dialog.tsx # confirmación con conteo de proyectos a desvincular
│   └── [clientId]/
│       ├── page.tsx                 # RSC: detalle (datos, etiquetas, seguimiento, proyectos)
│       └── _components/
│           ├── client-header.tsx    # datos de contacto + etiquetas + acciones de gestión
│           ├── client-tracking.tsx  # resumen: proyectos por estado + última actividad
│           └── client-projects.tsx  # proyectos asociados enlazados a /dashboard/projects/[id]
└── projects/
    ├── actions.ts                   # + acción de creación de cliente al vuelo (reusa lib/clients)
    └── _components/
        └── project-form-dialog.tsx  # AMPLIADO: opción «Crear cliente…» en el selector (subdiálogo)

src/navigation/sidebar/sidebar-items.ts  # + item «Clientes» → /dashboard/clients

tests/
├── unit/
│   ├── client-schemas.test.ts       # validaciones Zod (nombre obligatorio, email, filtros)
│   └── authz-clients.test.ts        # matriz de permisos por rol
└── integration/
    ├── clients-crud.test.ts         # CRUD + aislamiento + borrado desvincula proyectos
    ├── client-tags.test.ts          # catálogo compartido con proyectos, crear al vuelo, quitar sin borrar
    └── client-queries.test.ts       # búsqueda (acentos/mayúsculas), filtros combinados, paginación, seguimiento
```

**Structure Decision**: colocación por feature bajo `src/app/(main)/dashboard/clients/` (patrón
del repo, prefijo `_` para carpetas privadas), con la lógica de negocio extraída a
`src/lib/clients/` para probarla con Vitest sin montar rutas (Principio II). Las Server Actions
viven junto a la ruta (`actions.ts`) y son envoltorios finos: sesión → cliente escopado →
`mutations.ts`/`queries.ts` → `revalidatePath`. La creación al vuelo se integra en el
`project-form-dialog.tsx` existente sin desmontar el formulario (el estado RHF del proyecto se
conserva mientras el subdiálogo está abierto).

## Complexity Tracking

Sin violaciones a la constitución: tabla no aplicable.

## Re-evaluación Constitution Check (post-Phase 1)

El diseño final (data-model.md, contracts/) se mantiene dentro de las puertas:

- La única ampliación de esquema es la relación M:N implícita `Client ↔ Tag`; ambos extremos ya
  están en `SCOPED_MODELS`, así que toda lectura/escritura queda escopada al tenant sin lógica
  nueva de aislamiento (FR-014).
- El seguimiento del detalle se resuelve con una consulta de detalle + una agregación
  `groupBy(status)` y un `_max(updatedAt)` sobre los proyectos del cliente — sin N+1
  (Principio IV, FR-007).
- El filtro «con proyectos activos» usa `projects: { some: { status: { notIn: [COMPLETED, ARCHIVED] } } }`
  en la misma consulta paginada del listado (FR-010, FR-015).
- La búsqueda insensible a acentos/mayúsculas se apoya en la colación `*_ai_ci` de MySQL/MariaDB
  ya vigente (sin código extra); queda cubierta por prueba de integración (FR-009).
- Ningún requisito exige debilitar Biome/React Doctor ni tocar código generado.

**Resultado**: PASS.
