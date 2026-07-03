# Contratos — Server Actions de Gestión de Clientes (FASE 3)

Las mutaciones se exponen como Server Actions en
`src/app/(main)/dashboard/clients/actions.ts`, siguiendo el contrato de la FASE 2:

```ts
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
```

Envoltorios finos: resuelven sesión y cliente escopado (`getTenantContext()` + `getTenantDb()`),
delegan en `src/lib/clients/mutations.ts`, traducen errores de dominio a mensajes en español
(consumidos por Sonner) y revalidan `/dashboard/clients` (y el detalle afectado). La
**autorización** (`canManageClients`: `ADMIN` | `MANAGER` | `MANGO`) se aplica dentro de las
mutaciones (fuente de verdad); la UI solo oculta acciones.

Las **lecturas** (listado, detalle, seguimiento) no son actions: las hacen los RSC directamente
vía `src/lib/clients/queries.ts` con los filtros parseados de `searchParams`.

## Acciones

### `createClient(input: unknown): Promise<ActionResult<{ id: string }>>`

- **Input** (validado con Zod, ver [data-model.md](../data-model.md)): `{ name, email?, phone?, tagIds? }`.
- **Efecto**: crea el cliente en el tenant de la sesión, conectando etiquetas si vienen.
- **Errores**: validación (nombre vacío, email inválido), `ForbiddenError` (rol sin gestión),
  etiqueta inexistente en el tenant (`NotFoundError`).
- **Cubre**: FR-002, FR-003, FR-011, FR-014.

### `updateClient(clientId: string, input: unknown): Promise<ActionResult>`

- **Input**: mismo shape que `createClient`; `tagIds` reemplaza el conjunto de etiquetas (`set`).
- **Efecto**: actualiza datos y etiquetas del cliente. Cliente de otro tenant → `NotFoundError`
  (indistinguible de inexistente).
- **Cubre**: FR-003, FR-004, FR-011, FR-012, FR-014.

### `deleteClient(clientId: string): Promise<ActionResult>`

- **Efecto**: elimina el cliente; sus proyectos quedan desvinculados (`SetNull`, garantía de
  esquema). No toca etiquetas del catálogo.
- **Cubre**: FR-005, FR-014.

### `getClientDeletionImpact(clientId: string): Promise<ActionResult<{ projectCount: number }>>`

- **Efecto**: solo lectura; devuelve cuántos proyectos quedarán sin cliente, para el texto del
  diálogo de confirmación.
- **Cubre**: FR-005 (advertencia previa).

### `createTagForClient(input: unknown): Promise<ActionResult<{ id: string; name: string }>>`

- **Input**: `{ name }`. Crea la etiqueta en el catálogo único del tenant (o falla con
  `DuplicateNameError` si ya existe, mensaje en español).
- **Nota**: reutiliza `createTag` de `src/lib/projects/mutations.ts` si el contrato encaja; si
  no, delega en una mutación equivalente de `lib/clients` que escribe el mismo modelo `Tag`.
- **Cubre**: FR-011 (crear etiqueta al asignar).

## Acción en la feature de proyectos (creación al vuelo)

### `createClientInline(input: unknown): Promise<ActionResult<{ id: string; name: string }>>`

- **Ubicación**: `src/app/(main)/dashboard/projects/actions.ts` (la consume
  `project-form-dialog.tsx`).
- **Input**: `{ name, email?, phone? }` (sin etiquetas: alta mínima).
- **Efecto**: delega en el mismo `createClient` de `src/lib/clients/mutations.ts`; devuelve
  `{ id, name }` para seleccionar el cliente recién creado en el selector sin desmontar el
  formulario del proyecto. Revalida `/dashboard/clients`.
- **Errores**: mismos que `createClient`; ante error o cancelación el formulario del proyecto
  conserva sus valores (el subdiálogo no toca el estado RHF del padre).
- **Cubre**: FR-013, SC-004.

## Consultas (RSC, no actions)

| Función (`src/lib/clients/queries.ts`) | Devuelve | Cubre |
|---|---|---|
| `listClients(db, filters)` | página de clientes (`{ items, total, page, pageSize }`) con etiquetas y `_count` de proyectos; aplica `q`, `tagId`, `active` | FR-001, FR-009, FR-010, FR-015 |
| `getClientDetail(db, clientId)` | datos + etiquetas + proyectos asociados (id, nombre, estado) + seguimiento (`countsByStatus`, `lastActivityAt`) o `null` si no existe/otro tenant | FR-006, FR-007, FR-008, FR-014 |

## Contrato de UI (rutas)

| Ruta | Contenido |
|---|---|
| `/dashboard/clients` | listado paginado con búsqueda y filtros por `searchParams` (`q`, `tagId`, `active`, `page`); estados vacío/carga/error en español |
| `/dashboard/clients/[clientId]` | página dedicada del detalle (URL propia, enlazable); cliente inexistente u de otro tenant → `notFound()` (404) |
