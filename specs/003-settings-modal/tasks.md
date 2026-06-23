---

description: "Lista de tareas para el Modal de Configuración unificado"
---

# Tasks: Modal de Configuración unificado

**Input**: Documentos de diseño en `/specs/003-settings-modal/`

**Prerequisites**: plan.md (requerido), spec.md (historias de usuario), research.md, data-model.md, contracts/

**Tests**: El repositorio **no tiene runner de pruebas configurado** (ver plan.md, Principio II /
Complexity Tracking). No se generan tareas de prueba automatizada; la verificación se hace con las
puertas de calidad (`npm run check`, `npx tsc --noEmit`, `npm run build`, `npm run doctor`) y la
verificación manual de `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario. Cada componente de pestaña es una unidad
de UI independiente; la integración (shell + cableado) vive en US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece la tarea (US1…US5)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Aplicación web Next.js (App Router) con colocación por feature. Rutas relativas a la raíz del repo:
`prisma/`, `src/lib/`, `src/server/`, `src/app/(main)/dashboard/_components/sidebar/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirmar línea base verde antes de empezar.

- [X] T001 Confirmar que el baseline pasa las puertas básicas ejecutando `npm run check && npx tsc --noEmit` desde la raíz del repo; si falla algo previo no relacionado, anotarlo antes de continuar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelo de datos y capa de negocio compartidos por todas las historias.

**⚠️ CRITICAL**: Ninguna historia de UI puede completarse hasta que esta fase esté lista.

- [X] T002 Añadir la relación `notificationPreference NotificationPreference?` en `model User` (tras `passwordResetTokens PasswordResetToken[]`) en `prisma/schema.prisma`.
- [X] T003 Añadir el modelo `NotificationPreference` (`id`, `userId @unique`, `emailAlerts @default(true)`, `productUpdates @default(false)`, `taskReminders @default(true)`, `createdAt`, `updatedAt`, relación a `User` con `onDelete: Cascade`, `@@map("notification_preferences")`) tras `PasswordResetToken` y antes del bloque `// NEGOCIO` en `prisma/schema.prisma`.
- [X] T004 Crear y aplicar la migración con `npm run db:migrate -- --name notification_preferences` (genera `prisma/migrations/<timestamp>_notification_preferences/migration.sql` y regenera el cliente en `src/generated/prisma`). Depende de T002, T003.
- [X] T005 [P] Extender `src/lib/profile.ts`: ampliar `profileSchema` con `image` (URL válida o `""`, opcional), hacer que `updateUserProfile` guarde `image` (vacío ⇒ `null`), y añadir `passwordChangeSchema`, `PasswordChangeInput` y `changeUserPassword(userId, input)` (verifica la actual con `bcryptjs`, coste 10; lanza `Error` en español si no hay contraseña o no coincide).
- [X] T006 Crear `src/lib/notifications.ts`: `notificationPreferenceSchema` (Zod, 3 booleanos), `NotificationPreferenceInput`, `NotificationPreferenceView`, `toView`, `getOrCreateNotificationPreferences(userId)` y `updateNotificationPreferences(userId, input)` (upsert idempotente). Importa el tipo `NotificationPreference` de `@/generated/prisma/client`. Depende de T004.
- [X] T007 Extender `src/server/profile.ts`: que `updateProfile` acepte/pase `image` y añadir la action `changePassword(input)` escopada a `getTenantContext().userId` (lanza `MissingTenantContextError("No hay sesión activa.")` sin sesión). Depende de T005.
- [X] T008 [P] Crear `src/server/notifications.ts`: actions `getNotificationPreferences()` y `updateNotificationPreferences(input)` escopadas a `getTenantContext().userId` (lanzan `MissingTenantContextError` sin sesión). Depende de T006.
- [X] T009 Verificar la capa foundational con `npx tsc --noEmit && npm run check` (confirma que `@/generated/prisma/client` exporta `NotificationPreference` y que `MissingTenantContextError` resuelve desde `@/lib/errors`). Depende de T005–T008.

**Checkpoint**: Datos y Server Actions listos — las historias de UI pueden empezar.

---

## Phase 3: User Story 1 - Ajustar la apariencia desde un único lugar (Priority: P1) 🎯 MVP

**Goal**: Pestaña Apariencia con todos los controles (tema, fuente, modo, disposición, navbar,
sidebar, colapso) aplicando y persistiendo cambios, más "Restaurar valores por defecto".

**Independent Test**: Montar `AppearanceSettings` (vía el modal una vez integrado, o aislado);
cambiar cada control y verificar efecto inmediato y persistencia tras recargar.

### Implementation for User Story 1

- [X] T010 [P] [US1] Crear `src/app/(main)/dashboard/_components/sidebar/settings-dialog/appearance-settings.tsx` migrando los controles de `layout-controls.tsx` (sin `Popover`/disparador), con copia en español y `<Separator />` entre grupos; usar `usePreferencesStore`, `@/lib/preferences/*` (`applyThemePreset`, `applyContentLayout`, `applyNavbarStyle`, `applySidebarVariant`, `applySidebarCollapsible`, `applyFont`, `persistPreference`) y `PREFERENCE_DEFAULTS` para el restablecimiento.
- [X] T011 [US1] Verificar con `npx tsc --noEmit && npm run check` (aplicar `npm run check:fix` si reordena imports/clases). Depende de T010.

