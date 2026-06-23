---
description: "Lista de tareas — Core del sistema y arquitectura multitenant"
---

# Tasks: Core del sistema y arquitectura multitenant

**Input**: Documentos de diseño en `specs/002-core-multitenant/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: INCLUIDOS. La constitución (Principio II) exige pruebas para la lógica de negocio
(aislamiento, gating/cuotas, bypass `mango`, tokens de reset) y el plan adopta **Vitest**.

**Organization**: Las tareas se agrupan por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1…US7)
- Las rutas de archivo son exactas y siguen la estructura de `plan.md`

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: Dependencias y herramientas necesarias antes de tocar el código.

- [X] T001 Añadir dependencias en `package.json`: `@clack/prompts`, `nodemailer` (dev/prod),
  `@types/nodemailer` (dev), `vitest` (dev); ejecutar `npm install`.
- [X] T002 [P] Configurar Vitest: crear `vitest.config.ts` (entorno node, alias `@/`) y añadir
  script `"test": "vitest run"` y `"test:watch": "vitest"` en `package.json`.
- [X] T003 [P] Añadir variables de entorno de correo y reset en `.env.example`
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `PASSWORD_RESET_TTL_MINUTES`).
- [X] T004 [P] Verificar `tsconfig.scripts.json` cubre `scripts/` (patrón ya usado por
  `generate:presets`); ajustarlo si no incluye `scripts/create-mango.ts`.

**Checkpoint**: Herramientas listas (Vitest ejecuta una prueba vacía; deps instaladas).

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: Esquema de datos, cliente Prisma, sesión con `tenantId`/`role` y contexto de tenant —
base compartida por TODAS las historias.

**⚠️ CRITICAL**: Ninguna historia puede empezar hasta completar esta fase.

- [X] T005 Ampliar `prisma/schema.prisma`: añadir `MANGO` a `UserRole`; enums `PlanCode`,
  `BillingCycle`, `SubscriptionStatus`; campo `User.tenantId` (nullable, FK + `@@index`); modelos
  `Tenant`, `Plan`, `Subscription`, `Client`, `Project`, `Process`, `Task`, `FileAsset`, `Event`,
  `PasswordResetToken` con `@@index([tenantId])` en las entidades de negocio (ver `data-model.md`).
- [X] T006 Generar cliente y migración versionada: `npm run db:generate` y `npm run db:migrate`
  (crea la migración inicial del core multitenant en `prisma/migrations/`).
- [X] T007 Actualizar `prisma/seed.ts` para sembrar los 3 planes (`GRATUITO`/`PRO`/`PRO_PLUS`) con
  **precio mensual y precio anual con descuento** (`priceMonthly`/`priceYearly`; Gratuito = 0/0,
  Pro = 30000/anual con descuento, Pro+ = 50000/anual con descuento) y cuotas por defecto
  (parametrizables; ver `research.md` §5); ejecutar `npm run db:seed`. (FR-009)
- [X] T008 [P] Crear augmentación de tipos en `src/types/next-auth.d.ts` para `Session.user`, `User`
  y `JWT` con `tenantId: string | null` y `role` (contrato `auth-session.md`).
- [X] T009 Modificar `src/lib/auth.config.ts`: callbacks `jwt` y `session` para transportar
  `tenantId` y `role` (depende de T008).
- [X] T010 Modificar `src/lib/auth.ts`: `authorize()` devuelve `tenantId` y `role` del usuario
  (depende de T005/T006 y T008).
- [X] T011 [P] Crear `src/lib/tenant-context.ts`: `getTenantContext()` que resuelve `tenantId`/`role`
  desde la sesión y la cookie `mango_active_tenant` (contrato `auth-session.md`).

**Checkpoint**: Esquema migrado, sesión con tenant/rol y contexto disponibles; las historias pueden
comenzar.

---

## Phase 3: User Story 1 - Aislamiento de datos entre organizaciones (Priority: P1) 🎯 MVP

**Goal**: Toda lectura/escritura de entidades de negocio queda forzada al `tenantId` del contexto;
un tenant no puede leer ni escribir datos de otro.

**Independent Test**: Sembrar Tenant A y B; con contexto A, las consultas solo devuelven datos de A;
acceder por id a un recurso de B devuelve "no encontrado".

### Tests for User Story 1 ⚠️ (escribir primero; deben FALLAR antes de implementar)

- [X] T012 [P] [US1] Prueba de integración de aislamiento en
  `tests/integration/tenant-isolation.test.ts` (I1–I4 del contrato: lectura escopada, escritura fija
  `tenantId`, `findUnique` cruzado → null, `getAdminDb` como ADMIN lanza) — SC-001/SC-002/SC-007.
- [X] T013 [P] [US1] Pruebas unitarias de las transformaciones de la extensión en
  `tests/unit/tenant-db.test.ts` (find/create/update/delete/upsert reescriben `where`/`data`).

### Implementation for User Story 1

- [X] T014 [P] [US1] Crear errores de dominio en `src/lib/errors.ts`
  (`MissingTenantContextError`, `ForbiddenError`).
- [X] T015 [US1] Implementar `src/lib/tenant-db.ts`: extensión Prisma de scoping sobre la allowlist
  (`Client`, `Project`, `Process`, `Task`, `FileAsset`, `Event`, `Subscription`) + `getTenantDb()`
  y `getAdminDb()` (asevera `MANGO`) según `contracts/tenant-data-access.md` (depende de T011, T014).

**Checkpoint**: US1 funcional y verificable; el aislamiento queda garantizado en la capa de datos.

---

## Phase 4: User Story 2 - Alta de organización en autoservicio (Priority: P1)

**Goal**: El registro crea organización + usuario `admin` + suscripción al plan Gratuito en un paso.

**Independent Test**: Completar el registro y comprobar en DB que existen `Tenant`, `User(ADMIN)` y
`Subscription(GRATUITO, ACTIVE)`; el usuario queda autenticado en su espacio aislado.

### Tests for User Story 2 ⚠️

- [X] T016 [P] [US2] Prueba de integración del registro en `tests/integration/register.test.ts`:
  crea las tres entidades en transacción; el tenant queda con **exactamente un** usuario `ADMIN`
  (FR-015a); email duplicado → 409 sin duplicar — SC-003/SC-004.

### Implementation for User Story 2

- [X] T017 [US2] Modificar `src/app/api/auth/register/route.ts`: añadir `organizationName` al schema
  Zod y crear `Tenant` + `User(ADMIN, tenantId)` + `Subscription(GRATUITO, ACTIVE)` dentro de
  `prisma.$transaction` (cliente base; depende de T005/T006).
- [X] T018 [US2] Añadir el campo "Organización" al formulario de registro en
  `src/app/(main)/auth/_components/register-form.tsx` (React Hook Form + Zod), enviándolo a
  `POST /api/auth/register`; mensajes y validación en español.

**Checkpoint**: US1 + US2 forman el MVP del core multitenant.

---

## Phase 5: User Story 3 - Acceso global del rol `mango` (Priority: P1)

**Goal**: `mango` accede de forma transversal a cualquier tenant desde una consola exclusiva con
selector; ningún `admin` cruza su frontera de tenant.

**Independent Test**: Como `mango`, abrir `/dashboard/mango`, seleccionar un tenant y ver sus datos;
como `admin`, el acceso a esa ruta se deniega.

**⚠️ Dependencia**: usa `getAdminDb()` de US1 (T015).

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] Prueba en `tests/integration/mango-access.test.ts`: `getAdminDb` como MANGO ve
  varios tenants; como ADMIN lanza `ForbiddenError`; `getTenantContext` de mango sin cookie → null.

### Implementation for User Story 3

- [X] T020 [US3] Añadir en `src/server/server-actions.ts` la acción para fijar/leer el tenant activo
  de `mango` (cookie `mango_active_tenant`).
- [X] T021 [US3] Crear la consola exclusiva en `src/app/(main)/dashboard/mango/page.tsx` con guard de
  rol (`MANGO`), listado de organizaciones y métricas agregadas vía `getAdminDb()`.
- [X] T022 [P] [US3] Crear componentes del selector de tenant y la tabla de organizaciones en
  `src/app/(main)/dashboard/mango/_components/` (shadcn/ui, estados de carga/vacío/error).

**Checkpoint**: US3 funcional; el bypass de `mango` está acotado y verificado.

---

## Phase 6: User Story 4 - Creación del super usuario por CLI (Priority: P2)

**Goal**: `npm run mango` crea un usuario `MANGO` (sin tenant) mediante formulario interactivo
validado, idempotente y con contraseña protegida.

**Independent Test**: Ejecutar el comando con datos válidos → usuario `MANGO`; reejecutar con el
mismo email → aviso sin duplicar.

### Tests for User Story 4 ⚠️

- [X] T023 [P] [US4] Prueba unitaria de la validación (Zod + coincidencia de contraseña) en
  `tests/unit/create-mango.test.ts` (sin TTY) — SC-006.

### Implementation for User Story 4

- [X] T024 [US4] Añadir script `"mango": "tsx scripts/create-mango.ts"` en `package.json`.
- [X] T025 [US4] Implementar `scripts/create-mango.ts` con `@clack/prompts` (nombre/email/contraseña/
  confirmación, enmascarado), validación Zod, comprobación de unicidad (idempotente), hash bcrypt y
  creación de `User { role: MANGO, tenantId: null }` con el cliente base, según `contracts/mango-cli.md`.

**Checkpoint**: Existe un super usuario operativo para la consola de US3.

---

## Phase 7: User Story 5 - Límites de plan y gating de funciones (Priority: P2)

**Goal**: Cada organización respeta las cuotas y features de su plan; al alcanzar un límite o usar
una función no incluida, el sistema lo impide e informa de la ampliación.

**Independent Test**: En plan Gratuito alcanzar `maxProjects`, intentar uno más → bloqueo con
mensaje; subir de plan → límite actualizado; bajar con uso > cuota → datos intactos, nuevas
creaciones bloqueadas.

**⚠️ Dependencia**: usa `getTenantDb()` (US1) y la `Subscription` del tenant (US2).

### Tests for User Story 5 ⚠️

- [X] T026 [P] [US5] Pruebas unitarias de gating y cuotas en `tests/unit/plan-gating.test.ts`:
  cuota alcanzada lanza `QuotaExceededError`; cuota `null` nunca lanza; feature ausente lanza
  `FeatureNotInPlanError`; descenso con uso > cuota bloquea creaciones — SC-005/FR-011a. Incluir una
  aserción de **concurrencia**: dos creaciones simultáneas en el límite no superan la cuota (edge
  "Concurrencia en el límite de cuota").

### Implementation for User Story 5

- [X] T027 [P] [US5] Crear `src/lib/plans/definitions.ts`: tipo `PlanFeature` y `PLAN_FEATURES`
  (features por `PlanCode`, config tipada).
- [X] T028 [US5] Crear `src/lib/plans/gating.ts`: `assertFeature()` y `assertWithinQuota()`
  (cuenta/suma bajo el tenant) con errores tipados, según `contracts/plan-gating.md`
  (depende de T027 y T014). **Anti-carrera**: `assertWithinQuota` + la creación deben ejecutarse en
  una única transacción serializable (`prisma.$transaction` con recuento dentro de la tx), de modo
  que dos creaciones simultáneas no superen la cuota; documentar la estrategia en el encabezado del
  módulo.
- [X] T029 [US5] Integrar el gating en el flujo de creación de recursos: crear server action de
  ejemplo `src/server/projects.ts` que envuelva `assertWithinQuota(..., "projects")` y el `create`
  en la misma transacción (patrón anti-carrera de T028), reutilizable por features posteriores.
- [X] T030 [US5] Mapear errores a respuesta/usuario: traducir `QuotaExceededError`/
  `FeatureNotInPlanError` a HTTP (409/403) y a avisos con Sonner indicando límite y vía de ampliación.

**Checkpoint**: El modelo de negocio (cuotas + features) se aplica en backend y se refleja en la UI.

---

## Phase 8: User Story 6 - Recuperación de contraseña (Priority: P3)

**Goal**: Un usuario restablece su contraseña con un enlace de un solo uso y caducidad, sin revelar
si el email existe.

**Independent Test**: Solicitar reset con email registrado → enlace (correo o consola en dev); fijar
nueva contraseña y entrar; reusar el enlace → rechazado; email inexistente → respuesta neutra.

### Tests for User Story 6 ⚠️

- [X] T031 [P] [US6] Pruebas en `tests/integration/password-reset.test.ts`: token válido cambia
  contraseña; reuso/caducado rechazados; `request` con email inexistente responde neutro — SC-008.

### Implementation for User Story 6

- [X] T032 [P] [US6] Crear `src/lib/mailer.ts`: envío SMTP con `nodemailer` y fallback de consola en
  desarrollo (sin SMTP).
- [X] T033 [US6] Crear `src/lib/password-reset.ts`: emisión (token + `tokenHash` + `expiresAt`) y
  verificación (vigente y no usado) sobre `PasswordResetToken` (depende de T005/T006).
- [X] T034 [US6] Crear `src/app/api/auth/password/request/route.ts`: respuesta neutra + envío de
  enlace + **rate-limit** parametrizable (por defecto: máx. 3 solicitudes por email y por IP en una
  ventana de 15 min, configurable por env); al exceder, responder igual de neutro sin enviar. Cubrir
  el límite con prueba (depende de T032, T033).
- [X] T035 [US6] Crear `src/app/api/auth/password/reset/route.ts`: valida token, fija contraseña
  (hash) y marca `usedAt` (depende de T033).
- [X] T036 [P] [US6] Crear página `src/app/(main)/auth/v1/forgot/page.tsx` (solicitar restablecimiento).
- [X] T037 [P] [US6] Crear página `src/app/(main)/auth/v1/reset/page.tsx` (definir nueva contraseña).

**Checkpoint**: Flujo de recuperación completo y seguro.

---

## Phase 9: User Story 7 - Navegación adaptada a rol y plan (Priority: P3)

**Goal**: Sidebar, perfil e indicador de plan se adaptan a rol y plan; la consola `mango` aparece
solo para `MANGO`; la ocultación no es la única barrera (el acceso directo también se deniega).

**Independent Test**: Como `admin` ver solo lo permitido + indicador de plan; como `mango` ver la
consola; acceder por ruta directa a una sección no incluida en el plan → denegado.

### Implementation for User Story 7

- [X] T038 [US7] Añadir metadatos de `role`/`plan`/`feature` a los items en
  `src/navigation/sidebar/sidebar-items.ts`.
- [X] T039 [US7] Filtrar los items por rol y plan en el sidebar
  `src/app/(main)/dashboard/_components/sidebar/` (depende de T038, `getTenantContext`, `definitions`).
- [X] T040 [P] [US7] Crear componente indicador de plan vigente y estado de suscripción (en sidebar o
  topbar), con datos de la `Subscription` del tenant.
- [X] T041 [P] [US7] Crear/ajustar la vista de perfil en
  `src/app/(main)/dashboard/profile/page.tsx`: el usuario **consulta y edita** sus datos básicos
  (nombre, imagen), con guardado vía server action `src/server/profile.ts` (escopado al usuario de la
  sesión) y validación Zod; el email no es editable en esta fase (FR-024).
- [X] T041a [P] [US7] Prueba de la acción de guardado de perfil en `tests/unit/profile.test.ts`:
  actualiza solo los campos permitidos del usuario autenticado y rechaza datos inválidos.
- [X] T042 [US7] Añadir guardas de servidor para denegar el acceso directo a rutas restringidas por
  rol/plan, con independencia de su visibilidad en el menú (FR-017/FR-022).
- [X] T042a [P] [US7] Prueba de autorización en `tests/integration/route-authorization.test.ts`:
  matriz de rol×plan que verifica que las rutas restringidas se deniegan por acceso directo aunque el
  item no esté en el menú, y que el sidebar muestra solo lo permitido — SC-009/FR-017 (Principio II).

**Checkpoint**: Todas las historias son funcionales de forma independiente.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final y limpieza transversal.

- [X] T043 [P] Ejecutar los escenarios de `quickstart.md` (1–7) y registrar resultados.
- [X] T044 Ejecutar las puertas de calidad: `npm run check`, `npm run doctor`, `npm run build`,
  `npm run test` — todas al 100 % sin trampas (constitución, Principios I/II/IV).
- [X] T045 [P] Actualizar documentación afectada si procede (notas en `CLAUDE.md`/`ROADMAP.md` sobre
  el patrón `getTenantDb()`/`getAdminDb()` como vía única de acceso a datos).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las historias.
- **User Stories (Phase 3+)**: dependen de Foundational. Orden de prioridad P1 → P2 → P3.
- **Polish (Phase 10)**: depende de las historias deseadas.

### User Story Dependencies

- **US1 (P1)**: solo Foundational. Base del aislamiento.
- **US2 (P1)**: solo Foundational. Independiente de US1 para implementar (comparte esquema).
- **US3 (P1)**: Foundational + **US1** (usa `getAdminDb()`).
- **US4 (P2)**: solo Foundational. Habilita probar US3 con un `mango` real.
- **US5 (P2)**: Foundational + **US1** (getTenantDb) + **US2** (Subscription).
- **US6 (P3)**: solo Foundational (modelo `PasswordResetToken` ya creado).
- **US7 (P3)**: Foundational + `getTenantContext`; integra indicador de plan (US5) y consola (US3).

### Within Each User Story

- Las pruebas se escriben primero y deben FALLAR antes de implementar.
- Errores/tipos → factoría/servicios → rutas/UI → integración.

### Parallel Opportunities

- Setup: T002, T003, T004 en paralelo.
- Foundational: T008 y T011 en paralelo (T009/T010 secuenciales por dependencias de tipos/schema).
- Una vez completada Foundational, US1, US2, US4 y US6 pueden avanzar en paralelo (equipos distintos).
- Dentro de cada historia, las tareas marcadas [P] (tests, componentes, páginas) corren en paralelo.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 juntos (deben fallar primero):
Task: "Prueba de aislamiento en tests/integration/tenant-isolation.test.ts"
Task: "Pruebas unitarias de la extensión en tests/unit/tenant-db.test.ts"

# Implementación: errores en paralelo con la preparación; luego la factoría:
Task: "Crear errores de dominio en src/lib/errors.ts"
# (T015 tenant-db.ts depende de T011 y T014)
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Completar Phase 1 (Setup) y Phase 2 (Foundational).
2. Completar US1 (aislamiento) y US2 (alta de organización).
3. **PARAR y VALIDAR**: probar aislamiento y alta de forma independiente (quickstart 1 y 2).
4. Desplegar/demostrar el núcleo multitenant.

### Incremental Delivery

1. Foundation lista → MVP (US1 + US2).
2. + US3 (consola mango) y US4 (CLI mango) → operación de plataforma.
3. + US5 (gating de planes) → modelo de negocio aplicado.
4. + US6 (reset) y US7 (navegación) → autonomía y experiencia.
5. Cada historia añade valor sin romper las anteriores.

### Parallel Team Strategy

Tras Foundational: Dev A → US1 (+US3 luego), Dev B → US2 (+US5 luego), Dev C → US4/US6/US7.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- El código de feature SIEMPRE accede a datos vía `getTenantDb()`/`getAdminDb()`, nunca el cliente
  base (FR-002): es la barrera real del aislamiento.
- Verificar que las pruebas fallan antes de implementar; commit por tarea o grupo lógico.
- Las cuotas numéricas del seed son ajustables; no codificar límites fuera de la tabla `Plan`.
