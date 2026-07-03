# Tasks: Gestión de Clientes (FASE 3)

**Input**: Design documents from `/specs/006-client-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Incluidos — la constitución (Principio II) exige pruebas para toda la lógica de
negocio. Dentro de cada fase, las tareas de prueba van primero y deben fallar antes de
implementar.

**Organization**: Tareas agrupadas por user story para permitir implementación y validación
independiente de cada historia.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece la tarea (US1…US5)
- Cada descripción incluye la ruta exacta del archivo

## Path Conventions

Proyecto único Next.js App Router: `src/` y `tests/` en la raíz del repo, según plan.md.

---

## Phase 1: Setup (esquema de datos)

**Purpose**: única ampliación de esquema de la fase (relación `Client ↔ Tag`), prerrequisito de
todo lo que muestra o asigna etiquetas.

- [X] T001 Añadir la relación M:N implícita en `prisma/schema.prisma`: `tags Tag[]` en el modelo `Client` y `clients Client[]` en el modelo `Tag` (ver data-model.md)
- [X] T002 Crear la migración versionada y regenerar el cliente: `npm run db:migrate` (nombre `client_tags`) y `npm run db:generate`; verificar que la tabla de unión `_ClientToTag` existe

---

## Phase 2: Foundational (permisos y validación)

**Purpose**: módulos puros que TODAS las historias consumen (autorización y esquemas Zod).

**⚠️ CRITICAL**: ninguna historia puede empezar sin esta fase completa.

- [X] T003 [P] Prueba unitaria de la matriz de permisos en `tests/unit/authz-clients.test.ts`: `canManageClients` verdadero solo para `ADMIN`/`MANAGER`/`MANGO`; falso para `MEMBER`/`VIEWER` (debe fallar antes de T005)
- [X] T004 [P] Prueba unitaria de validaciones en `tests/unit/client-schemas.test.ts`: nombre obligatorio y recortado (1–120), email opcional con formato válido y `"" → null`, teléfono máx. 30, filtros del listado con `.catch()` (q/tagId/active/page) (debe fallar antes de T006)
- [X] T005 [P] Crear `src/lib/authz-clients.ts` con `canManageClients(role)` siguiendo el patrón de `src/lib/authz-projects.ts` (funciones puras, comentarios de propósito en español)
- [X] T006 [P] Crear `src/lib/clients/schemas.ts` con Zod: `clientSchema` (name/email/phone/tagIds) y `clientFiltersSchema` (q, tagId, active, page) según data-model.md

**Checkpoint**: permisos y validación listos — las historias pueden comenzar.

---

## Phase 3: User Story 1 — Administrar el catálogo de clientes (Priority: P1) 🎯 MVP

**Goal**: CRUD completo de clientes con listado paginado, permisos por rol y aislamiento por
tenant; entrada «Clientes» en el sidebar.

**Independent Test**: crear un cliente con nombre/email/teléfono, verlo en el listado, editarlo,
eliminarlo (con advertencia de proyectos a desvincular) y comprobar que otro tenant no lo ve.

### Tests for User Story 1

- [X] T007 [P] [US1] Prueba de integración en `tests/integration/clients-crud.test.ts`: crear/editar/eliminar cliente; `ForbiddenError` para `MEMBER`/`VIEWER`; aislamiento entre tenants (cliente de otro tenant = `NotFoundError`); eliminar cliente con proyectos los desvincula (`clientId = null`) sin borrarlos; conteo de impacto correcto (debe fallar antes de T008–T009)

### Implementation for User Story 1

- [X] T008 [US1] Implementar mutaciones en `src/lib/clients/mutations.ts`: `createClient`, `updateClient`, `deleteClient` y `getDeletionImpact` (conteo de proyectos); validación con `clientSchema`, permisos con `canManageClients`, patrón `MutationActor` + `ScopedPrismaClient` de FASE 2
- [X] T009 [US1] Implementar consulta de listado en `src/lib/clients/queries.ts`: `listClients(db, filters)` paginado en servidor (`{ items, total, page, pageSize }`) con etiquetas y `_count` de proyectos, orden por nombre
- [X] T010 [US1] Crear Server Actions en `src/app/(main)/dashboard/clients/actions.ts`: `createClient`, `updateClient`, `deleteClient`, `getClientDeletionImpact` con `ActionResult`, `mapError` en español y `revalidatePath` (contrato en contracts/server-actions.md)
- [X] T011 [US1] Crear página de listado RSC `src/app/(main)/dashboard/clients/page.tsx`: lee `searchParams` (página), llama `listClients` vía `getTenantDb()`, estados vacío y de carga en español
- [X] T012 [P] [US1] Crear `src/app/(main)/dashboard/clients/_components/clients-table.tsx`: tabla shadcn/ui con nombre/email/teléfono, paginación, acciones de editar/eliminar visibles solo si `canManageClients`
- [X] T013 [P] [US1] Crear `src/app/(main)/dashboard/clients/_components/client-form-dialog.tsx`: crear/editar con RHF+Zod (`clientSchema`), mensajes de validación en español, confirmación con Sonner
- [X] T014 [P] [US1] Crear `src/app/(main)/dashboard/clients/_components/delete-client-dialog.tsx`: confirmación que muestra el conteo de proyectos a desvincular (`getClientDeletionImpact`) antes de eliminar
- [X] T015 [US1] Añadir item «Clientes» → `/dashboard/clients` en `src/navigation/sidebar/sidebar-items.ts` (icono de contactos de lucide, junto a «Proyectos»)

**Checkpoint**: US1 funcional de forma independiente — MVP entregable.

---

## Phase 4: User Story 2 — Vista detalle con seguimiento (Priority: P2)

**Goal**: página dedicada por cliente (URL propia) con datos de contacto, resumen de seguimiento
(proyectos por estado, última actividad) y proyectos asociados enlazados.

**Independent Test**: con un cliente con proyectos en ≥ 2 estados, abrir `/dashboard/clients/<id>`
y verificar resumen, última actividad y navegación a un proyecto; URL de otro tenant → 404.

### Tests for User Story 2

- [X] T016 [P] [US2] Pruebas de integración de seguimiento en `tests/integration/client-queries.test.ts`: `getClientDetail` devuelve conteos por estado correctos, `lastActivityAt = max(cliente.updatedAt, proyectos.updatedAt)`, proyectos asociados con id/nombre/estado, y `null` para clientes de otro tenant o inexistentes (debe fallar antes de T017)

### Implementation for User Story 2

- [X] T017 [US2] Implementar `getClientDetail(db, clientId)` en `src/lib/clients/queries.ts`: datos + etiquetas + proyectos (select mínimo) + `groupBy(status)` + `_max(updatedAt)` en una sola pasada sin N+1 (research.md §3)
- [X] T018 [US2] Crear página de detalle RSC `src/app/(main)/dashboard/clients/[clientId]/page.tsx`: `getClientDetail` vía `getTenantDb()`, `notFound()` si `null`, composición de los tres componentes del detalle
- [X] T019 [P] [US2] Crear `src/app/(main)/dashboard/clients/[clientId]/_components/client-header.tsx`: datos de contacto, etiquetas y acciones de gestión (editar/eliminar reutilizando los diálogos de US1, gated por rol)
- [X] T020 [P] [US2] Crear `src/app/(main)/dashboard/clients/[clientId]/_components/client-tracking.tsx`: resumen de proyectos por estado (labels en español de `src/lib/projects/labels.ts`) y última actividad
- [X] T021 [P] [US2] Crear `src/app/(main)/dashboard/clients/[clientId]/_components/client-projects.tsx`: listado de proyectos enlazados a `/dashboard/projects/[projectId]` con estado vacío claro

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 — Buscar y filtrar clientes (Priority: P2)

**Goal**: búsqueda por nombre/email/teléfono (insensible a mayúsculas y acentos) y filtros
combinables (etiqueta, «con proyectos activos») sobre el listado paginado.

**Independent Test**: con varios clientes, buscar «perez» y encontrar «Pérez»; combinar búsqueda +
filtros y verificar la intersección; estado vacío con opción de limpiar.

### Tests for User Story 3

- [X] T022 [P] [US3] Pruebas de integración de búsqueda/filtros en `tests/integration/client-queries.test.ts`: `q` coincide en name/email/phone con acentos/mayúsculas ignorados (colación AI/CI), filtro `tagId`, filtro `active` (`status ∉ {COMPLETED, ARCHIVED}`), combinación de criterios y paginación coherente (`total` correcto) (debe fallar antes de T023)

### Implementation for User Story 3

- [X] T023 [US3] Extender `listClients` en `src/lib/clients/queries.ts` con los filtros: `q` (`OR` contains sobre name/email/phone), `tagId` (`tags: { some } }`), `active` (`projects: { some: { status: { notIn } } }`) aplicados en la consulta paginada
- [X] T024 [US3] Crear `src/app/(main)/dashboard/clients/_components/clients-filters.tsx` (isla cliente): buscador con debounce vía `searchParams`, selector de etiqueta, toggle «con proyectos activos», filtros activos visibles y removibles (patrón `projects-filters.tsx`)
- [X] T025 [US3] Integrar filtros en `src/app/(main)/dashboard/clients/page.tsx`: parseo de `searchParams` con `clientFiltersSchema`, estado vacío de «sin resultados» con acción de limpiar búsqueda

**Checkpoint**: US1–US3 funcionan de forma independiente.

---

## Phase 6: User Story 4 — Etiquetar clientes (Priority: P3)

**Goal**: asignar/quitar etiquetas del catálogo único del tenant a los clientes, con creación de
etiquetas al vuelo, visibles en listado y detalle.

**Independent Test**: asignar a un cliente una etiqueta usada por proyectos y una nueva creada al
momento; verificar badges en listado/detalle y que quitarla no la borra del catálogo.

### Tests for User Story 4

- [X] T026 [P] [US4] Prueba de integración en `tests/integration/client-tags.test.ts`: asignar etiqueta existente del catálogo (compartida con proyectos), reemplazo del conjunto con `set`, quitar etiqueta no la elimina del catálogo ni de proyectos, etiqueta de otro tenant → `NotFoundError`, creación al vuelo queda en el catálogo del tenant (debe fallar antes de T027)

### Implementation for User Story 4

- [X] T027 [US4] Extender `createClient`/`updateClient` en `src/lib/clients/mutations.ts` con `tagIds`: verificación `assertTagsInTenant` (patrón FASE 2) y `tags: { set/connect }` en la escritura
- [X] T028 [US4] Añadir action `createTagForClient` en `src/app/(main)/dashboard/clients/actions.ts` reutilizando `createTag` de `src/lib/projects/mutations.ts` (mismo modelo `Tag`, `DuplicateNameError` en español)
- [X] T029 [US4] Añadir selector de etiquetas a `src/app/(main)/dashboard/clients/_components/client-form-dialog.tsx`: asignar/quitar del catálogo y crear al vuelo (patrón `tags-manager.tsx` de proyectos)
- [X] T030 [P] [US4] Mostrar badges de etiquetas en `clients-table.tsx` y `client-header.tsx`, y conectar el filtro por etiqueta de US3 con los datos reales

**Checkpoint**: US1–US4 funcionan; el catálogo de etiquetas es único entre proyectos y clientes.

---

## Phase 7: User Story 5 — Crear un cliente al vuelo desde un proyecto (Priority: P3)

**Goal**: opción «Crear cliente…» en el selector de cliente del formulario de proyecto, sin
perder el estado del formulario.

**Independent Test**: llenar el formulario de nuevo proyecto, crear un cliente desde el selector
y verificar que queda seleccionado y que todos los campos previos conservan su valor; cancelar
deja el formulario intacto.

### Implementation for User Story 5

- [X] T031 [P] [US5] Añadir action `createClientInline` en `src/app/(main)/dashboard/projects/actions.ts`: delega en `createClient` de `src/lib/clients/mutations.ts` (alta mínima name/email/phone), devuelve `{ id, name }`, revalida `/dashboard/clients` (la lógica ya queda cubierta por T007)
- [X] T032 [US5] Ampliar `src/app/(main)/dashboard/projects/_components/project-form-dialog.tsx`: opción «Crear cliente…» que abre un subdiálogo (mismo árbol React, sin desmontar el formulario), al confirmar añade la opción a la lista local y la selecciona; ante cancelación o error el estado RHF del proyecto queda intacto (research.md §4)

**Checkpoint**: las 5 historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: coherencia transversal y puertas de calidad de la constitución.

- [X] T033 [P] Revisar estados de carga/vacío/error, accesibilidad (teclado, ARIA) y tema claro/oscuro en todas las vistas de clientes (`src/app/(main)/dashboard/clients/**`), coherentes con FASE 2 (FR-016)
- [X] T034 [P] Actualizar `ROADMAP.md`: marcar las funciones completadas de «FASE 3 — Gestión de Clientes»
- [X] T035 Puertas de calidad completas: `npm run check`, `npm run doctor`, `npm run build` y `npm run test` al 100 % sin trampas (constitución, Principio I)
- [ ] T036 Validación manual end-to-end con `specs/006-client-management/quickstart.md` (escenarios 1–5, dos tenants y dos roles)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; T002 depende de T001.
- **Foundational (Phase 2)**: depende de Phase 1 (los tipos regenerados de Prisma) — BLOQUEA todas las historias. T005 depende de T003; T006 depende de T004 (tests primero).
- **User Stories (Phases 3–7)**: todas dependen de Phase 2.
  - US1 (P1): sin dependencias de otras historias.
  - US2 (P2): independiente de US1 en lógica (`getClientDetail`), aunque T019 reutiliza los diálogos de T013/T014 — ejecutarla tras US1 en flujo secuencial.
  - US3 (P2): extiende `listClients` (T009) → después de US1.
  - US4 (P3): toca `mutations.ts` (T008), `client-form-dialog.tsx` (T013), `clients-table.tsx` (T012) y `client-header.tsx` (T019) → después de US1 (y de US2 para el header).
  - US5 (P3): solo necesita `createClient` (T008) → puede ir en paralelo con US2–US4 (archivos de la feature de proyectos, sin solaparse).
- **Polish (Phase 8)**: depende de las historias que se quieran entregar; T035–T036 al final.

### Within Each User Story

- Pruebas antes que implementación (deben fallar primero).
- Lógica (`src/lib/clients/`) antes que actions; actions antes que páginas; componentes [P] tras su página contenedora solo si esta los importa (crear archivos primero es válido).

### Parallel Opportunities

- Phase 2: T003 ∥ T004, luego T005 ∥ T006.
- US1: T012 ∥ T013 ∥ T014 (componentes en archivos distintos) tras T010–T011.
- US2: T019 ∥ T020 ∥ T021 tras T018.
- US5 puede desarrollarse en paralelo con US2/US3/US4 (archivos disjuntos: feature de proyectos).
- Phase 8: T033 ∥ T034.

## Parallel Example: User Story 1

```bash
# Tras T011, lanzar los tres componentes del listado en paralelo:
Task: "clients-table.tsx en src/app/(main)/dashboard/clients/_components/"
Task: "client-form-dialog.tsx en src/app/(main)/dashboard/clients/_components/"
Task: "delete-client-dialog.tsx en src/app/(main)/dashboard/clients/_components/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (esquema) + Phase 2 (permisos/validación).
2. Phase 3 completa (US1) → **PARAR y VALIDAR**: CRUD, permisos y aislamiento con `npm run test` y el escenario 1 del quickstart.
3. Entregable: la organización ya mantiene su catálogo de clientes.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → validar → MVP.
3. US2 (detalle/seguimiento) → validar.
4. US3 (búsqueda/filtros) → validar.
5. US4 (etiquetas) → validar.
6. US5 (creación al vuelo) → validar.
7. Polish + puertas de calidad → fusionar.

### Notes

- Verificar que cada prueba falla antes de implementar (Principio II).
- Confirmar (commit) tras cada tarea o grupo lógico.
- Ningún acceso a datos de negocio con el cliente base `@/lib/prisma`: siempre `getTenantDb()`/cliente escopado.
- No tocar `src/components/ui/` ni `src/generated/`.
