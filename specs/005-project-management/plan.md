# Implementation Plan: Gestión de Proyectos y Tareas (FASE 2)

**Branch**: `005-project-management` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-project-management/spec.md`

## Summary

Implementar el núcleo funcional del Project Manager: CRUD de proyectos con campos de negocio
(cliente, prioridad, tipo de proceso, estado, fechas, responsable, etiquetas), vista de detalle
con gestión de tareas y avance derivado, búsqueda/filtros/etiquetas, y conexión de las secciones
del panel («Proyectos», «Tareas», tarjetas de resumen) a datos reales del tenant.

Enfoque técnico: ampliar el esquema Prisma (enums `ProjectStatus`/`ProjectPriority`, campos
nuevos en `Project`, modelos `Tag` y `ProcessType`), concentrar la lógica de negocio en
`src/lib/projects/` (funciones puras + acceso vía cliente escopado, cubiertas con Vitest),
exponerla con Server Actions delgadas validadas con Zod, y construir la UI como React Server
Components con islas cliente (formularios RHF+Zod, filtros por `searchParams`). El aislamiento
multitenant y la cuota de proyectos reutilizan la infraestructura de FASE 1 (`getTenantDb()`,
`createProjectWithQuota`, `SCOPED_MODELS`).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Next.js 16 (App Router) + React 19 (React Compiler activo)

**Primary Dependencies**: Prisma 7 (`@/generated/prisma/client`, adapter MariaDB), NextAuth v5 (JWT con `tenantId`/`role`), shadcn/ui + Tailwind v4, React Hook Form + Zod, Sonner, date-fns; sin dependencias nuevas

**Storage**: MySQL/MariaDB vía Prisma; migración versionada (`npm run db:migrate`)

**Testing**: Vitest (`tests/unit/`, `tests/integration/` contra la BD real de `.env.local`, patrón ya establecido)

**Target Platform**: Web (SSR/RSC), desplegable en Docker standalone

**Project Type**: Aplicación web Next.js App Router con colocación por feature

**Performance Goals**: búsqueda/filtros percibidos < 1 s con 200 proyectos (SC-005); actualización de avance sin recarga manual (SC-008)

**Constraints**: aislamiento total por `tenantId` (SC-004); cuota de proyectos atómica ante concurrencia (SC-006); UI en español, tema claro/oscuro y teclado (FR-020); RSC-first (Principio IV)

**Scale/Scope**: decenas–cientos de proyectos y hasta miles de tareas por tenant; listado paginado en servidor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Calidad del código | Sin dependencias nuevas; código nuevo pasa Biome/React Doctor/TS estricto; no se toca `src/components/ui/` ni `src/generated/` | ✅ |
| II. Estándares de prueba | La lógica de negocio (validaciones Zod, permisos, mutaciones y consultas Prisma, cálculo de avance) vive en `src/lib/projects/` y `src/lib/authz-projects.ts`, cubierta con Vitest unit + integración (aislamiento, cuota, permisos, avance) | ✅ |
| III. Coherencia de UX | Solo shadcn/ui existentes; Sonner para notificaciones; estados vacíos/carga/error en panel, listado y detalle; español; tema claro/oscuro; operable por teclado | ✅ |
| IV. Rendimiento | RSC para lectura (listado, detalle, panel); paginación en servidor; consultas con `select` mínimo y agregaciones (`groupBy`/`_count`) para el avance sin N+1; islas cliente solo en lo interactivo | ✅ |
| V. Documentación en español | Todos los artefactos de este spec y los comentarios de propósito en español | ✅ |

**Resultado pre-Phase 0**: PASS (sin violaciones que justificar).
**Resultado post-Phase 1**: PASS — el diseño no introdujo desviaciones (ver re-evaluación al final).

## Project Structure

### Documentation (this feature)

```text
specs/005-project-management/
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
├── schema.prisma                    # + ProjectStatus, ProjectPriority, Tag, ProcessType, campos de Project
└── migrations/<ts>_project_management/  # migración versionada

