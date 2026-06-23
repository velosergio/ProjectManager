# Implementation Plan: Modal de Configuración unificado

**Branch**: `003-settings-modal` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-settings-modal/spec.md`

## Summary

Reemplazar el popover de controles de diseño (`LayoutControls`) y el conmutador de cuenta
(`AccountSwitcher`) del navbar por un **único modal de Configuración** con pestañas verticales
(Apariencia, Cuenta, Notificaciones, Plan), abierto desde el menú de usuario del pie del sidebar.

Enfoque técnico: un `Dialog` controlado de shadcn/ui con `Tabs orientation="vertical"` (menú de
secciones a la izquierda, contenido envuelto en `ScrollArea` a la derecha). El `layout.tsx` (server
component) carga usuario, plan/rol y preferencias de notificación y los pasa por props
(`layout → AppSidebar → NavUser → SettingsDialog`), sin estados de carga visibles. La lógica de
negocio (perfil, contraseña, notificaciones) vive en `src/lib/` (pura + Zod) y se expone vía Server
Actions en `src/server/` **escopadas al `userId` de la sesión** mediante `getTenantContext()`. Se
añade un modelo `NotificationPreference` (1:1 con `User`) con migración versionada.

## Technical Context

**Language/Version**: TypeScript estricto, React 19 (React Compiler activado), Next.js 16 (App Router)

**Primary Dependencies**: shadcn/ui (Radix/base-ui), Tailwind CSS v4, NextAuth v5 (beta), Prisma 7
(+ adapter MariaDB), React Hook Form + Zod, Zustand (preferencias), bcryptjs, Sonner

**Storage**: MySQL/MariaDB vía Prisma 7 (cliente generado en `src/generated/prisma`, importado desde
`@/generated/prisma/client`). Nueva tabla `notification_preferences` (1:1 con `users`).

**Testing**: No hay runner configurado en el repo. Verificación mediante puertas de calidad
(`npm run check`, `npx tsc --noEmit`, `npm run build`, `npm run doctor`) + verificación manual en
navegador (ver `quickstart.md`).

**Target Platform**: Aplicación web SSR (navegadores modernos de escritorio y móvil).

**Project Type**: Aplicación web full-stack (Next.js App Router; colocación por feature).

**Performance Goals**: Cambios de apariencia reflejados de inmediato (sin recarga). Datos del modal
cargados en el servidor antes de mostrar el sidebar; sin spinners dentro del modal. Interacciones
por debajo de ~100 ms.

**Constraints**: Idioma de interfaz en español con acentos correctos. Identidad SIEMPRE desde
`getTenantContext().userId`, nunca input del cliente. Preferencias layout-críticas
(`sidebar_variant`, `sidebar_collapsible`) resueltas en servidor. Avatar por URL (sin subida a
MinIO en esta fase). Correo no editable. Sección Plan informativa (sin facturación).

**Scale/Scope**: Una feature de UI/cuenta: 7 archivos nuevos, 5 modificados, 2 eliminados, 1 modelo
de datos nuevo + migración. 4 pestañas, 3 interruptores de notificación.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|-----------|------------|--------|
| **I. Calidad del código** | Las cuatro puertas (Biome, React Doctor, tsc, build) deben pasar al 100 % sin trampas. No se desactivan reglas ni se excluyen archivos. | ✅ Cumple |
| **II. Estándares de prueba** | La lógica de negocio (verificación de contraseña, upsert de preferencias, validación Zod) es lógica de dominio que la constitución exige probar; sin embargo, **no hay runner configurado** en el repo. Se documenta como deuda conocida y se verifica manualmente vía `quickstart.md`. Ver Complexity Tracking. | ⚠️ Justificado |
| **III. Coherencia UX** | Se reutilizan componentes existentes (`Dialog`, `Tabs`, `ScrollArea`, `Field`, `Switch`, `Avatar`, `Badge`). Notificaciones vía Sonner. Soporte tema claro/oscuro intacto. Etiquetas ARIA en toggles e iconos. | ✅ Cumple |
| **IV. Rendimiento** | Datos cargados en el server component (`layout.tsx`) en el `Promise.all` existente; sin N+1 (un `upsert` por usuario). JS de cliente limitado a la interactividad del modal. | ✅ Cumple |
| **V. Documentación en español** | Spec, plan y artefactos en español. Copia de interfaz y mensajes en español. Identificadores en inglés. | ✅ Cumple |

**Resultado del gate**: PASA con una excepción justificada (Principio II) documentada en Complexity
Tracking. No hay violaciones que bloqueen.

## Project Structure

### Documentation (this feature)

```text
specs/003-settings-modal/
├── plan.md              # Este archivo (/speckit-plan)
├── research.md          # Phase 0 (/speckit-plan)
├── data-model.md        # Phase 1 (/speckit-plan)
├── quickstart.md        # Phase 1 (/speckit-plan)
├── contracts/           # Phase 1 (/speckit-plan)
│   ├── server-actions.md
│   └── component-props.md
├── checklists/
│   └── requirements.md  # (/speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                     # + modelo NotificationPreference + relación en User
└── migrations/<timestamp>_notification_preferences/migration.sql   # nueva migración