**Checkpoint**: La pestaña Apariencia es funcional como componente.

---

## Phase 4: User Story 2 - Gestionar los datos de la cuenta (Priority: P1)

**Goal**: Pestaña Cuenta con edición de nombre y avatar (URL), correo de solo lectura y cambio de
contraseña con verificación de la actual.

**Independent Test**: Montar `AccountSettings`; guardar nombre/avatar y ver la previsualización;
probar cambio de contraseña con la actual incorrecta (error en español) y correcta (éxito).

### Implementation for User Story 2

- [X] T012 [P] [US2] Crear `src/app/(main)/dashboard/_components/sidebar/settings-dialog/account-settings.tsx` con dos formularios RHF + `zodResolver` (`profileSchema`, `passwordChangeSchema`), `Field/FieldError/FieldGroup/FieldLabel`, `Avatar*`, `Input`, `Button`, `Separator`, `getInitials`; llama a `updateProfile` y `changePassword` de `@/server/profile`, usa `router.refresh()` y `toast` (Sonner) para resultados. Props: `{ user: { name; email; image } }`. Depende de T007.
- [X] T013 [US2] Verificar con `npx tsc --noEmit && npm run check`. Depende de T012.

**Checkpoint**: La pestaña Cuenta es funcional como componente.

---

## Phase 5: User Story 3 - Configurar preferencias de notificación (Priority: P2)

**Goal**: Pestaña Notificaciones con tres interruptores (avisos por correo, novedades, recordatorios)
de guardado automático y reversión optimista ante error.

**Independent Test**: Montar `NotificationsSettings` con `initial`; alternar cada interruptor y
verificar persistencia tras reabrir; simular fallo y comprobar reversión + aviso.

### Implementation for User Story 3

- [X] T014 [P] [US3] Crear `src/app/(main)/dashboard/_components/sidebar/settings-dialog/notifications-settings.tsx` con estado local optimista, `Switch`/`Label`/`Separator`, lista `TOGGLES` (3 claves), llamada a `updateNotificationPreferences` de `@/server/notifications` y reversión + `toast.error` ante fallo. Props: `{ initial: NotificationPreferenceView }`. Depende de T008.
- [X] T015 [US3] Verificar con `npx tsc --noEmit && npm run check`. Depende de T014.

**Checkpoint**: La pestaña Notificaciones es funcional como componente.

---

## Phase 6: User Story 4 - Consultar plan y rol (Priority: P3)

**Goal**: Pestaña Plan informativa (solo lectura) con plan vigente y rol mediante `Badge`.

**Independent Test**: Montar `PlanSettings` con `planLabel`/`roleLabel` y verificar que muestra los
valores correctos (o "Sin plan").

### Implementation for User Story 4

- [X] T016 [P] [US4] Crear `src/app/(main)/dashboard/_components/sidebar/settings-dialog/plan-settings.tsx` (server-safe, sin `"use client"`): muestra `planLabel ?? "Sin plan"` y `roleLabel` con `Badge`, más nota de "facturación próximamente". Props: `{ planLabel: string | null; roleLabel: string }`.
- [X] T017 [US4] Verificar con `npx tsc --noEmit && npm run check`. Depende de T016.

**Checkpoint**: La pestaña Plan es funcional como componente.

---

## Phase 7: User Story 5 - Integración del modal, cierre de sesión y limpieza del navbar (Priority: P2)

**Goal**: Ensamblar el shell del modal con pestañas verticales, abrirlo desde el menú de usuario en
la sección correcta, cablear `signOut` real, cargar datos en el layout y retirar `LayoutControls` y
`AccountSwitcher` del navbar (conservando búsqueda y conmutador de tema).

**Independent Test**: En el navbar no aparecen los controles retirados (sí búsqueda y tema); el menú
de usuario abre el modal en la sección del ítem pulsado; "Cerrar sesión" redirige a `/auth/v1/login`.

### Implementation for User Story 5

