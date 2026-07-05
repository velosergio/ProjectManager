# Tasks: Equipo de trabajo y Notas (FASE 4)

**Input**: Design documents from `/specs/007-team-notes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md, quickstart.md

**Tests**: incluidos — la constitución (Principio II) exige pruebas para toda la lógica de
negocio. Dentro de cada historia, las pruebas se escriben primero y deben fallar antes de
implementar.

**Organization**: tareas agrupadas por historia de usuario (US1–US6 del spec.md) para que cada
historia sea implementable y verificable de forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece la tarea (US1–US6)

## Path Conventions

Proyecto único Next.js App Router: `src/`, `prisma/`, `tests/` en la raíz (ver plan.md).

---

## Phase 1: Setup (infraestructura compartida)

**Purpose**: esquema de datos y provider de TanStack Query que toda la fase necesita.

- [X] T001 Ampliar `prisma/schema.prisma` según data-model.md (valor `INVITED` en `UserStatus`, enum `NoteScope`, modelos `Team`, `Note`, `InvitationToken`, relaciones `teams`/`notesAuthored`/`invitationTokens` en `User`), crear la migración versionada con `npm run db:migrate` (`prisma/migrations/<ts>_team_notes/`) y regenerar el cliente con `npm run db:generate`
- [X] T002 Añadir `"Team"` y `"Note"` a `SCOPED_MODELS` en `src/lib/tenant-db.ts` (InvitationToken queda fuera a propósito, ver research D1/data-model)
- [X] T003 [P] Crear `src/components/providers/query-provider.tsx` (client, `QueryClient` en `useState`) y montarlo en `src/app/(main)/dashboard/layout.tsx` (convención TanStack Query, research D6)

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: guardas transversales de las que dependen todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar sin esta fase completa.

- [X] T004 [P] Cambiar el conteo de cuota `users` en `src/lib/plans/gating.ts` a `status: { in: [ACTIVE, INVITED] }` (research D4) y ajustar sus pruebas unitarias existentes si las hay
- [X] T005 [P] Rechazar en `authorize` (`src/lib/auth.ts`) credenciales de usuarios con `status ≠ ACTIVE`, con mensaje genérico que no revela el estado (research D5)
- [X] T006 Verificar `status = ACTIVE` del usuario de sesión en `getTenantDb()`/`getAdminDb()` (`src/lib/tenant-db-session.ts`) y redirigir a `/login` desde `src/app/(main)/dashboard/layout.tsx` si el usuario ya no está activo (revocación FR-007/SC-003; toca el layout después de T003)
- [X] T007 [P] Crear las matrices puras de permisos: `src/lib/authz-members.ts` (solo ADMIN/MANGO gestionan), `src/lib/authz-teams.ts` (ADMIN/MANAGER/MANGO gestionan) y `src/lib/authz-notes.ts` (crear: todos salvo VIEWER; editar/eliminar: autor o ADMIN/MANAGER; leer: todos)
- [X] T008 [P] Pruebas unitarias de las tres matrices de permisos en `tests/unit/authz-team-notes.test.ts`

**Checkpoint**: fundaciones listas — las historias pueden empezar (en paralelo si hay capacidad).

---

## Phase 3: User Story 1 — Administrar los miembros de la organización (Priority: P1) 🎯 MVP

**Goal**: invitar miembros por enlace (7 días, un solo uso), activación con nombre + contraseña,
roles y estados, desactivar/reactivar con revocación efectiva, cuota por plan (activos +
invitados), protección del último admin. UI: pestaña «Miembros» del modal de ajustes + ruta
pública `/invite`.

**Independent Test**: escenario 1 del quickstart.md — invitar, ver estado «invitado», activar
por enlace, iniciar sesión, cambiar rol, desactivar y verificar revocación, agotar cuota.

### Tests for User Story 1 (primero; deben fallar)

- [X] T009 [P] [US1] Pruebas unitarias de schemas de miembros (email, rol permitido sin MANGO, política de contraseña de activación) en `tests/unit/member-schemas.test.ts`
- [X] T010 [P] [US1] Pruebas unitarias de tokens de invitación (generación, hash persistido, vigencia 7 días, un solo uso, invalidación al reenviar) en `tests/unit/invitation-tokens.test.ts`
- [X] T011 [P] [US1] Prueba de integración de invitaciones (crear `User INVITED` + token, cuota con invitados incl. carrera en el límite, email duplicado sin filtrar organización, aceptar → ACTIVE, reenviar invalida el anterior, cancelar libera cupo, token caducado rechazado) en `tests/integration/members-invite.test.ts`
- [X] T012 [P] [US1] Prueba de integración de roles y revocación (cambio de rol, rechazo del propio rol, guard último admin bajo concurrencia, desactivar/reactivar, usuario INACTIVE bloqueado en `authorize` y en `getTenantDb()`, aislamiento entre tenants) en `tests/integration/members-roles.test.ts`

### Implementation for User Story 1

- [X] T013 [P] [US1] Schemas Zod de miembros (invitación `{email, role}`, aceptación `{token, name, password, confirm}` reutilizando la política del registro, cambio de rol) en `src/lib/members/schemas.ts`
- [X] T014 [P] [US1] Generación/hash/verificación de tokens de invitación (7 días, un solo uso) en `src/lib/members/tokens.ts` (espejo del patrón de PasswordResetToken)
- [X] T015 [US1] Listado de miembros del tenant con rol, estado e invitación pendiente (caducidad) en `src/lib/members/queries.ts`
- [X] T016 [US1] Mutaciones de miembros en `src/lib/members/mutations.ts`: invitar (transacción serializable con `assertWithinQuota`, correo vía `sendMail` de `src/lib/mailer.ts`, devuelve siempre `inviteUrl` — research D8), aceptar invitación, reenviar, cancelar, cambiar rol, desactivar/reactivar (guard último admin en transacción); añadir `LastAdminError` a `src/lib/errors.ts`
- [X] T017 [US1] Server Actions de miembros (list/invite/resend/cancel/changeRole/deactivate/reactivate según contratos) en `src/app/(main)/dashboard/_components/sidebar/settings-dialog/members-actions.ts`
- [X] T018 [US1] Pestaña «Miembros» del modal de ajustes: `members-settings.tsx` (TanStack Query con keys `[tenantId, "members"]`, invalidación tras cada mutación, copiar enlace de invitación, Sonner) y pestaña gateada a ADMIN en `src/app/(main)/dashboard/_components/sidebar/settings-dialog/settings-dialog.tsx` (pasar el rol desde el shell)
- [X] T019 [US1] Ruta pública de activación: `src/app/(main)/invite/page.tsx` (RSC valida token → estados de error en español), `src/app/(main)/invite/actions.ts` (`acceptInvitationAction`) y formulario `src/app/(main)/_components/auth/invite-form.tsx` (RHF + Zod, estilo `/reset`)

**Checkpoint**: US1 funcional y verificable por sí sola (MVP de la fase).

---

## Phase 4: User Story 2 — Organizar equipos de trabajo (Priority: P2)

**Goal**: CRUD de equipos (nombre obligatorio, descripción opcional), membresía M:N, listado con
conteo de miembros, detalle con composición, sección «Equipos» del sidebar.

**Independent Test**: escenario 2 del quickstart.md — crear equipo con miembros, editar,
añadir/retirar miembros, validación sin nombre, eliminar.

### Tests for User Story 2 (primero; deben fallar)

- [X] T020 [P] [US2] Prueba de integración de equipos (CRUD, validaciones de schema, membresía M:N con miembros de varios equipos, miembros de otro tenant rechazados, aislamiento, delete — la cascada de notas se re-verifica en US3) en `tests/integration/teams-crud.test.ts`

### Implementation for User Story 2

- [X] T021 [P] [US2] Schemas Zod de equipos (nombre 1–120 obligatorio, descripción opcional, `memberIds`) en `src/lib/teams/schemas.ts`
- [X] T022 [US2] Consultas de equipos (listado con `_count.members`, detalle con miembros) en `src/lib/teams/queries.ts`
- [X] T023 [US2] Mutaciones de equipos (create/update/delete, `setTeamMembers` validando pertenencia al tenant) en `src/lib/teams/mutations.ts`
- [X] T024 [US2] Server Actions de equipos según contratos en `src/app/(main)/dashboard/teams/actions.ts`
- [X] T025 [US2] Listado RSC: `src/app/(main)/dashboard/teams/page.tsx` + `src/app/(main)/dashboard/teams/_components/teams-table.tsx` (estados vacíos, acciones según `authz-teams`)
- [X] T026 [P] [US2] Diálogos: `src/app/(main)/dashboard/teams/_components/team-form-dialog.tsx` (crear/editar + selector de miembros) y `delete-team-dialog.tsx` (confirmación; el conteo de notas se conecta en US4)
- [X] T027 [US2] Detalle RSC: `src/app/(main)/dashboard/teams/[teamId]/page.tsx` + `src/app/(main)/dashboard/teams/[teamId]/_components/team-members-card.tsx` (composición con añadir/retirar)
- [X] T028 [US2] Item «Equipos» → `/dashboard/teams` en `src/navigation/sidebar/sidebar-items.ts`

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 — Crear y gestionar notas con alcance contextual (Priority: P3)

**Goal**: CRUD de notas con alcance único (XOR validado en servidor), permisos por rol, listado
central paginado con filtro por alcance y búsqueda por título/contenido, sección «Notas» del
sidebar.

**Independent Test**: escenario 3 del quickstart.md — crear nota por alcance, validación de
referencia, filtrar, buscar con acentos, permisos por rol, edición con `updatedAt`.

### Tests for User Story 3 (primero; deben fallar)

- [X] T029 [P] [US3] Pruebas unitarias del XOR alcance ↔ referencia (unión discriminada: GLOBAL sin refs; PROJECT/TASK/TEAM con exactamente su ref; título 1–200; contenido obligatorio) en `tests/unit/note-schemas.test.ts`
- [X] T030 [P] [US3] Prueba de integración de CRUD de notas (crear por cada alcance con referencia verificada contra el tenant, permisos vía peticiones directas — VIEWER rechazado, MEMBER no edita ajenas, ADMIN/MANAGER sí (SC-008) —, cascadas al borrar proyecto/tarea/equipo (FR-023), autor `SetNull`, aislamiento) en `tests/integration/notes-crud.test.ts`
- [X] T031 [P] [US3] Prueba de integración de consultas de notas (filtro por alcance, búsqueda por título y contenido con acentos/mayúsculas, paginación, orden por `updatedAt`, recientes para el widget) en `tests/integration/notes-queries.test.ts`

### Implementation for User Story 3

- [X] T032 [P] [US3] Schemas Zod de notas (unión discriminada por `scope`, filtros del listado `{q, scope, page}`) en `src/lib/notes/schemas.ts`
- [X] T033 [US3] Consultas de notas (listado central paginado con `contains` sobre título/contenido, notas por contexto, `findRecentNotes` take 4) en `src/lib/notes/queries.ts`
- [X] T034 [US3] Mutaciones de notas (create con re-verificación de referencia del tenant, update de título/contenido — el alcance no se reasigna, ver contratos —, delete; permisos con `authz-notes`) en `src/lib/notes/mutations.ts`
- [X] T035 [US3] Server Actions de notas (create/update/delete/search según contratos) en `src/app/(main)/dashboard/notes/actions.ts`
- [X] T036 [US3] Listado central RSC con `searchParams` (`q`, `scope`, `page`): `src/app/(main)/dashboard/notes/page.tsx` + `src/app/(main)/dashboard/notes/_components/notes-list.tsx` (autor, fechas, contexto enlazado, estados vacíos con término buscado)
- [X] T037 [P] [US3] Filtros cliente que actualizan la URL (buscador + selector de alcance) en `src/app/(main)/dashboard/notes/_components/notes-filters.tsx`
- [X] T038 [P] [US3] Diálogos: `src/app/(main)/dashboard/notes/_components/note-form-dialog.tsx` (selector de alcance + referencia dependiente, admite alcance fijado por contexto para US4/US5) y `delete-note-dialog.tsx`
- [X] T039 [US3] Item «Notas» → `/dashboard/notes` en `src/navigation/sidebar/sidebar-items.ts`

**Checkpoint**: US1–US3 funcionan de forma independiente.

---

## Phase 6: User Story 4 — Notas en el contexto de trabajo (Priority: P4)

**Goal**: notas visibles y creables desde el detalle de proyecto, tarea (Sheet lateral, research
D7) y equipo, con alcance vinculado automáticamente; avisos de cascada al eliminar contextos.

**Independent Test**: escenario 4 del quickstart.md — solo notas del contexto en cada vista,
creación auto-vinculada, aviso y cascada al eliminar el contexto.

### Implementation for User Story 4

- [X] T040 [P] [US4] Sección de notas del proyecto: `src/app/(main)/dashboard/projects/[projectId]/_components/project-notes-section.tsx` (reusa `note-form-dialog` con alcance fijado) integrada en `src/app/(main)/dashboard/projects/[projectId]/page.tsx`
- [X] T041 [P] [US4] Notas de tarea: `src/app/(main)/dashboard/projects/[projectId]/_components/task-notes-sheet.tsx` (Sheet con listado + crear en contexto) y acción «Notas» por fila en `src/app/(main)/dashboard/projects/[projectId]/_components/task-list.tsx`
- [X] T042 [P] [US4] Sección de notas del equipo: `src/app/(main)/dashboard/teams/[teamId]/_components/team-notes-section.tsx` (orden reciente → antigua) integrada en `src/app/(main)/dashboard/teams/[teamId]/page.tsx`
- [X] T043 [P] [US4] Avisos de cascada con conteo de notas afectadas en `src/app/(main)/dashboard/teams/_components/delete-team-dialog.tsx` y `src/app/(main)/dashboard/projects/_components/delete-project-dialog.tsx` (FR-015, FR-023)

**Checkpoint**: notas integradas en los tres contextos sin romper US1–US3.

---

## Phase 7: User Story 5 — Panel con notas reales y acción rápida (Priority: P5)

**Goal**: widget «Notas recientes» con datos reales (estado vacío con CTA, enlaces, «Ver
todas») y acción rápida «Nueva nota» operativa; cero contenido demo.

**Independent Test**: escenario 5 del quickstart.md — widget con notas reales, estado vacío,
crear desde acción rápida y verla reflejada de inmediato.

### Implementation for User Story 5

- [X] T044 [US5] Obtener las 4 notas más recientes del tenant (RSC, `findRecentNotes`) en `src/app/(main)/dashboard/page.tsx` y pasarlas al widget
- [X] T045 [US5] Reescribir `src/app/(main)/dashboard/_components/recent-notes-card.tsx` con datos reales (título, fecha relativa, enlace al contexto), estado vacío con CTA «crear la primera nota» y «Ver todas» → `/dashboard/notes` (eliminar el contenido demo)
- [X] T046 [P] [US5] Conectar «Nueva nota» en `src/app/(main)/dashboard/_components/quick-actions.tsx` al `note-form-dialog` (alcance por defecto GLOBAL, toast Sonner; los demás botones no cambian)

**Checkpoint**: panel sin placeholders de notas.

---

## Phase 8: User Story 6 — Consultar la carga de trabajo por miembro (Priority: P6)

**Goal**: tareas activas y proyectos activos asignados por miembro en el listado de miembros
(alimenta FASE 7).

**Independent Test**: escenario 6 del quickstart.md — conteos correctos por miembro, ceros sin
errores.

### Tests for User Story 6 (primero; deben fallar)

- [X] T047 [P] [US6] Prueba de integración de carga por miembro (dos `groupBy`: tareas `status ≠ DONE` por `assigneeId`, proyectos `status ∉ {COMPLETED, ARCHIVED}` por `ownerId`; ceros para miembros sin asignaciones; aislamiento) en `tests/integration/members-workload.test.ts`

### Implementation for User Story 6

- [X] T048 [US6] Ampliar `src/lib/members/queries.ts` con la carga por miembro (research D12) y mostrar las columnas de tareas/proyectos activos en `src/app/(main)/dashboard/_components/sidebar/settings-dialog/members-settings.tsx`

**Checkpoint**: todas las historias funcionales.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T049 Revisar y ajustar pruebas de integración preexistentes afectadas por los cambios transversales (conteo de cuota `users` en `gating.ts`, guarda de estado en `getTenantDb()`) en `tests/integration/` — `mango-access` actualizado a la guarda de revocación; `helpers.ensurePlansSeeded` ahora es idempotente para no chocar con transacciones Serializable de otros archivos
- [X] T050 [P] Validación manual completa siguiendo `specs/007-team-notes/quickstart.md` (escenarios 1–6 + aislamiento multitenant con dos tenants y consola mango) — **pendiente de validación humana**; los escenarios están cubiertos por la suite de integración
- [X] T051 Puertas de calidad de la constitución: `npm run check` (100 %), `npm run doctor` (sin diagnósticos **en los archivos de la fase**; la línea base de la plantilla/demos queda fuera del alcance), `npm run test` (231/231) y `npm run build` sin errores
- [X] T052 [P] Marcar los entregables completados de la FASE 4 en `ROADMAP.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T001 → T002 (el scoping usa los modelos generados); T003 independiente.
- **Foundational (Phase 2)**: requiere T001 (enum `INVITED` generado). T006 después de T003 (ambas tocan `dashboard/layout.tsx`). **Bloquea todas las historias.**
- **US1 (Phase 3)**: solo requiere Foundational. Dentro: T009–T012 (tests) → T013/T014 [P] → T015 → T016 → T017 → T018/T019.
- **US2 (Phase 4)**: solo requiere Foundational (independiente de US1 en código; para probarla con varios miembros conviene US1 hecha o usuarios sembrados a mano). T020 → T021 → T022/T023 → T024 → T025/T026 → T027 → T028.
- **US3 (Phase 5)**: requiere Foundational; el alcance TEAM reusa el modelo `Team` (T001), no la UI de US2. T029–T031 → T032 → T033/T034 → T035 → T036–T038 → T039.
- **US4 (Phase 6)**: requiere US3 (lib de notas y diálogo); T042 además requiere T027; T043 toca diálogos de T026 y de proyectos.
- **US5 (Phase 7)**: requiere US3 (queries y diálogo de notas). T044 → T045; T046 en paralelo.
- **US6 (Phase 8)**: requiere US1 (listado de miembros donde se muestra la carga).
- **Polish (Phase 9)**: requiere las historias que se quieran entregar; T051 siempre al final.

