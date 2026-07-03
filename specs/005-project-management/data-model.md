# Data Model: Gestión de Proyectos y Tareas (FASE 2)

**Fecha**: 2026-07-02 · **Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

Cambios sobre `prisma/schema.prisma`, aplicados con **una** migración versionada
(`npm run db:migrate`, nombre sugerido: `project_management`). Los modelos de FASE 1 no
mencionados aquí no cambian.

## Enums nuevos

```prisma
/// Estado de un proyecto (alineado con el tablero Kanban de la FASE 3).
enum ProjectStatus {
  PENDING      // Pendiente
  IN_PROGRESS  // En proceso
  IN_REVIEW    // En revisión
  COMPLETED    // Finalizado
  ARCHIVED     // Archivado
}

/// Prioridad de un proyecto.
enum ProjectPriority {
  LOW     // Baja
  MEDIUM  // Media
  HIGH    // Alta
  URGENT  // Urgente
}
```

Las etiquetas visibles en español viven en un mapa de UI (`src/lib/projects/labels.ts` o
equivalente), nunca hardcodeadas por pantalla.

## Modelo `Project` (modificado)

| Campo | Tipo | Cambio | Regla |
|---|---|---|---|
| `status` | `ProjectStatus @default(PENDING)` | antes `String?` | conjunto cerrado (FR-005) |
| `priority` | `ProjectPriority @default(MEDIUM)` | nuevo | conjunto cerrado (FR-006) |
| `startDate` | `DateTime?` | nuevo | fecha de inicio (FR-001) |
| `endDate` | `DateTime?` | nuevo | cierre estimado; `endDate >= startDate` se valida en Zod, no en BD (FR-007) |
| `ownerId` | `String?` + relación `owner User? @relation("ProjectOwner", …, onDelete: SetNull)` | nuevo | responsable «sin asignar» si el usuario desaparece (FR-011) |
| `processTypeId` | `String?` + relación `processType ProcessType? (onDelete: SetNull)` | nuevo | tipo del catálogo; `SetNull` implementa el edge case de FR-021 |
| `tags` | `Tag[]` (M:N implícita) | nuevo | varias etiquetas por proyecto (FR-013) |

Índices nuevos: `@@index([tenantId, status])`, `@@index([ownerId])`, `@@index([processTypeId])`
(filtros del listado y del panel).

**Migración de datos**: `status String? → enum`: los valores existentes (solo seed/dev) se
mapean a `PENDING` si son nulos o no reconocidos. Sin datos productivos que preservar.

`User` gana las relaciones inversas: `ownedProjects Project[] @relation("ProjectOwner")`.

## Modelo `Tag` (nuevo)

```prisma
model Tag {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  projects Project[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("tags")
}
```

- Unicidad de nombre **por tenant** (Key Entities de la spec).
- Entra en `SCOPED_MODELS` (`src/lib/tenant-db.ts`).
- La tabla de unión implícita `_ProjectToTag` no tiene `tenantId`; solo es alcanzable vía
  `Project`/`Tag`, ambos escopados (research D3).
- Eliminar una etiqueta la desasocia de los proyectos (M:N), sin tocar los proyectos.

## Modelo `ProcessType` (nuevo)

```prisma
model ProcessType {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  projects Project[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("process_types")
}
```

- Catálogo por tenant (clarificación 2026-07-02); gestión restringida a ADMIN/MANAGER (FR-021).
- Entra en `SCOPED_MODELS`.

## `Tenant` (modificado)

Relaciones inversas nuevas: `tags Tag[]`, `processTypes ProcessType[]`.

## `Process` y `Task` (sin cambios de esquema)

- Al crear un proyecto, `mutations.createProject` crea un `Process` por defecto
  (`name: "General"`, `order: 0`) en la misma transacción (research D2).
- Las tareas de FASE 2 se crean siempre en el proceso por defecto del proyecto.
- `TaskStatus` existente (`TODO`/`IN_PROGRESS`/`DONE`) ⇔ Pendiente / En proceso / Finalizada.

## Reglas de dominio (viven en `src/lib/projects/`)

| Regla | Dónde | FR |
|---|---|---|
| `name` obligatorio, resto opcional | `schemas.ts` (Zod) | FR-001 |
| `endDate >= startDate` | `schemas.ts` (`refine`) | FR-007 |
| Avance = tareas `DONE` / total tareas del proyecto (0 % sin tareas) | `queries.ts` (agregación `groupBy`) | FR-010 |
| Responsable/asignado debe ser usuario **activo del mismo tenant** | `mutations.ts` (verificación previa) | FR-011 |
| Cuota de proyectos atómica | reutiliza `createProjectWithQuota` (extendida con los campos nuevos) | FR-004 |
| Tarea vencida = `dueDate < hoy` y `status != DONE` | `queries.ts` (flag derivado) | FR-019 |
| Matriz de permisos por rol | `authz-projects.ts` | FR-018 |

## Diagrama de relaciones (resumen)

```text
Tenant 1─N Project N─1 Client?
              │ N─1 User? (owner)
              │ N─1 ProcessType?
              │ N─M Tag
              └ 1─N Process 1─N Task N─1 User? (assignee)
```

## Transiciones de estado

- `ProjectStatus`: sin máquina de estados estricta — cualquier transición manual es válida en
  FASE 2 (el Kanban de FASE 3 podrá restringirlas). «Archivado» es un estado más del selector.
- `TaskStatus`: `TODO ↔ IN_PROGRESS ↔ DONE` libre; el checkbox del panel alterna
  `DONE ↔ TODO`.