src/lib/
├── tenant-db.ts                     # + "Tag", "ProcessType" en SCOPED_MODELS
├── authz-projects.ts                # NUEVO: permisos por rol sobre proyectos/tareas (puro, testeable)
└── projects/                        # NUEVO: lógica de negocio de la feature
    ├── schemas.ts                   # Zod: proyecto, tarea, etiqueta, tipo de proceso, filtros
    ├── queries.ts                   # listado paginado + filtros, detalle, datos del panel, avance
    └── mutations.ts                 # CRUD proyecto/tarea/etiqueta/tipo (recibe cliente escopado + actor)

src/app/(main)/dashboard/
├── projects/                        # NUEVO: listado de proyectos
│   ├── page.tsx                     # RSC: búsqueda/filtros/paginación vía searchParams
│   ├── actions.ts                   # Server Actions delgadas ("use server")
│   ├── _components/
│   │   ├── projects-table.tsx       # listado (tabla/cards) + estados vacíos
│   │   ├── projects-filters.tsx     # buscador + filtros combinables (client)
│   │   ├── project-form-dialog.tsx  # crear/editar proyecto (RHF+Zod, client)
│   │   ├── delete-project-dialog.tsx# confirmación de eliminación
│   │   ├── tags-manager.tsx         # gestión de etiquetas (crear al vuelo/renombrar/eliminar)
│   │   └── process-types-manager.tsx# gestión del catálogo de tipos (ADMIN/MANAGER)
│   └── [projectId]/
│       ├── page.tsx                 # RSC: detalle + tareas + avance
│       └── _components/
│           ├── project-header.tsx   # campos, etiquetas, avance
│           ├── task-list.tsx        # lista de tareas, vencidas destacadas (client)
│           └── task-form-dialog.tsx # crear/editar tarea (RHF+Zod, client)
└── _components/
    ├── projects-section.tsx         # REESCRITO: proyectos reales (RSC + filtro estado)
    ├── tasks-section.tsx            # REESCRITO: tareas del usuario (RSC + isla client)
    └── summary-cards.tsx            # REESCRITO: cifras reales (RSC)

src/navigation/sidebar/sidebar-items.ts  # + item «Proyectos»

tests/
├── unit/
│   ├── project-schemas.test.ts      # validaciones Zod (fechas, campos)
│   └── authz-projects.test.ts       # matriz de permisos por rol
└── integration/
    ├── projects-crud.test.ts        # CRUD + cuota (reusa createProjectWithQuota) + aislamiento
    ├── tasks-crud.test.ts           # tareas + avance derivado + responsables
    └── project-filters.test.ts      # búsqueda, filtros combinados, paginación, etiquetas/tipos
```

**Structure Decision**: colocación por feature bajo `src/app/(main)/dashboard/projects/` (patrón
del repo, prefijo `_` para carpetas privadas), con la lógica de negocio extraída a
`src/lib/projects/` para poder probarla con Vitest sin montar rutas (Principio II). Las Server
Actions viven junto a la ruta (`actions.ts`) y son envoltorios finos: sesión → cliente escopado →
`mutations.ts` → `revalidatePath`.

## Complexity Tracking

Sin violaciones a la constitución: tabla no aplicable.

## Re-evaluación Constitution Check (post-Phase 1)

El diseño final (data-model.md, contracts/) se mantiene dentro de las puertas:

- Los modelos nuevos `Tag` y `ProcessType` entran en `SCOPED_MODELS`; la relación M:N
  proyecto↔etiqueta es implícita y solo se accede a través de extremos escopados (FR-003).
- La cuota de proyectos reutiliza `createProjectWithQuota` (transacción serializable existente),
  extendida para aceptar los campos nuevos — sin lógica de cuota duplicada (FR-004/SC-006).
- El avance se calcula con una única agregación `groupBy` por página de proyectos (sin N+1,
  Principio IV).
- Ningún requisito exige debilitar Biome/React Doctor ni tocar código generado.

**Resultado**: PASS.