- [X] T018 [US5] Crear `src/app/(main)/dashboard/_components/sidebar/settings-dialog/settings-dialog.tsx`: shell controlado (`open`/`onOpenChange`, `section`/`onSectionChange`) con `Dialog`, `Tabs orientation="vertical"` + `TabsList variant="line"` y contenido en `ScrollArea`; exporta `SettingsSection` e integra las 4 pestañas con iconos lucide (`Palette`, `UserRound`, `Bell`, `CreditCard`). Depende de T010, T012, T014, T016.
- [X] T019 [US5] Reescribir `src/app/(main)/dashboard/_components/sidebar/nav-user.tsx`: items del dropdown en español que llaman a `openSection(...)`, estado `open`/`section`, `ROLE_LABELS: Record<UserRole, string>`, `signOut({ callbackUrl: "/auth/v1/login" })`, y montar `<SettingsDialog>` mapeando `user.avatar → image`. Props ampliadas `{ user: { name; email; avatar; role: UserRole }; planLabel; notificationPreferences }`. Depende de T018.
- [X] T020 [US5] Actualizar `src/app/(main)/dashboard/_components/sidebar/app-sidebar.tsx`: ampliar `AppSidebarProps` (`user.role: UserRole`, `notificationPreferences`), importar `UserRole` de `@/generated/prisma/client` y `NotificationPreferenceView` de `@/lib/notifications`, y pasar `planLabel ?? null` y `notificationPreferences` a `<NavUser>`. Depende de T019.
- [X] T021 [US5] Actualizar `src/app/(main)/dashboard/layout.tsx`: añadir `getNotificationPreferences()` al `Promise.all` (fallback con defaults sin sesión), tipar `currentUser.role` como `UserRole`, pasar `notificationPreferences` a `<AppSidebar>`, y eliminar `<LayoutControls />` y `<AccountSwitcher .../>` del navbar (conservando `<SearchDialog />` y `<ThemeSwitcher />`) junto con sus imports. Depende de T020.
- [X] T022 [US5] Eliminar los componentes obsoletos con `git rm "src/app/(main)/dashboard/_components/sidebar/layout-controls.tsx" "src/app/(main)/dashboard/_components/sidebar/account-switcher.tsx"`. Depende de T021.
- [X] T023 [US5] Verificar que no quedan referencias colgantes con `npx tsc --noEmit` (si hay import roto a los componentes eliminados, retirarlo). Depende de T022.

**Checkpoint**: Modal accesible y operativo; navbar limpio; cierre de sesión funcional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Puertas de calidad completas y verificación de extremo a extremo.

- [X] T024 Ejecutar las cuatro puertas de calidad al 100 %: `npm run check && npx tsc --noEmit && npm run build && npm run doctor` (aplicar `npm run check:fix` si Biome propone reordenar). Depende de T023.
- [X] T025 Ejecutar la verificación manual de `specs/003-settings-modal/quickstart.md` (8 escenarios) con `npm run dev`. Depende de T024.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **BLOQUEA** todas las historias.
- **US1–US4 (Phases 3–6)**: dependen de Foundational. Las cuatro pestañas son **independientes entre sí** (archivos distintos) y pueden hacerse en paralelo.
- **US5 (Phase 7)**: integración; el shell (T018) depende de que existan las 4 pestañas (T010, T012, T014, T016).
- **Polish (Phase 8)**: depende de US5 completa.

### User Story Dependencies

- **US1 (P1)**: solo Foundational.
- **US2 (P1)**: Foundational (consume `server/profile`).
- **US3 (P2)**: Foundational (consume `server/notifications` + modelo).
- **US4 (P3)**: Foundational (sin datos nuevos; usa props del layout).
- **US5 (P2)**: requiere los componentes de US1–US4 (el shell los importa) y conecta todo.

### Parallel Opportunities

- T005 y T008 marcados [P] dentro de Foundational (archivos distintos), respetando T005→T007 y T006→T008.
- T010, T012, T014, T016 [P]: las cuatro pestañas pueden desarrollarse en paralelo tras Foundational.
- Las verificaciones por historia (T011, T013, T015, T017) son locales a cada pestaña.

---

## Parallel Example: Pestañas (tras Foundational)

```bash
# Lanzar la creación de las cuatro pestañas en paralelo:
Task: "Crear appearance-settings.tsx (US1)"
Task: "Crear account-settings.tsx (US2)"
Task: "Crear notifications-settings.tsx (US3)"
Task: "Crear plan-settings.tsx (US4)"
```

---

## Implementation Strategy

### MVP coherente

El modal solo es accesible tras la integración (US5), y el shell importa las cuatro pestañas. Por
tanto, el incremento mínimo demostrable es: **Foundational → las 4 pestañas (US1–US4) → US5**. No
obstante, cada pestaña entrega su valor de forma aislada y puede revisarse como unidad.

1. Phase 1: Setup
2. Phase 2: Foundational (CRÍTICO — bloquea todo)
3. Phases 3–6: US1–US4 (en paralelo si hay capacidad; P1 primero: Apariencia y Cuenta)
4. Phase 7: US5 (integración + limpieza navbar + logout)
5. **PARAR y VALIDAR**: ejecutar quickstart.md
6. Phase 8: puertas de calidad y verificación manual

### Entrega incremental

- Foundational → backend listo.
- Pestañas P1 (Apariencia, Cuenta) → primer valor visible.
- Pestañas P2/P3 (Notificaciones, Plan) → completar secciones.
- US5 → modal accesible y navbar limpio.

### Estrategia con equipo paralelo

Tras Foundational: Dev A → US1, Dev B → US2, Dev C → US3+US4; luego una persona integra en US5.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Etiqueta [Story] para trazabilidad con las historias de spec.md.
- Sin runner de pruebas: la verificación es por puertas de calidad + quickstart.md (verificación manual).
- Commit por tarea o grupo lógico (mensajes en español); no usar `--no-verify`.
- Evitar: conflictos en el mismo archivo y dependencias cruzadas que rompan la independencia de las pestañas.
