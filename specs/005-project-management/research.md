# Research: Gestión de Proyectos y Tareas (FASE 2)

**Fecha**: 2026-07-02 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

No quedaban marcadores `NEEDS CLARIFICATION` en el Technical Context (la sesión de
clarificación del 2026-07-02 resolvió las ambigüedades de producto). Este documento registra
las decisiones técnicas de diseño y sus alternativas.

## D1 — Estado del proyecto: de `String?` a enum `ProjectStatus`

- **Decision**: reemplazar `Project.status String?` por un enum Prisma `ProjectStatus`
  (`PENDING`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`, `ARCHIVED`) con default `PENDING`,
  etiquetado en la UI como Pendiente / En proceso / En revisión / Finalizado / Archivado.
- **Rationale**: FR-005 exige un conjunto cerrado alineado con el Kanban de FASE 3; un enum
  da integridad en BD, tipado en TS y filtros baratos. La columna actual es `String?` sin datos
  reales en producción (solo seed), así que la migración es de bajo riesgo.
- **Alternatives considered**: mantener `String?` con validación Zod (rechazada: permite datos
  inválidos por otras vías y complica filtros); tabla de estados por tenant (rechazada: los
  estados son de producto, no configurables — sobrediseño para FASE 2).

## D2 — Tareas bajo `Process` con proceso por defecto «General»

- **Decision**: conservar la jerarquía existente `Project → Process → Task`. Al crear un
  proyecto se crea automáticamente un `Process` por defecto (nombre «General», `order 0`); toda
  la UI de FASE 2 opera sobre ese proceso de forma transparente.
- **Rationale**: la spec (Assumptions) pide agrupación simple sin interfaz propia; el modelo ya
  existe y el Kanban de FASE 3 usará los procesos como columnas/listas. Añadir `projectId`
  directo a `Task` duplicaría la relación y crearía dos fuentes de verdad.
- **Alternatives considered**: `Task.projectId` directo (rechazada: divergiría del modelo de
  FASE 1 y del Kanban futuro); exponer gestión de procesos ya (rechazada: fuera de alcance de
  la spec).

## D3 — Etiquetas: modelo `Tag` escopado + M:N implícita con `Project`

- **Decision**: nuevo modelo `Tag` (`tenantId`, `name`, único por `[tenantId, name]`) dentro de
  `SCOPED_MODELS`, relacionado con `Project` mediante M:N implícita de Prisma.
- **Rationale**: FR-013 pide etiquetas propias del tenant, reutilizables y filtrables. La tabla
  de unión implícita no tiene `tenantId`, pero solo es alcanzable a través de `Project` y `Tag`,
  ambos escopados, así que el aislamiento (FR-003) se conserva; los tests de integración lo
  verifican.
- **Alternatives considered**: campo `tags String[]`/JSON en `Project` (rechazada: MySQL sin
  arrays nativos, filtros pobres, sin renombrado centralizado); tabla de unión explícita con
  `tenantId` (rechazada: más código sin ganancia real de seguridad — se documenta como opción
  si una auditoría futura exige scoping físico en la unión).

## D4 — Tipo de proceso: modelo `ProcessType` (catálogo por tenant)

- **Decision**: nuevo modelo `ProcessType` (`tenantId`, `name`, único por `[tenantId, name]`)
  en `SCOPED_MODELS`; `Project.processTypeId` nullable con `onDelete: SetNull`.
- **Rationale**: decidido en la clarificación (catálogo del tenant, no texto libre). `SetNull`
  implementa el edge case «al eliminar un tipo en uso, los proyectos quedan sin tipo» (FR-021)
  directamente en la BD.
- **Alternatives considered**: texto libre con sugerencias (rechazada por el usuario en la
  clarificación); lista fija global (rechazada: inflexible para dominios de cliente distintos).

## D5 — Responsable del proyecto: `Project.ownerId → User` con `SetNull`

- **Decision**: añadir `ownerId String?` a `Project` con relación a `User` (`onDelete:
  SetNull`), simétrico a `Task.assigneeId` ya existente.
- **Rationale**: FR-001/FR-011; `SetNull` cubre el edge case del responsable eliminado («sin
  asignar») sin lógica adicional. El nombre `owner` distingue del `assignee` de tareas.
- **Alternatives considered**: reutilizar un rol de membresía por proyecto (rechazada: no hay
  modelo de membresía por proyecto en FASE 2; sobrediseño).

## D6 — Lógica de negocio en `src/lib/projects/`, Server Actions delgadas

- **Decision**: `queries.ts` y `mutations.ts` reciben el cliente escopado (`ScopedPrismaClient`)
  y un `actor` (`{ userId, role }`) como parámetros; las Server Actions (`actions.ts` junto a la
  ruta) solo resuelven sesión/cliente, delegan, mapean errores (`mapGatingError`,
  `ForbiddenError`) y llaman a `revalidatePath`.
- **Rationale**: el Principio II exige pruebas de la lógica de negocio; inyectar el cliente
  permite testear contra la BD real con `scopedClientFor(tenantId)` sin montar NextAuth (mismo
  patrón que los tests de FASE 1). Server Actions en vez de route handlers: menos superficie,
  integración directa con formularios RHF y `revalidatePath` para SC-008.
- **Alternatives considered**: route handlers REST (rechazada: sin consumidor externo, más
  boilerplate); lógica dentro de las actions (rechazada: obliga a testear vía HTTP/mocks de
  sesión, frágil).

## D7 — Permisos por rol en `src/lib/authz-projects.ts` (puro)

- **Decision**: helpers puros que implementan FR-018: `canManageProjects(role)` (ADMIN,
  MANAGER, MANGO), `canEditProject(actor, project)` (gestión, o MEMBER cuando es `ownerId` del
  proyecto o `assigneeId` de alguna de sus tareas), `canDeleteProject(role)`,
  `canManageTasks(role)` (todos salvo VIEWER), `canManageCatalogs(role)` (ADMIN/MANAGER para
  etiquetas renombrar/eliminar y tipos de proceso). Se aplican en `mutations.ts` (servidor,
  fuente de verdad) y en la UI para ocultar acciones.
- **Rationale**: separa la matriz de permisos (testeable en unit) de su aplicación; `authz.ts`
  existente cubre rol/feature de rutas, no reglas por entidad, así que se añade un módulo
  paralelo sin tocar el existente.
- **Alternatives considered**: checks inline en cada mutación (rechazada: duplicación y sin
  test de matriz); middleware por ruta (rechazada: la regla depende de datos del proyecto, no
  solo de la ruta).

## D8 — Listado: RSC + `searchParams`; avance sin N+1

- **Decision**: el listado y sus filtros viven en la URL (`?q=&status=&priority=&ownerId=&clientId=&processTypeId=&tag=&page=`),
  la página es un RSC que llama a `queries.listProjects` (paginación `take/skip`, 20 por
  página). El avance por proyecto se calcula con **una** consulta agregada por página
  (`task.groupBy` por `processId→projectId` y `status` sobre los IDs visibles) y se combina en
  memoria.
- **Rationale**: SC-005 (200 proyectos, < 1 s) y Principio IV (RSC-first, sin N+1); URLs
  compartibles y filtros combinables (FR-012) gratis con `searchParams`.
- **Alternatives considered**: TanStack Query client-side (rechazada: manda datos completos al
  cliente, rompe RSC-first); campo `progress` materializado en `Project` (rechazada:
  desnormalización prematura; revisar si el volumen lo exige en el futuro).

## D9 — Panel: secciones reescritas como RSC con islas cliente mínimas

- **Decision**: `projects-section.tsx` (todos los proyectos del tenant, filtro por estado),
  `tasks-section.tsx` (tareas del usuario actual o sin responsable, filtro hoy/mañana/semana) y
  `summary-cards.tsx` (tareas de hoy y progreso semanal, mismo alcance personal) se reescriben
  para leer datos vía `queries.ts` en el servidor. Los filtros navegan con `searchParams` del
  dashboard; el checkbox de completar tarea es una isla cliente que invoca la Server Action
  `toggleTaskDone` + `revalidatePath("/dashboard")`.
- **Rationale**: implementa la decisión «mixto» de la clarificación y SC-003/SC-008 con el
  mínimo JS en cliente; los botones «Nuevo»/«Nueva tarea» enlazan a los flujos reales de
  creación (FR-014/FR-015).
- **Alternatives considered**: estado local con TanStack Query y optimistic updates
  (rechazada para FASE 2: `revalidatePath` cumple SC-008 con mucho menos código; puede
  añadirse después si la latencia percibida lo justifica).

## D10 — Tests de integración sobre la BD real (patrón FASE 1)

- **Decision**: los tests de integración crean dos tenants efímeros, siembran datos y verifican
  CRUD, permisos, aislamiento (SC-004), cuota concurrente (reusa el patrón de
  `quota-concurrency.test.ts`), filtros/paginación y avance derivado; limpieza en `afterAll`.
- **Rationale**: es el patrón ya establecido en `tests/integration/` (determinista, sin mocks
  de Prisma) y la constitución exige pruebas de la lógica de negocio con datos.
- **Alternatives considered**: mockear Prisma (rechazada: valida poco y se rompe con el
  scoping); SQLite en memoria (rechazada: difiere de MySQL en enums/collation).
