# Data Model — Core del sistema y arquitectura multitenant

**Feature**: `002-core-multitenant` · **Fecha**: 2026-06-22 · **ORM**: Prisma 7 (MySQL/MariaDB)

Convención: todas las entidades de **negocio** llevan `tenantId` (discriminador de aislamiento) e
índice por `tenantId`. `User`, `Plan` y los modelos del adapter de NextAuth quedan **fuera** del
scoping automático (ver [contracts/tenant-data-access.md](./contracts/tenant-data-access.md)).

## Enums

| Enum | Valores | Notas |
|---|---|---|
| `UserRole` | `ADMIN`, `MANGO`, `MANAGER`, `MEMBER`, `VIEWER` | FASE 1 usa `ADMIN` (admin de tenant) y `MANGO` (global). Los demás se reservan para roles intra-tenant futuros. |
| `UserStatus` | `ACTIVE`, `INACTIVE`, `SUSPENDED` | Sin cambios respecto al esquema actual. |
| `PlanCode` | `GRATUITO`, `PRO`, `PRO_PLUS` | Código estable del plan. |
| `BillingCycle` | `MONTHLY`, `YEARLY` | Ciclo de la suscripción. |
| `SubscriptionStatus` | `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED` | ↔ activa / en_prueba / vencida / cancelada (FR-013). |

## Entidades

### Tenant (organización)

Unidad de aislamiento. Agrupa usuarios y todas las entidades de negocio.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `String` cuid | PK; valor de `tenantId` referenciado por el resto. |
| `name` | `String` | Nombre de la organización; obligatorio (≥ 2). |
| `slug` | `String?` unique | Identificador legible opcional (reservado para uso futuro). |
| `createdAt`/`updatedAt` | `DateTime` | Auditoría. |

Relaciones: `users User[]`, `subscription Subscription?`, y `clients/projects/processes/tasks/files/
events`. Borrado de un tenant ⇒ cascada a sus entidades de negocio.

### Plan

Definición parametrizable de un nivel de servicio. Las **cuotas son columnas nullable** (`null` =
ilimitado) para ajustarlas sin tocar código (FR-010). Las **features** viven en config tipada
(`src/lib/plans/definitions.ts`), no en la DB.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `String` cuid | PK. |
| `code` | `PlanCode` unique | `GRATUITO`/`PRO`/`PRO_PLUS`. |
| `name` | `String` | Nombre visible. |
| `priceMonthly` | `Int` | COP/mes (Gratuito = 0; Pro = 30000; Pro+ = 50000). |
| `priceYearly` | `Int` | COP/año con descuento. |
| `maxProjects` | `Int?` | Cuota de proyectos; `null` = ilimitado. |
| `maxUsers` | `Int?` | Cuota de usuarios; `null` = ilimitado. |
| `maxStorageBytes` | `BigInt?` | Cuota de almacenamiento en bytes; `null` = ilimitado. |
| `createdAt`/`updatedAt` | `DateTime` | Auditoría. |

Sembrado por `prisma/seed.ts` (valores por defecto ajustables; ver `research.md` §5).

### Subscription

Vínculo vigente entre una organización y un plan (1:1 con `Tenant` en esta fase). Sin cobro real aún.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `String` cuid | PK. |
| `tenantId` | `String` unique | FK→`Tenant`; 1 suscripción vigente por tenant. |
| `planId` | `String` | FK→`Plan`. |
| `status` | `SubscriptionStatus` | Por defecto `ACTIVE` en altas. |
| `cycle` | `BillingCycle` | Por defecto `MONTHLY`. |
| `currentPeriodEnd` | `DateTime?` | Vigencia; sin lógica de facturación aún. |
| `createdAt`/`updatedAt` | `DateTime` | Auditoría. |

### User

Persona con acceso. Se amplía el modelo actual con `tenantId` (nullable) y se usa `role`.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `String` cuid | PK. |
| `name` | `String` | Obligatorio. |
| `email` | `String` unique | Único **global** (un email no puede ser admin y mango a la vez). |
| `password` | `String?` | Hash bcrypt; `null` solo si fuese OAuth. |
| `image` | `String?` | Avatar. |
| `role` | `UserRole` | `ADMIN` para usuarios de tenant; `MANGO` para el global. Default `ADMIN` en registro. |
| `status` | `UserStatus` | Default `ACTIVE`. |
| `tenantId` | `String?` | FK→`Tenant`. **Null obligatorio para `MANGO`**; no null para `ADMIN`. |
| `createdAt`/`updatedAt` | `DateTime` | Auditoría. |