src/
├── lib/
│   ├── profile.ts                    # MOD: profileSchema gana `image`; passwordChangeSchema + changeUserPassword
│   └── notifications.ts              # NUEVO: Zod + upsert/lectura de NotificationPreference
├── server/
│   ├── profile.ts                    # MOD: updateProfile pasa `image`; nueva action changePassword
│   └── notifications.ts              # NUEVO: get/update Server Actions escopadas al userId
└── app/(main)/dashboard/
    ├── layout.tsx                    # MOD: carga prefs notif, pasa props, limpia navbar
    └── _components/sidebar/
        ├── nav-user.tsx              # MOD: items en español, abre modal, signOut real, props nuevas
        ├── app-sidebar.tsx          # MOD: tipos + pasa props a NavUser
        ├── layout-controls.tsx      # ELIMINADO
        ├── account-switcher.tsx     # ELIMINADO
        └── settings-dialog/         # NUEVO
            ├── settings-dialog.tsx       # shell: Dialog + Tabs verticales + estado de sección
            ├── appearance-settings.tsx   # pestaña Apariencia (migrada de LayoutControls)
            ├── account-settings.tsx      # pestaña Cuenta (perfil + contraseña)
            ├── notifications-settings.tsx# pestaña Notificaciones (switches)
            └── plan-settings.tsx         # pestaña Plan (solo lectura)
```

**Structure Decision**: Se sigue la **colocación por feature** del proyecto. El modal y sus
pestañas viven bajo `src/app/(main)/dashboard/_components/sidebar/settings-dialog/` (carpeta privada
`_components`). La lógica pura va a `src/lib/`, las Server Actions a `src/server/`, y el modelo a
`prisma/schema.prisma`, en línea con la arquitectura descrita en `CLAUDE.md`.

## Complexity Tracking

> Solo se rellena por la excepción al Principio II (Estándares de prueba).

| Violación | Por qué es necesaria | Alternativa más simple rechazada porque |
|-----------|----------------------|------------------------------------------|
| No se añaden pruebas automatizadas para la lógica de negocio (verificación de contraseña, upsert de preferencias) | El repositorio **no tiene aún ningún runner de pruebas configurado** (confirmado en `CLAUDE.md`). Introducir y configurar un runner (elección de Vitest/Jest, setup de Prisma de test, mocks de sesión) es un trabajo transversal fuera del alcance de esta feature de UI. | Configurar un runner solo para esta feature ampliaría el alcance y mezclaría dos decisiones independientes (infraestructura de test vs. modal de configuración). La lógica se mantiene pura y aislada en `src/lib/` precisamente para que sea trivial de probar cuando exista el runner; mientras tanto se verifica con las puertas de calidad y el `quickstart.md`. |
