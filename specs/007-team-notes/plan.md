# Implementation Plan: Equipo de trabajo y Notas (FASE 4)

**Branch**: `007-team-notes` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-team-notes/spec.md`

## Summary

Incorporar la gestión de miembros de la organización (invitación por enlace con caducidad de
7 días, roles `admin`/`manager`/`member`/`viewer`, estados activo/invitado/inactivo, cuota de
usuarios por plan contando activos + invitados, protección del último administrador y carga de
trabajo por miembro), los equipos de trabajo (CRUD con composición M:N de miembros) y las notas
con alcance contextual único (global · proyecto · tarea · equipo), legibles por toda la
organización, con listado central filtrable y buscable, integración en las vistas de detalle y
sustitución de los placeholders del panel (widget «Notas recientes» y acción «Nueva nota»).

Enfoque técnico: replicar el patrón probado de las FASES 2–3 (lógica de negocio pura en
`src/lib/{members,teams,notes}/` cubierta con Vitest, Server Actions delgadas, UI RSC-first con
islas cliente). Ampliaciones de esquema: valor `INVITED` en `UserStatus`, modelos `Team`, `Note`
(enum `NoteScope`) e `InvitationToken` (espejo de `PasswordResetToken`). La gestión de miembros
vive como pestaña nueva del modal de ajustes (spec 003); equipos y notas son secciones del
sidebar. Esta fase inaugura la convención transversal de TanStack Query en componentes cliente
(provider nuevo + query keys escopadas por tenant + invalidación tras cada mutación).

## Technical Context

**Language/Version**: TypeScript 5 (estricto) sobre Next.js 16 (App Router) + React 19 (React Compiler activo)

**Primary Dependencies**: Prisma 7 (`@/generated/prisma/client`, adapter MariaDB), NextAuth v5 (JWT con `tenantId`/`role`), TanStack Query 5 (ya instalado, provider por montar), shadcn/ui + Tailwind v4, React Hook Form + Zod, Sonner, nodemailer (`src/lib/mailer.ts` con fallback a consola); **sin dependencias nuevas**

**Storage**: MySQL/MariaDB vía Prisma; una migración versionada (enum `INVITED`, `Team`, `Note`, `InvitationToken`, M:N `Team ↔ User`)

**Testing**: Vitest (`tests/unit/`, `tests/integration/` contra la BD real de `.env.local`, patrón ya establecido)

**Target Platform**: Web (SSR/RSC), desplegable en Docker standalone

**Project Type**: Aplicación web Next.js App Router con colocación por feature

**Performance Goals**: búsqueda de notas < 1 s con hasta 1.000 notas (SC-006); invitación completada en < 1 min y activación < 3 min (SC-001); nota desde acción rápida < 30 s con reflejo inmediato en el widget (SC-005)

**Constraints**: aislamiento total por `tenantId` (FR-026, SC-004); cuota de usuarios = activos + invitados (FR-009, Clarifications); revocación efectiva en la siguiente interacción (FR-007, SC-003); alcance de nota mutuamente excluyente validado en servidor (FR-017); UI en español con estados de carga/vacío/error coherentes (FR-028); RSC-first con TanStack Query solo en islas cliente (Principio IV + convención transversal)

**Scale/Scope**: decenas de miembros y equipos por tenant, hasta ~1.000 notas; 1 migración, ~18 componentes nuevos, 2 rutas de sección + 1 ruta pública de invitación, 1 pestaña nueva en ajustes, 2 placeholders del panel sustituidos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Calidad del código | Sin dependencias nuevas (TanStack Query y nodemailer ya presentes); código nuevo pasa Biome/React Doctor/TS estricto; no se toca `src/components/ui/` ni `src/generated/` | ✅ |
| II. Estándares de prueba | La lógica de negocio (invitaciones con cuota, último admin, XOR de alcance, permisos, búsquedas) vive en `src/lib/{members,teams,notes}/` y `src/lib/authz-*.ts`, cubierta con Vitest unit + integración (aislamiento, cascadas, revocación, cuota concurrente) | ✅ |
| III. Coherencia de UX | Solo shadcn/ui existentes; Sonner; estados vacíos/carga/error; español; tema claro/oscuro; teclado; mismos patrones de tabla/diálogo que FASES 2–3; la pestaña de ajustes reutiliza el shell del modal (spec 003) | ✅ |
| IV. Rendimiento | RSC para lectura (listados, detalles, widget); paginación en servidor para notas; carga por usuario con `groupBy` (sin N+1); TanStack Query solo en islas interactivas; validación de estado de usuario con 1 lookup por PK | ✅ |
| V. Documentación en español | Todos los artefactos de este spec y los comentarios de propósito en español | ✅ |

**Resultado pre-Phase 0**: PASS (sin violaciones que justificar).
**Resultado post-Phase 1**: PASS — ver re-evaluación al final.

## Project Structure

### Documentation (this feature)

```text
specs/007-team-notes/
├── plan.md              # Este archivo
├── research.md          # Phase 0 (decisiones y alternativas)
├── data-model.md        # Phase 1 (esquema y migración)
├── quickstart.md        # Phase 1 (guía de validación manual)
├── contracts/
│   └── server-actions.md   # Phase 1 (contratos de Server Actions y rutas)
└── tasks.md             # Phase 2 (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                    # + INVITED en UserStatus, NoteScope, Team, Note,
│                                    #   InvitationToken, M:N Team ↔ User, relaciones en User
└── migrations/<ts>_team_notes/      # migración versionada

