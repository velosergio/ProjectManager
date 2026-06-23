# Contrato — Acceso a datos escopado por tenant

**Módulo**: `src/lib/tenant-db.ts` · Cubre FR-002, FR-003, FR-004, FR-006.

## Propósito

Garantizar que **todo** acceso a entidades de negocio quede filtrado por el `tenantId` del contexto,
sin depender de la disciplina del código de feature. El cliente base de Prisma (`src/lib/prisma.ts`)
queda reservado para auth, planes, CLI y el adapter de NextAuth.

## Modelos escopados (allowlist)

`Client`, `Project`, `Process`, `Task`, `FileAsset`, `Event`, `Subscription`.

`User`, `Plan`, `PasswordResetToken`, `Account`, `Session`, `VerificationToken` **no** se escopan
automáticamente.

## API pública

```ts
// Cliente escopado al tenant de la sesión actual (admin) o al tenant seleccionado (mango).
// Lanza si no hay tenant resoluble en el contexto.
export async function getTenantDb(): Promise<ScopedPrismaClient>;

// Cliente global SIN scoping. Asevera role === "MANGO"; lanza ForbiddenError en caso contrario.
// Única vía autorizada para cruzar la frontera de tenant (consola mango).
export async function getAdminDb(): Promise<PrismaClient>;
```

## Comportamiento de la extensión (`query`)

Para cada operación sobre un modelo escopado:

| Operación | Transformación |
|---|---|
| `findMany`/`findFirst`/`count`/`aggregate`/`groupBy` | `where = { AND: [{ tenantId }, wherePrevio] }` |
| `findUnique`/`findUniqueOrThrow` | reescrita a `findFirst` con `tenantId` forzado |
| `create` | `data.tenantId = tenantId` (ignora el entrante) |
| `createMany` | cada fila recibe `tenantId` |
| `update`/`delete`/`upsert` | `where` recibe `tenantId`; `create/update` de `upsert` fija `tenantId` |
| `updateMany`/`deleteMany` | `where` recibe `tenantId` |

**Invariantes verificables**:
- I1: una consulta de lectura nunca devuelve filas con `tenantId` distinto al del contexto.
- I2: una escritura siempre persiste el `tenantId` del contexto, ignorando cualquier `tenantId`
  presente en `data`.
- I3: `getAdminDb()` invocado por un rol ≠ `MANGO` lanza y no ejecuta ninguna query.
- I4: `getTenantDb()` sin tenant resoluble (p. ej. mango sin selección) lanza antes de consultar.

## Errores

- `MissingTenantContextError` — no hay `tenantId` resoluble.
- `ForbiddenError` — `getAdminDb()` sin rol `MANGO`.

## Pruebas asociadas (Vitest)

- Aislamiento: sembrar Tenant A y B; con contexto A, `findMany` no ve datos de B (I1) — SC-001.
- Escritura: `create` con `tenantId` de B en `data` persiste con `tenantId` A (I2) — SC-002.
- `findUnique` por id de otro tenant ⇒ `null` (no revela existencia) — FR-004.
- `getAdminDb()` como `ADMIN` ⇒ lanza (I3) — SC-007.
