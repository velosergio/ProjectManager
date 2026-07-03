# Tasks: Gestión de Proyectos y Tareas (FASE 2)

**Input**: Design documents from `/specs/005-project-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: Se incluyen tareas de prueba porque la constitución (Principio II) exige pruebas
automatizadas de toda la lógica de negocio (validaciones, permisos, acceso a datos, cálculo de
avance). Patrón: Vitest, unit en `tests/unit/`, integración contra la BD real en
`tests/integration/` (requieren MySQL corriendo y migrado).

**Organization**: Tareas agrupadas por historia de usuario; cada historia es un incremento
independiente y verificable con su escenario del quickstart.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1–US4)

## Path Conventions

Proyecto Next.js App Router con colocación por feature (ver plan.md). Rutas relativas a la
raíz del repositorio. Contratos de actions y lecturas: [contracts/server-actions.md](./contracts/server-actions.md).
Esquema y reglas: [data-model.md](./data-model.md).

---

## Phase 1: Setup

**Purpose**: Cambios de esquema e infraestructura compartida que todo lo demás necesita.

- [X] T001 Ampliar `prisma/schema.prisma` según data-model.md: enums `ProjectStatus` y `ProjectPriority`; en `Project` cambiar `status` a `ProjectStatus @default(PENDING)` y añadir `priority`, `startDate`, `endDate`, `ownerId` (relación `"ProjectOwner"` a `User`, `onDelete: SetNull`), `processTypeId` (`onDelete: SetNull`) y `tags Tag[]`; modelos nuevos `Tag` y `ProcessType` (`@@unique([tenantId, name])`); relaciones inversas en `User` (`ownedProjects`) y `Tenant` (`tags`, `processTypes`); índices `[tenantId, status]`, `[ownerId]`, `[processTypeId]`. Crear la migración con `npm run db:migrate` (nombre `project_management`) y regenerar el cliente (`npm run db:generate`)
- [X] T002 Añadir `"Tag"` y `"ProcessType"` a `SCOPED_MODELS` en `src/lib/tenant-db.ts` y ajustar `tests/unit/tenant-db.test.ts` si enumera los modelos escopados
- [X] T003 [P] Crear `src/lib/projects/labels.ts` con los mapas de etiquetas en español para `ProjectStatus` (Pendiente/En proceso/En revisión/Finalizado/Archivado), `ProjectPriority` (Baja/Media/Alta/Urgente) y `TaskStatus` (Pendiente/En proceso/Finalizada), únicos puntos de verdad para la UI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lógica de negocio compartida por todas las historias (esquemas, permisos, mutaciones, consultas) con sus pruebas unitarias.

- [X] T004 Crear `src/lib/projects/schemas.ts` con los esquemas Zod del contrato: `projectInput` (nombre 1..200 obligatorio; resto opcional; `refine` `endDate >= startDate` con mensaje en español), `taskInput` (título 1..200), `tagInput` (1..50), `processTypeInput` (1..80) y `projectFilters` (`q, status, priority, ownerId, clientId, processTypeId, tagId, page`)
- [X] T005 [P] Crear `src/lib/authz-projects.ts` con la matriz de permisos de FR-018 (funciones puras): `canManageProjects(role)` (ADMIN/MANAGER/MANGO), `canEditProject(actor, project)` (gestión, o MEMBER si es `ownerId` del proyecto o `assigneeId` de alguna de sus tareas), `canDeleteProject(role)`, `canManageTasks(role)` (todos salvo VIEWER), `canManageCatalogs(role)` (ADMIN/MANAGER)
- [X] T006 Extender `createProjectWithQuota` en `src/lib/plans/gating.ts`: aceptar los campos nuevos de `Project` (prioridad, estado, fechas, responsable, tipo, etiquetas) y crear el `Process` por defecto («General», `order 0`) dentro de la misma transacción serializable (research D2)
- [X] T007 Crear `src/lib/projects/mutations.ts` (reciben cliente escopado + actor, aplican `authz-projects` y validan con `schemas.ts`): `createProject` (vía `createProjectWithQuota`), `updateProject`, `deleteProject`, `createTask`/`updateTask`/`toggleTaskDone`/`deleteTask` (resuelven el proceso por defecto; verifican que `assigneeId`/`ownerId` sea usuario activo del tenant, FR-011), `createTag`/`renameTag`/`deleteTag`, `createProcessType`/`renameProcessType`/`deleteProcessType`
- [X] T008 Crear `src/lib/projects/queries.ts`: `listProjects` (paginación `take/skip` de 20, filtros combinables, avance por página con **una** agregación `task.groupBy` — sin N+1, research D8), `getProjectDetail` (tareas con flag `overdue`: `dueDate < hoy && status != DONE`), `getPanelProjects` (todos los del tenant, filtro estado), `getPanelTasks` (asignadas al usuario o sin responsable; rangos hoy/mañana/semana con date-fns), `getPanelSummary` (tareas de hoy y % semanal, mismo alcance personal), `listTags`, `listProcessTypes`, `listMembers`, `listClients`
- [X] T009 [P] Prueba unitaria `tests/unit/project-schemas.test.ts`: validaciones de `projectInput` (nombre obligatorio, fechas invertidas rechazadas con mensaje en español), `taskInput` y filtros
- [X] T010 [P] Prueba unitaria `tests/unit/authz-projects.test.ts`: matriz completa de FR-018 por rol (ADMIN, MANAGER, MEMBER owner/assignee/ajeno, VIEWER, MANGO)

**Checkpoint**: lógica de negocio completa y probada — las historias solo añaden UI + actions.

---

## Phase 3: User Story 1 - Administrar proyectos de la organización (Priority: P1) 🎯 MVP

**Goal**: CRUD completo de proyectos con cuota de plan, catálogo de tipos y aislamiento por tenant.

**Independent Test**: quickstart escenario 1 (crear/listar/editar/eliminar con confirmación) y escenario 5 (cuota y aislamiento).

### Implementation for User Story 1

- [X] T011 [US1] Crear `src/app/(main)/dashboard/projects/actions.ts` (`"use server"`) con las actions de proyectos y tipos de proceso del contrato: `createProject`, `updateProject`, `deleteProject`, `createProcessType`, `renameProcessType`, `deleteProcessType` — sobre `ActionResult`, resolución de sesión/`getTenantDb()`, mapeo de errores (`mapGatingError`, `ForbiddenError`, Zod) y `revalidatePath` de `/dashboard` y `/dashboard/projects`
- [X] T012 [US1] Crear la página de listado `src/app/(main)/dashboard/projects/page.tsx` (RSC): lee `searchParams` (solo `page` en esta historia), llama a `listProjects`, renderiza tabla + paginación + estado vacío accionable «Nuevo proyecto»
- [X] T013 [P] [US1] Crear `src/app/(main)/dashboard/projects/_components/projects-table.tsx`: columnas nombre, cliente, prioridad y estado (badges con `labels.ts`), avance (Progress), fecha de cierre, responsable; fila enlaza al detalle; estado vacío reutilizable
- [X] T014 [P] [US1] Crear `src/app/(main)/dashboard/projects/_components/project-form-dialog.tsx` (client, RHF+Zod con `projectInput`): selects de cliente, responsable (miembros del tenant), tipo de proceso (con creación al vuelo vía `createProcessType`), estado, prioridad, fechas; errores de validación y de action vía Sonner
- [X] T015 [P] [US1] Crear `src/app/(main)/dashboard/projects/_components/delete-project-dialog.tsx`: confirmación explícita con aviso de que las tareas asociadas se eliminan (FR-002)
- [X] T016 [P] [US1] Crear `src/app/(main)/dashboard/projects/_components/process-types-manager.tsx`: gestión del catálogo (crear/renombrar/eliminar) visible solo para ADMIN/MANAGER (FR-021)
- [X] T017 [US1] Añadir el item «Proyectos» al sidebar en `src/navigation/sidebar/sidebar-items.ts` (grupo principal, icono de lucide, ruta `/dashboard/projects`)
- [X] T018 [US1] Prueba de integración `tests/integration/projects-crud.test.ts`: CRUD completo; cuota alcanzada rechaza con `QuotaExceededError` incluso en creaciones concurrentes (patrón de `quota-concurrency.test.ts`); aislamiento entre dos tenants (SC-004); permisos por rol en mutaciones; eliminar `ProcessType` en uso deja el proyecto «sin tipo»; eliminación de proyecto arrastra procesos y tareas
- [X] T019 [US1] Verificación manual: quickstart escenarios 1 y 5 (puntos 1–3)

**Checkpoint**: MVP demostrable — proyectos reales con cuota, catálogo y aislamiento.

---

## Phase 4: User Story 2 - Detalle del proyecto y gestión de tareas (Priority: P1)

**Goal**: Vista de detalle con todos los campos, tareas operables y avance derivado.

**Independent Test**: quickstart escenario 2 (crear/editar/completar/eliminar tareas, vencidas destacadas, avance actualizado).

### Implementation for User Story 2

- [X] T020 [US2] Añadir a `src/app/(main)/dashboard/projects/actions.ts` las actions de tareas del contrato: `createTask`, `updateTask`, `toggleTaskDone`, `deleteTask` (revalidan también el detalle del proyecto)
- [X] T021 [US2] Crear la página de detalle `src/app/(main)/dashboard/projects/[projectId]/page.tsx` (RSC): `getProjectDetail`; `notFound()` si el proyecto no existe en el tenant (cubre acceso por URL directa desde otro tenant)
- [X] T022 [P] [US2] Crear `src/app/(main)/dashboard/projects/[projectId]/_components/project-header.tsx`: todos los campos con `labels.ts`, etiquetas, avance con Progress, acciones editar/eliminar según permisos
- [X] T023 [P] [US2] Crear `src/app/(main)/dashboard/projects/[projectId]/_components/task-list.tsx` (client): lista con checkbox de completado (`toggleTaskDone`), responsable, fecha límite, vencidas destacadas (FR-019), estado vacío «crear la primera tarea», acciones editar/eliminar
- [X] T024 [P] [US2] Crear `src/app/(main)/dashboard/projects/[projectId]/_components/task-form-dialog.tsx` (client, RHF+Zod con `taskInput`): título, descripción, estado, responsable (miembros del tenant), fecha límite
- [X] T025 [US2] Prueba de integración `tests/integration/tasks-crud.test.ts`: CRUD de tareas en el proceso por defecto; avance derivado (0 % sin tareas, 50 % con 2/4 finalizadas); `assigneeId` de otro tenant rechazado; flag de vencida; permisos (VIEWER no muta; MEMBER sí)
- [X] T026 [US2] Verificación manual: quickstart escenario 2

**Checkpoint**: núcleo funcional completo (US1 + US2) — proyectos y tareas operables de punta a punta.

---

## Phase 5: User Story 3 - Panel con datos reales (Priority: P2)

**Goal**: Secciones «Proyectos», «Tareas» y tarjetas de resumen del panel alimentadas por datos reales (alcance mixto de la clarificación), sin datos de demostración.

**Independent Test**: quickstart escenario 3 (datos reales, filtros operativos, completado persistente, estados vacíos en cuenta nueva).

### Implementation for User Story 3

- [X] T027 [P] [US3] Reescribir `src/app/(main)/dashboard/_components/projects-section.tsx` como RSC: `getPanelProjects` (todos los del tenant), filtro por estado vía `searchParams` del dashboard, tarjetas con estado/avance/fecha de cierre reales, botón «Nuevo» → `/dashboard/projects` con el diálogo de creación, estado vacío accionable
- [X] T028 [P] [US3] Reescribir `src/app/(main)/dashboard/_components/tasks-section.tsx`: RSC que llama a `getPanelTasks` (usuario actual o sin responsable; filtro hoy/mañana/semana vía `searchParams`) + isla cliente mínima con checkbox que invoca `toggleTaskDone`; «Nueva tarea» → flujo real; vencidas destacadas; estado vacío accionable
- [X] T029 [P] [US3] Reescribir `src/app/(main)/dashboard/_components/summary-cards.tsx` como RSC: cifras de `getPanelSummary` (tareas de hoy, % de progreso semanal) en lugar de los valores fijos
- [X] T030 [US3] Ajustar `src/app/(main)/dashboard/page.tsx`: pasar `searchParams` y la sesión a las secciones reescritas; conservar intactas las secciones demo restantes (Negocio/Finanzas/Analítica/Academia)
- [X] T031 [US3] Prueba de integración `tests/integration/panel-queries.test.ts`: `getPanelTasks` respeta el alcance personal (asignadas al usuario + sin responsable, nunca las de terceros) y los rangos temporales; `getPanelSummary` calcula tareas de hoy y % semanal; `getPanelProjects` devuelve todos los del tenant y ninguno de otro
- [X] T032 [US3] Verificación manual: quickstart escenario 3 (incluida cuenta recién creada, SC-007)

**Checkpoint**: el panel deja de mentir — SC-003 cumplido para proyectos/tareas/resumen.

---

## Phase 6: User Story 4 - Búsqueda, filtros y etiquetas (Priority: P3)

**Goal**: Listado filtrable y buscable; etiquetas del tenant gestionables y filtrables.

**Independent Test**: quickstart escenario 4 (búsqueda por nombre/cliente, filtros combinados, etiquetas renombradas/eliminadas, estado vacío con limpiar filtros).

### Implementation for User Story 4

- [X] T033 [US4] Añadir a `src/app/(main)/dashboard/projects/actions.ts` las actions de etiquetas del contrato: `createTag`, `renameTag`, `deleteTag` (conflicto de unicidad → mensaje «Ya existe una etiqueta…»)
- [X] T034 [P] [US4] Crear `src/app/(main)/dashboard/projects/_components/projects-filters.tsx` (client): buscador con debounce y filtros combinables (estado, prioridad, responsable, cliente, tipo de proceso, etiqueta) que navegan actualizando `searchParams`; botón «limpiar filtros»
- [X] T035 [US4] Integrar filtros en `src/app/(main)/dashboard/projects/page.tsx`: parsear todos los `searchParams` con `projectFilters`, pasarlos a `listProjects`, estado vacío específico «sin resultados» con acción de limpiar (FR-012)
- [X] T036 [P] [US4] Crear `src/app/(main)/dashboard/projects/_components/tags-manager.tsx` (crear/renombrar/eliminar, gestión completa solo ADMIN/MANAGER) y añadir el selector multi-etiqueta con creación al vuelo a `project-form-dialog.tsx` (FR-013)
- [X] T037 [US4] Prueba de integración `tests/integration/project-filters.test.ts`: búsqueda por nombre de proyecto y de cliente; filtros combinados (estado+prioridad+etiqueta); paginación con >20 proyectos; unicidad de etiqueta por tenant; renombrar etiqueta se refleja en sus proyectos; eliminarla los desasocia sin borrarlos
- [X] T038 [US4] Verificación manual: quickstart escenario 4

**Checkpoint**: feature completa a nivel funcional; queda el polish transversal.

---

## Phase 7: Polish y puertas de calidad

**Purpose**: Puertas de la constitución y validación final del propietario.

- [X] T039 Ejecutar `npm run check` (y `check:fix` para autocorregibles) y resolver todo error/advertencia de Biome en los archivos de la feature sin suprimir reglas
- [X] T040 Ejecutar `npm run doctor` (React Doctor) y resolver los diagnósticos de los archivos de la feature
- [X] T041 Ejecutar `npm run build` y corregir cualquier error de TypeScript o de build
- [X] T042 Ejecutar `npm run test` completo (unit + integración, con MySQL migrado) y dejar la suite en verde
- [X] T043 Validación completa de `specs/005-project-management/quickstart.md` (escenarios 1–6, incluido tema claro/oscuro, teclado y responsive) y **solicitar la validación humana del propietario**; registrar el resultado como comentario en este archivo

> **Registro de ejecución (2026-07-03, /speckit-implement):**
>
> - Migración `20260702225140_project_management` aplicada y cliente regenerado.
> - Suite completa en verde: 85 pruebas en 16 archivos (36 nuevas de la feature: 16 unit +
>   30 de integración entre projects-crud, tasks-crud, panel-queries y project-filters).
> - Puertas: Biome 0 errores (las 14 advertencias restantes son deuda preexistente documentada
>   en el spec 004: `tenant-db.ts`, `users.tsx`, `roles.tsx`); React Doctor con `--scope changed`
>   sin diagnósticos (100/100) — los 183 globales viven en los demos de la plantilla;
>   `npm run build` y TypeScript sin errores, con las rutas `/dashboard/projects` y
>   `/dashboard/projects/[projectId]` en el mapa.
> - Corrección colateral: `tests/integration/route-authorization.test.ts` asumía el item demo
>   `analytics` (retirado del sidebar en el spec 004, con la suite sin ejecutar entonces); el
>   gating por plan ahora se verifica con un grupo sintético.
> - Hallazgo corregido durante los tests: las fechas «solo día» (`yyyy-MM-dd`) se interpretan
>   como medianoche local en `schemas.ts` — coaccionarlas como ISO/UTC las movía al día anterior
>   en zonas con offset negativo.
> - T019, T026, T032, T038 y T043 (verificación visual en navegador según quickstart):
>   **APROBADO** por el propietario el 2026-07-03 («verificación manual completa»). Feature
>   cerrada: 43/43 tareas completadas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002 (el cliente regenerado define los tipos); T003 tras T001
- **Foundational (Phase 2)**: depende de Phase 1. T004 y T005 en paralelo; T006 tras T004; T007 tras T004+T005+T006; T008 tras T004; T009/T010 tras sus módulos
- **US1 (Phase 3)**: depende de Phase 2. T011 primero; T012–T016 después (T013–T016 en paralelo); T017 independiente tras T012; T018 tras T007; T019 al final
- **US2 (Phase 4)**: depende de Phase 2 (y convive con US1: comparte `actions.ts`). T020 → T021 → (T022–T024 en paralelo) → T025 → T026
- **US3 (Phase 5)**: depende de Phase 2 y de que existan los flujos de creación (US1/US2) para los botones «Nuevo»/«Nueva tarea». T027–T029 en paralelo → T030 → T031 → T032
- **US4 (Phase 6)**: depende de US1 (listado y formulario existentes). T033 → (T034, T036 en paralelo) → T035 → T037 → T038
- **Polish (Phase 7)**: depende de todas las historias; secuencial T039 → T040 → T041 → T042 → T043

### User Story Dependencies

- **US1 (P1)**: solo Foundational — MVP
- **US2 (P1)**: solo Foundational (comparte `actions.ts` con US1; coordinarse si se paraleliza)
- **US3 (P2)**: Foundational + botones de creación de US1/US2
- **US4 (P3)**: US1 (extiende su página y formulario)

### Parallel Opportunities

- Phase 2: T004 ∥ T005; luego T009 ∥ T010
- US1: T013 ∥ T014 ∥ T015 ∥ T016 (componentes distintos)
- US2: T022 ∥ T023 ∥ T024
- US3: T027 ∥ T028 ∥ T029 (tres archivos distintos)
- US4: T034 ∥ T036

## Parallel Example: User Story 3

```text
# Tras Phase 2, lanzar las tres reescrituras del panel a la vez:
Task: "Reescribir projects-section.tsx con getPanelProjects"
Task: "Reescribir tasks-section.tsx con getPanelTasks + toggle"
Task: "Reescribir summary-cards.tsx con getPanelSummary"
# Después, secuencial:
Task: "Ajustar dashboard/page.tsx" (T030)
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (T001–T003) → Phase 2 (T004–T010) → Phase 3 (T011–T019)
2. **PARAR y VALIDAR**: CRUD real con cuota y aislamiento (quickstart escenarios 1 y 5)
3. Demostrable como MVP aunque el detalle y el panel sigan pendientes

### Incremental Delivery

1. US1 → proyectos reales (MVP)
2. US2 → tareas y avance (núcleo funcional completo)
3. US3 → panel con datos reales (SC-003)
4. US4 → búsqueda, filtros y etiquetas
5. Phase 7 → puertas de calidad + validación humana del propietario

## Notes

- **Nunca** usar `@/lib/prisma` directamente para entidades de negocio: siempre `getTenantDb()` / cliente escopado inyectado (FR-003)
- React Compiler activo: sin `useMemo`/`useCallback` manuales en los componentes nuevos
- No editar `src/components/ui/**` ni `src/generated/**`
- Las secciones demo del panel (Negocio/Finanzas/Analítica/Academia) no se tocan
- Commit por tarea o grupo lógico; hooks de pre-commit sin `--no-verify`
- Los tests de integración limpian sus tenants efímeros en `afterAll` (patrón FASE 1)
