# Phase 1 — Data Model: Modal de Configuración unificado

## Entidad nueva: `NotificationPreference`

Preferencias de notificación de una persona usuaria. Relación **1:1** con `User`.

| Campo | Tipo | Reglas | Default |
|-------|------|--------|---------|
| `id` | String | Clave primaria, `cuid()` | autogenerado |
| `userId` | String | **Único** (`@unique`); FK a `User.id`; `onDelete: Cascade` | — |
| `emailAlerts` | Boolean | Avisos por correo sobre actividad de cuenta/proyectos | `true` |
| `productUpdates` | Boolean | Novedades de producto y anuncios | `false` |
| `taskReminders` | Boolean | Recordatorios de tareas próximas a vencer | `true` |
| `createdAt` | DateTime | `@default(now())` | now |
| `updatedAt` | DateTime | `@updatedAt` | auto |

- **Mapeo de tabla**: `@@map("notification_preferences")`.
- **Relación en `User`**: `notificationPreference NotificationPreference?` (1:1 opcional desde el lado
  de `User`; se crea on-demand vía `upsert`).
- **Ubicación en el schema**: modelo en la sección AUTH, justo tras `PasswordResetToken` y antes del
  bloque `// NEGOCIO`.

### Migración

- Comando: `npm run db:migrate -- --name notification_preferences`.
- Genera `prisma/migrations/<timestamp>_notification_preferences/migration.sql` y regenera el cliente
  (`@/generated/prisma/client` exporta el tipo `NotificationPreference`).

## Vista serializable: `NotificationPreferenceView`

Forma que consume la UI (sin metadatos de fila). Idéntica en `lib`, componentes, sidebar y layout.

```ts
type NotificationPreferenceView = {
  emailAlerts: boolean;
  productUpdates: boolean;
  taskReminders: boolean;
};
```

- Derivada de la fila con `toView(pref)`.
- Validada con `notificationPreferenceSchema` (Zod: tres booleanos requeridos).

## Entidad existente afectada: `User` (campos editables del perfil)

No cambia su forma salvo la nueva relación. Campos relevantes para esta feature:

| Campo | Uso en la feature | Editable |
|-------|-------------------|----------|
| `name` | Pestaña Cuenta — nombre | Sí (mín. 2 caracteres) |
| `image` | Pestaña Cuenta — avatar por URL; vacío ⇒ `null` | Sí (URL válida o vacío) |
| `email` | Pestaña Cuenta — solo lectura | No |
| `password` | Pestaña Cuenta — cambio con verificación de la actual | Sí (mín. 8; hash bcryptjs, coste 10) |
| `role` | Pestaña Plan — etiqueta de rol | No |

### Esquemas Zod (en `src/lib/profile.ts`)

- `profileSchema`: `{ name: string(min 2), image?: url | "" }`.
- `passwordChangeSchema`: `{ currentPassword: string(min 1), newPassword: string(min 8) }`.

### Reglas de negocio (validación / transiciones)

- `updateUserProfile`: guarda `name`; `image` vacío se persiste como `null`.
- `changeUserPassword`:
  1. Si la cuenta no tiene `password` ⇒ `Error("Esta cuenta no tiene una contraseña configurada.")`.
  2. Si `currentPassword` no coincide (`bcrypt.compare`) ⇒ `Error("La contraseña actual no es correcta.")`.
  3. En caso correcto ⇒ `bcrypt.hash(newPassword, 10)` y `user.update`.

## Entidad derivada (solo lectura): Plan y rol

No es una tabla nueva. Se compone en `layout.tsx` a partir de:

- `subscription` (`prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } })`).
- `planLabel`: `"Mango (global)"` si rol `MANGO`; si no, `PLAN_NAMES[planCode]`; o `null` si sin plan.
- `roleLabel`: mapeo `ROLE_LABELS[role]` (Administrador / Mango (global) / Gerente / Miembro / Lector).