Invariante (validada en aplicación): `role = MANGO ⟺ tenantId = null`. En FASE 1, un `Tenant` tiene
exactamente un `ADMIN` (FR-015a).

### Entidades de negocio escopadas

Todas comparten el patrón: `id` (cuid PK), `tenantId` (FK→`Tenant`, `@@index([tenantId])`),
`createdAt`/`updatedAt`. Resumen de campos propios y relaciones:

| Entidad | Campos propios (mínimos FASE 1) | Relaciones |
|---|---|---|
| `Client` | `name`, `email?`, `phone?` | `tenant`; `projects Project[]` |
| `Project` | `name`, `description?`, `status?` | `tenant`; `client Client?`; `processes Process[]` (cuenta para `maxProjects`) |
| `Process` | `name`, `order Int` | `tenant`; `project`; `tasks Task[]` |
| `Task` | `title`, `description?`, `status`, `dueDate?` | `tenant`; `process`; `assignee User?` |
| `FileAsset` | `name`, `path`, `sizeBytes BigInt`, `mimeType?` | `tenant`; `project?` (suma para `maxStorageBytes`) |
| `Event` | `title`, `startsAt`, `endsAt?` | `tenant`; `project?` |

> En esta fase estas entidades existen como soporte del aislamiento y de las cuotas; sus features
> completas (Kanban, Gantt, calendario) corresponden a fases posteriores del ROADMAP.

### PasswordResetToken

Token de un solo uso para recuperación de contraseña (FR-018). **No** es entidad de negocio: no lleva
`tenantId` y queda fuera del scoping.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `String` cuid | PK. |
| `userId` | `String` | FK→`User`, `onDelete: Cascade`. |
| `tokenHash` | `String` unique | Hash del token (nunca se almacena en claro). |
| `expiresAt` | `DateTime` | Caducidad corta (p. ej. 1 h). |
| `usedAt` | `DateTime?` | Marca de uso único; `null` = sin usar. |
| `createdAt` | `DateTime` | Auditoría / rate-limit. |

`@@index([userId])`. Un token es válido si `usedAt == null && expiresAt > now`.

## Reglas de validación (resumen)

- **Registro**: `organizationName` (≥ 2), `name` (≥ 2), `email` válido y único, `password` con fuerza
  mínima. Crea `Tenant` + `User(ADMIN)` + `Subscription(GRATUITO, ACTIVE)` en una transacción.
- **Cuotas**: antes de crear `Project`/usuario/subir `FileAsset`, `assertWithinQuota` compara el
  `count`/suma bajo el tenant con la cuota del plan; `null` ⇒ sin límite (FR-011).
- **Descenso de plan**: permitido aun con uso > cuota destino; bloquea nuevas creaciones del recurso
  excedido hasta volver bajo la cuota (FR-011a). No borra datos.
- **Aislamiento**: toda lectura/escritura de entidades de negocio pasa por `getTenantDb()`; el
  `tenantId` entrante del cliente se ignora y se fija desde el contexto (FR-002/FR-003).

## Índices y rendimiento

- `@@index([tenantId])` en `Client`, `Project`, `Process`, `Task`, `FileAsset`, `Event`,
  `Subscription`.
- `User.email` unique; `User.tenantId` indexado.
- `Plan.code` unique; `Subscription.tenantId` unique.

## Cambios respecto al esquema actual

1. Añadir `MANGO` a `UserRole`; añadir enums `PlanCode`, `BillingCycle`, `SubscriptionStatus`.
2. `User`: nuevos campos `tenantId` (nullable, FK) y uso efectivo de `role`.
3. Nuevos modelos: `Tenant`, `Plan`, `Subscription`, `Client`, `Project`, `Process`, `Task`,
   `FileAsset`, `Event`, `PasswordResetToken`.
4. Migración versionada en `prisma/migrations/` (`npm run db:migrate`).
5. `prisma/seed.ts`: alta de los 3 planes con cuotas por defecto.