src/lib/
├── auth.ts                          # AMPLIADO: authorize rechaza status ≠ ACTIVE
├── tenant-db-session.ts             # AMPLIADO: getTenantDb() verifica estado del usuario (revocación)
├── tenant-db.ts                     # AMPLIADO: + "Team", "Note" en SCOPED_MODELS
├── plans/gating.ts                  # AMPLIADO: cuota "users" cuenta solo ACTIVE + INVITED
├── authz-members.ts                 # NUEVO: permisos de gestión de miembros (solo ADMIN/MANGO)
├── authz-teams.ts                   # NUEVO: permisos de equipos (ADMIN/MANAGER/MANGO gestionan)
├── authz-notes.ts                   # NUEVO: permisos de notas (autor + ADMIN/MANAGER; VIEWER solo lee)
├── members/                         # NUEVO: lógica de negocio de miembros
│   ├── schemas.ts                   # Zod: invitación (email+rol), aceptación (nombre+contraseña), cambio de rol
│   ├── tokens.ts                    # generación/hash/verificación del token de invitación (7 días)
│   ├── queries.ts                   # listado con estado + carga de trabajo (groupBy tareas/proyectos)
│   └── mutations.ts                 # invitar (cuota+transacción), aceptar, reenviar, cancelar,
│                                    # cambiar rol / desactivar / reactivar (guard último admin)
├── teams/                           # NUEVO: lógica de negocio de equipos
│   ├── schemas.ts                   # Zod: nombre obligatorio, descripción opcional, miembros
│   ├── queries.ts                   # listado con conteo de miembros, detalle con miembros y notas
│   └── mutations.ts                 # CRUD + gestión de membresía (delete → cascada de notas)
└── notes/                           # NUEVO: lógica de negocio de notas
    ├── schemas.ts                   # Zod: título/contenido, XOR alcance ↔ referencia
    ├── queries.ts                   # listado central paginado + filtro alcance + búsqueda,
    │                                # notas por contexto, recientes para el widget
    └── mutations.ts                 # create/update/delete con verificación de permisos y referencias

src/components/providers/
└── query-provider.tsx               # NUEVO: QueryClientProvider (convención TanStack Query)

src/app/(main)/
├── invite/
│   └── page.tsx                     # NUEVO: aceptación de invitación (?token=), estilo /reset
├── _components/auth/
│   └── invite-form.tsx              # NUEVO: formulario nombre + contraseña (RHF+Zod)
└── dashboard/
    ├── layout.tsx                   # AMPLIADO: monta QueryProvider
    ├── page.tsx                     # AMPLIADO: obtiene notas recientes reales (RSC) para el widget
    ├── _components/
    │   ├── recent-notes-card.tsx    # SUSTITUIDO: datos reales + estado vacío + «Ver todas» → /dashboard/notes
    │   ├── quick-actions.tsx        # AMPLIADO: «Nueva nota» abre note-form-dialog operativo
    │   └── sidebar/settings-dialog/
    │       ├── settings-dialog.tsx  # AMPLIADO: pestaña «Miembros» (solo ADMIN)
    │       └── members-settings.tsx # NUEVO: gestión de miembros (TanStack Query + Server Actions)
    ├── teams/                       # NUEVO: sección de equipos
    │   ├── page.tsx                 # RSC: listado de equipos
    │   ├── actions.ts               # Server Actions delgadas ("use server")
    │   ├── _components/
    │   │   ├── teams-table.tsx      # listado + estados vacíos (acciones según rol)
    │   │   ├── team-form-dialog.tsx # crear/editar equipo + selección de miembros
    │   │   └── delete-team-dialog.tsx  # confirmación con conteo de notas a eliminar
    │   └── [teamId]/
    │       ├── page.tsx             # RSC: detalle (miembros + notas del equipo)
    │       └── _components/
    │           ├── team-members-card.tsx   # composición con añadir/retirar
    │           └── team-notes-section.tsx  # notas del equipo + crear en contexto
    ├── notes/                       # NUEVO: sección central de notas
    │   ├── page.tsx                 # RSC: listado paginado con filtro/búsqueda vía searchParams
    │   ├── actions.ts               # Server Actions delgadas
    │   └── _components/
    │       ├── notes-list.tsx       # tarjetas de nota + estados vacíos
    │       ├── notes-filters.tsx    # buscador + filtro por alcance (client)
    │       ├── note-form-dialog.tsx # crear/editar con selector de alcance y referencia (client)
    │       └── delete-note-dialog.tsx
    └── projects/[projectId]/
        ├── page.tsx                 # AMPLIADO: sección de notas del proyecto
        └── _components/
            ├── project-notes-section.tsx  # NUEVO: notas del proyecto + crear en contexto
            ├── task-list.tsx        # AMPLIADO: acción «Notas» por tarea
            └── task-notes-sheet.tsx # NUEVO: panel lateral con notas de la tarea

