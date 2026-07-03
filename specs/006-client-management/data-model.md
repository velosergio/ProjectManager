# Data Model — Gestión de Clientes (FASE 3)

## Resumen

La fase **no crea modelos nuevos**: `Client` existe desde la FASE 1 con los tres campos que pide
el spec (nombre, email, teléfono) y `Tag` existe desde la FASE 2. El único cambio de esquema es
la relación M:N implícita `Client ↔ Tag` (decisión 1 de [research.md](./research.md)).

## Cambios en `prisma/schema.prisma`

### `Client` (existente — solo gana la relación)

```prisma
model Client {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  email     String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  projects Project[]
  tags     Tag[]     // ← NUEVO: etiquetas del catálogo único del tenant

  @@index([tenantId])
  @@map("clients")
}
```

### `Tag` (existente — solo gana la relación inversa)

```prisma
model Tag {
  // ... campos existentes sin cambios ...
  projects Project[]
  clients  Client[]  // ← NUEVO
}
```

### Migración

Una migración versionada (`npm run db:migrate`, nombre sugerido `client_tags`) que crea la tabla
de unión implícita de Prisma (`_ClientToTag`) con sus claves foráneas e índices. Sin cambios de
datos ni backfill.

## Reglas de validación (capa Zod, `src/lib/clients/schemas.ts`)

| Campo | Regla |
|---|---|
| `name` | obligatorio, recortado, 1–120 caracteres |
| `email` | opcional; si se envía, formato de email válido; cadena vacía → `null` |
| `phone` | opcional; recortado, máx. 30 caracteres; cadena vacía → `null` |
| `tagIds` | opcional; lista de ids; toda etiqueta debe existir en el tenant (verificación en mutación, patrón `assertTagsInTenant` de FASE 2) |

Filtros del listado (parseados de `searchParams` con `.catch()`, patrón FASE 2):

| Filtro | Regla |
|---|---|
| `q` | texto libre; busca en `name`, `email`, `phone` con `contains` (colación AI/CI) |
| `tagId` | id de etiqueta del tenant |
| `active` | booleano; `true` → clientes con algún proyecto en estado no final |
| `page` | entero ≥ 1, por defecto 1; tamaño de página fijo en servidor |

## Invariantes y semántica

- **Aislamiento (FR-014)**: todo acceso pasa por el cliente escopado (`getTenantDb()`); `Client`
  y `Tag` ya están en `SCOPED_MODELS`. La relación M:N solo se toca desde extremos escopados.
- **Nombres duplicados**: permitidos dentro del tenant (sin `@@unique` sobre `name`); email y
  teléfono desambiguan en la UI.
- **Borrado (FR-005)**: `Project.client` ya declara `onDelete: SetNull` → eliminar un cliente
  desvincula sus proyectos sin tocarlos. La mutación devuelve el conteo de proyectos afectados y
  el diálogo lo muestra antes de confirmar.
- **Etiquetas**: quitar una etiqueta de un cliente solo modifica la relación (FR-012); eliminar
  una etiqueta del catálogo (flujo FASE 2) la desconecta de proyectos y clientes por cascada de
  la tabla de unión.
- **Seguimiento (FR-007)**: derivado en lectura — `groupBy(status)` sobre los proyectos del
  cliente + `última actividad = max(client.updatedAt, _max(projects.updatedAt))`. Sin campos
  denormalizados.
- **Proyecto activo**: `status ∉ { COMPLETED, ARCHIVED }`.

## Estados y transiciones

`Client` no tiene máquina de estados propia (sin campo `status`). Los estados que muestra el
seguimiento son los de `ProjectStatus` (FASE 2), solo leídos.
