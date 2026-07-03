# Contratos: Server Actions de Gestión de Proyectos

**Fecha**: 2026-07-02 · **Data model**: [../data-model.md](../data-model.md)

Superficie expuesta por la feature (no hay API REST externa). Todas las actions viven en
`src/app/(main)/dashboard/projects/actions.ts` (`"use server"`), y comparten el mismo sobre:

```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }; // mensaje en español, apto para Sonner
```

Comportamiento común:

- Resuelven el cliente con `getTenantDb()` (lanza sin tenant) y el actor desde la sesión.
- Validan la entrada con los esquemas Zod de `src/lib/projects/schemas.ts`; entrada inválida →
  `{ ok: false, error }` con el primer mensaje de validación.
- Autorización con `authz-projects.ts`; denegación → `{ ok: false, error: "Acceso denegado…" }`
  (las acciones no permitidas tampoco se muestran en la UI, FR-018).
- Errores de gating traducidos con `mapGatingError` (cuota → mensaje con límite y sugerencia de
  ampliación, FR-004).
- Tras mutar: `revalidatePath("/dashboard")` y `revalidatePath("/dashboard/projects")` (y el
  detalle cuando aplica) para SC-008.

## Proyectos

| Action | Entrada (Zod) | Salida | Permiso | FR |
|---|---|---|---|---|
| `createProject` | `projectInput`: `{ name: string(1..200); description?; clientId?; priority?; processTypeId?; status?; startDate?; endDate?; ownerId?; tagIds?: string[] }` | `ActionResult<{ id }>` | gestión (ADMIN/MANAGER/MANGO) | FR-001, FR-004 |
| `updateProject` | `{ id } & projectInput` (parcial) | `ActionResult` | gestión, o MEMBER elegible (owner del proyecto o assignee de alguna tarea) | FR-002, FR-018 |
| `deleteProject` | `{ id }` | `ActionResult` | solo gestión | FR-002 |

Notas:

- `projectInput` aplica `endDate >= startDate` (FR-007) y verifica que `clientId`,
  `processTypeId`, `ownerId` y `tagIds` pertenezcan al tenant (el cliente escopado ya lo fuerza;
  `ownerId` se verifica contra `User` activo del tenant, FR-011).
- `createProject` corre dentro de `createProjectWithQuota` (transacción serializable) y crea el
  `Process` por defecto «General» en la misma transacción.
- `deleteProject` borra en cascada procesos y tareas (FK `onDelete: Cascade` existentes); la UI
  exige confirmación explícita con el aviso de arrastre (FR-002).

## Tareas

| Action | Entrada (Zod) | Salida | Permiso | FR |
|---|---|---|---|---|
| `createTask` | `taskInput`: `{ projectId; title: string(1..200); description?; assigneeId?; dueDate?; status? }` | `ActionResult<{ id }>` | todos salvo VIEWER | FR-009 |
| `updateTask` | `{ id } & taskInput` (parcial, sin `projectId`) | `ActionResult` | todos salvo VIEWER | FR-009 |
| `toggleTaskDone` | `{ id; done: boolean }` | `ActionResult` | todos salvo VIEWER | FR-009, FR-015 |
| `deleteTask` | `{ id }` | `ActionResult` | todos salvo VIEWER | FR-009 |

Notas:

- `createTask` resuelve el proceso por defecto del proyecto; `assigneeId` debe ser usuario
  activo del tenant (FR-011).
- Cambios de estado recalculan el avance mostrado vía revalidación (FR-010, SC-008).

## Etiquetas

| Action | Entrada (Zod) | Salida | Permiso | FR |
|---|---|---|---|---|
| `createTag` | `{ name: string(1..50) }` | `ActionResult<{ id }>` | todos salvo VIEWER (creación al vuelo) | FR-013 |
| `renameTag` | `{ id; name }` | `ActionResult` | ADMIN/MANAGER | FR-013 |
| `deleteTag` | `{ id }` | `ActionResult` | ADMIN/MANAGER | FR-013 |

- Unicidad `[tenantId, name]`: conflicto → `{ ok: false, error: "Ya existe una etiqueta…" }`.

## Tipos de proceso

| Action | Entrada (Zod) | Salida | Permiso | FR |
|---|---|---|---|---|
| `createProcessType` | `{ name: string(1..80) }` | `ActionResult<{ id }>` | ADMIN/MANAGER (también al vuelo desde el formulario) | FR-021 |
| `renameProcessType` | `{ id; name }` | `ActionResult` | ADMIN/MANAGER | FR-021 |
| `deleteProcessType` | `{ id }` | `ActionResult` | ADMIN/MANAGER | FR-021 |

- Eliminar un tipo en uso deja los proyectos «sin tipo» (`SetNull` en BD).

## Lecturas (no son actions: funciones RSC en `src/lib/projects/queries.ts`)

| Función | Entrada | Salida | Uso |
|---|---|---|---|
| `listProjects` | `db`, `filters` (`q, status, priority, ownerId, clientId, processTypeId, tagId, page`) | página de proyectos + `total` + avance por proyecto | `/dashboard/projects` (FR-012) |
| `getProjectDetail` | `db`, `projectId` | proyecto + tareas (con flag `overdue`) + avance | `/dashboard/projects/[projectId]` (FR-008, FR-019) |
| `getPanelProjects` | `db`, `status?` | todos los proyectos del tenant (estado, avance, `endDate`) | panel «Proyectos» (FR-014) |
| `getPanelTasks` | `db`, `userId`, `range` (`today\|tomorrow\|week`) | tareas asignadas al usuario o sin responsable | panel «Tareas» (FR-015) |
| `getPanelSummary` | `db`, `userId` | `{ tasksToday, weeklyProgressPct, … }` | tarjetas de resumen (FR-016) |
| `listTags` / `listProcessTypes` / `listMembers` / `listClients` | `db` | catálogos para filtros y formularios | FR-012, FR-013, FR-021 |