src/navigation/sidebar/sidebar-items.ts  # + «Equipos» → /dashboard/teams, «Notas» → /dashboard/notes

tests/
├── unit/
│   ├── member-schemas.test.ts       # Zod invitación/aceptación, fuerza de contraseña
│   ├── note-schemas.test.ts         # XOR alcance ↔ referencia, título/contenido
│   ├── invitation-tokens.test.ts    # generación/hash/caducidad (7 días)
│   └── authz-team-notes.test.ts     # matrices de permisos (miembros, equipos, notas)
└── integration/
    ├── members-invite.test.ts       # invitar (cuota, duplicado), aceptar, reenviar/cancelar, caducidad
    ├── members-roles.test.ts        # cambio de rol, último admin, desactivar/reactivar, revocación
    ├── teams-crud.test.ts           # CRUD, membresía M:N, delete cascada notas, aislamiento
    ├── notes-crud.test.ts           # CRUD, XOR, permisos por rol, cascadas proyecto/tarea/equipo
    └── notes-queries.test.ts        # filtro por alcance, búsqueda, paginación, recientes, carga por usuario
```

**Structure Decision**: colocación por feature (patrón del repo). La lógica de negocio se extrae
a `src/lib/{members,teams,notes}/` para probarla con Vitest sin montar rutas (Principio II); las
Server Actions viven junto a cada ruta y son envoltorios finos: sesión → cliente escopado →
`mutations.ts`/`queries.ts` → `revalidatePath`. La gestión de miembros no es una ruta: es una
pestaña del modal de ajustes existente (Clarifications), por lo que consume datos desde el
cliente con TanStack Query (primer uso de la convención transversal); equipos y notas siguen el
patrón RSC-first de proyectos/clientes con islas cliente para formularios y filtros.

## Complexity Tracking

Sin violaciones a la constitución: tabla no aplicable.

## Re-evaluación Constitution Check (post-Phase 1)

El diseño final (data-model.md, contracts/) se mantiene dentro de las puertas:

- La migración añade modelos nuevos y un valor de enum; no altera datos existentes. `Team` y
  `Note` entran en `SCOPED_MODELS`, así que todo acceso de negocio queda escopado sin lógica
  nueva de aislamiento (FR-026). `InvitationToken` no es un modelo de negocio escopado: solo se
  accede vía mutaciones de `src/lib/members/` que verifican rol ADMIN y tenant.
- La exclusión mutua del alcance de nota (FR-017) se valida en Zod (unión discriminada) y se
  re-verifica en la mutación contra el tenant (referencia existente y del mismo tenant), con
  pruebas de integración; MySQL no soporta CHECK portables vía Prisma (ver research D3).
- La revocación (FR-007, SC-003) se resuelve con un lookup por PK del usuario en
  `getTenantDb()`/layout — coste O(1) por request, sin N+1 (research D5).
- La carga por usuario (FR-011) usa dos `groupBy` (tareas por `assigneeId`, proyectos por
  `ownerId`) — sin N+1 (Principio IV).
- La cuota concurrente reutiliza el patrón de transacción serializable ya probado en
  `createProjectWithQuota` (FR-009).
- El provider de TanStack Query es un componente propio sobre la librería ya instalada; no
  debilita Biome/React Doctor ni toca código generado.

**Resultado**: PASS.
