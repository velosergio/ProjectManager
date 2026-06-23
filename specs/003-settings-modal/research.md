# Phase 0 — Research: Modal de Configuración unificado

Este documento resuelve los puntos abiertos y los riesgos marcados durante la especificación,
verificándolos contra el código real del repositorio. No quedan `NEEDS CLARIFICATION`.

## R1 — Nombre real de `MissingTenantContextError`

- **Decisión**: Usar `MissingTenantContextError` importado de `@/lib/errors`.
- **Rationale**: Verificado en `src/lib/errors.ts`: la clase existe y ya la usa el `src/server/profile.ts`
  actual. Acepta un mensaje opcional, por lo que `new MissingTenantContextError("No hay sesión activa.")`
  es válido.
- **Alternativas consideradas**: Lanzar un `Error` genérico — rechazado por incoherencia con el patrón
  existente de errores de dominio.

## R2 — Contexto de identidad de la sesión

- **Decisión**: Obtener la identidad con `getTenantContext()` de `@/lib/tenant-context`; usar `ctx.userId`.
- **Rationale**: `getTenantContext()` devuelve `TenantContext | null` (verificado). Todas las Server
  Actions deben comprobar `if (!ctx) throw new MissingTenantContextError(...)` antes de operar. El
  `userId` nunca proviene del cliente (FR-016).
- **Alternativas consideradas**: Leer la sesión de NextAuth directamente en cada action — rechazado;
  `getTenantContext()` ya encapsula esa resolución y es el patrón del repo.

## R3 — Escopado por `userId` vs. `tenantId`

- **Decisión**: Perfil y notificaciones se leen/escriben con el **cliente base** `@/lib/prisma`,
  escopados por `userId` de la sesión (no por `tenantId`).
- **Rationale**: Son datos de la propia persona usuaria, no entidades de negocio multitenant. La regla
  de `getTenantDb()`/`getAdminDb()` aplica a entidades de negocio (Project, Task, etc.), no al perfil
  propio. `CLAUDE.md` permite el cliente base para datos del propio usuario de la sesión.
- **Alternativas consideradas**: Forzar `getTenantDb()` — rechazado; `User` y `NotificationPreference`
  no llevan filtro por `tenantId` y un usuario puede tener `tenantId` nulo.

## R4 — Exports reales de los componentes de UI

- **Decisión**: Importar con estos nombres confirmados en `src/components/ui/`:
  - `dialog.tsx`: `Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle` (también
    existen `DialogClose, DialogFooter, DialogOverlay, DialogPortal, DialogTrigger`).
  - `scroll-area.tsx`: `ScrollArea, ScrollBar`.
  - `field.tsx`: `Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldLegend,
    FieldSeparator, FieldSet, FieldContent, FieldTitle`.
  - `tabs.tsx`: `Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants`. Soporta
    `orientation="vertical"` (clases `group-data-vertical/tabs`) y `TabsList` admite `variant="line"`.
  - `switch.tsx`: `Switch`.
- **Rationale**: Verificado leyendo los bloques `export` de cada archivo. Todos los nombres que el
  diseño consume existen.
- **Alternativas consideradas**: N/A (verificación directa).

## R5 — Ruta de login para el `callbackUrl` de `signOut`

- **Decisión**: `signOut({ callbackUrl: "/auth/v1/login" })`.
- **Rationale**: Verificado en `src/app/(main)/auth/v1/login/page.tsx` (la subruta existe). El grupo
  `(main)` no aparece en la URL.
- **Alternativas consideradas**: `/auth/login` — rechazado; no existe esa subruta.

## R6 — Migración de la pestaña Apariencia desde `LayoutControls`

- **Decisión**: Migrar el cuerpo de controles de `layout-controls.tsx` a `appearance-settings.tsx`
  **sin** el `Popover`/`PopoverTrigger`/`Button` disparador, conservando los handlers que aplican y
  persisten cada preferencia (`applyThemePreset`, `applyContentLayout`, etc. + `persistPreference`).
- **Rationale**: Reutiliza la lógica probada de `usePreferencesStore` y `@/lib/preferences/*`. Las
  preferencias layout-críticas siguen persistiéndose vía `persistPreference` (cookie en servidor),
  cumpliendo la política de `preferences-config.ts`.
- **Alternativas consideradas**: Reescribir la lógica de preferencias — rechazado; duplicaría código y
  arriesgaría divergencias con el SSR.

## R7 — Tipo de `currentUser.role` en `layout.tsx`

- **Decisión**: Tipar explícitamente `currentUser` para que `role` sea `UserRole` (no `string`).
  Importar `import type { UserRole } from "@/generated/prisma/client"` en `layout.tsx`.
- **Rationale**: Hoy `role: ctx?.role ?? "ADMIN"` se infiere como `string` por el literal de respaldo;
  `NavUser` espera `UserRole`. Anotar el objeto o el campo evita el ensanchamiento.
- **Alternativas consideradas**: `as UserRole` — aceptable, pero anotar el tipo del objeto es más
  seguro y explícito.

## R8 — Estado controlado del modal y apertura por sección

- **Decisión**: `SettingsDialog` es **controlado**: recibe `open`/`onOpenChange` y `section`/
  `onSectionChange`. `NavUser` mantiene `useState` para `open` y `section`, y cada ítem del menú llama
  a `openSection("account" | "appearance" | "notifications" | "plan")`.
- **Rationale**: Permite abrir el modal directamente en la sección del ítem pulsado (FR-002) y reutiliza
  el mismo modal para los cuatro ítems.
- **Alternativas consideradas**: Modal no controlado con `defaultValue` — rechazado; no permitiría
  cambiar la sección inicial según el ítem.

## R9 — Guardado optimista de notificaciones

- **Decisión**: Estado local optimista en `NotificationsSettings`: al alternar, actualizar la UI,
  llamar a la Server Action y, si falla, revertir al estado previo y mostrar `toast.error`.
- **Rationale**: Cumple FR-010 (guardado automático sin acción adicional) y FR-012 (revertir + avisar
  ante error). El upsert idempotente del servidor garantiza consistencia.
- **Alternativas consideradas**: Botón "Guardar" explícito — rechazado; el diseño pide auto-guardado.

## R10 — bcrypt y coste

- **Decisión**: `bcryptjs` (no `bcrypt`), coste `10`, igual que `src/lib/register.ts`.
- **Rationale**: Coherencia con el hashing existente y evita dependencias nativas.
- **Alternativas consideradas**: `argon2` — rechazado; introduciría una segunda estrategia de hashing.