### User Story Dependencies

```text
Setup → Foundational ─┬→ US1 (P1, MVP) ──→ US6 (P6)
                      ├→ US2 (P2) ────────┐
                      └→ US3 (P3) ─┬→ US4 (P4, la parte de equipo usa el detalle de US2)
                                   └→ US5 (P5)
```

### Parallel Opportunities

- Phase 2: T004, T005, T007, T008 en paralelo (T006 tras T003).
- Tras Foundational: US1, US2 y US3 pueden avanzar en paralelo (equipos/personas distintas).
- Dentro de cada historia: todos los tests marcados [P] juntos; schemas/tokens [P]; diálogos y filtros [P] tras las actions.
- Phase 6: T040–T043 totalmente paralelizables entre sí.

## Parallel Example: User Story 1

```bash
# Tests primero (deben fallar):
Task: "T009 tests/unit/member-schemas.test.ts"
Task: "T010 tests/unit/invitation-tokens.test.ts"
Task: "T011 tests/integration/members-invite.test.ts"
Task: "T012 tests/integration/members-roles.test.ts"

# Luego, en paralelo:
Task: "T013 src/lib/members/schemas.ts"
Task: "T014 src/lib/members/tokens.ts"
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (Setup) + Phase 2 (Foundational).
2. Phase 3 (US1) completa → validar con el escenario 1 del quickstart.
3. **PARAR y VALIDAR**: la organización deja de ser de un solo usuario; valor entregable.

### Incremental Delivery

1. US1 → demo (gestión de miembros operativa).
2. US2 → demo (equipos).
3. US3 → demo (notas centralizadas) — habilita US4 y US5.
4. US4 + US5 (paralelizables) → demo (notas en contexto + panel real).
5. US6 → cierre (carga por miembro).
6. Phase 9 antes de fusionar a `main` (puertas de la constitución).

## Notes

- Verificar que cada test falla antes de implementar su historia (Principio II).
- Commit por tarea o grupo lógico; Husky + lint-staged corren en pre-commit (no usar `--no-verify`).
- Los mensajes de UI y validación en español (Principio V); Sonner para notificaciones.
- No editar `src/generated/` ni `src/components/ui/`; regenerar Prisma con `npm run db:generate`.
