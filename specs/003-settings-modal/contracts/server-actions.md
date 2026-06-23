# Contrato — Server Actions

Todas las acciones son `"use server"`, resuelven la identidad con `getTenantContext()` y lanzan
`MissingTenantContextError("No hay sesión activa.")` si no hay sesión. **El `userId` nunca proviene
del cliente.**

## `src/server/profile.ts`

### `updateProfile(input: ProfileInput): Promise<void>`

- **Input**: `{ name: string; image?: string }` (validado por `profileSchema`).
- **Efecto**: actualiza `name` e `image` (vacío ⇒ `null`) del usuario de la sesión.
- **Errores**: `MissingTenantContextError` si no hay sesión; `ZodError` si el input es inválido.

### `changePassword(input: PasswordChangeInput): Promise<void>`

- **Input**: `{ currentPassword: string; newPassword: string }` (validado por `passwordChangeSchema`).
- **Efecto**: verifica la contraseña actual y guarda la nueva (hash bcryptjs, coste 10).
- **Errores**:
  - `MissingTenantContextError` si no hay sesión.
  - `Error("Esta cuenta no tiene una contraseña configurada.")` si `user.password` es nulo.
  - `Error("La contraseña actual no es correcta.")` si no coincide.
  - `ZodError` si el input es inválido (mensajes en español).

## `src/server/notifications.ts`

### `getNotificationPreferences(): Promise<NotificationPreferenceView>`

- **Efecto**: devuelve las preferencias del usuario, creándolas con defaults si no existen (`upsert`
  idempotente).
- **Salida**: `{ emailAlerts, productUpdates, taskReminders }`.
- **Errores**: `MissingTenantContextError` si no hay sesión.

### `updateNotificationPreferences(input: NotificationPreferenceInput): Promise<NotificationPreferenceView>`

- **Input**: `{ emailAlerts: boolean; productUpdates: boolean; taskReminders: boolean }` (validado por
  `notificationPreferenceSchema`).
- **Efecto**: persiste las preferencias del usuario (`upsert`); devuelve la vista guardada.
- **Errores**: `MissingTenantContextError` si no hay sesión; `ZodError` si el input es inválido.

## Funciones de lógica pura (en `src/lib/`)

| Función | Firma | Notas |
|---------|-------|-------|
| `updateUserProfile` | `(userId, ProfileInput) => Promise<User>` | `image` vacío ⇒ `null` |
| `changeUserPassword` | `(userId, PasswordChangeInput) => Promise<void>` | lanza `Error` en español |
| `getOrCreateNotificationPreferences` | `(userId) => Promise<NotificationPreferenceView>` | upsert con defaults |
| `updateNotificationPreferences` | `(userId, NotificationPreferenceInput) => Promise<NotificationPreferenceView>` | upsert idempotente |
