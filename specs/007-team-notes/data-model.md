# Data Model — Equipo de trabajo y Notas (FASE 4)

**Fecha**: 2026-07-03 · **Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

Una única migración versionada (`<ts>_team_notes`). Ningún dato existente cambia de forma; solo
se añaden un valor de enum, un enum nuevo, tres modelos y relaciones en `User`.

## Cambios en enums

### `UserStatus` (existente — se amplía)

```prisma
enum UserStatus {
  ACTIVE    // «activo»
  INVITED   // «invitado» — NUEVO: fila creada por invitación, sin contraseña aún
  INACTIVE  // «inactivo» — acceso revocado por un administrador
  SUSPENDED // reservado; sin uso en esta fase
}
```

Mapeo con la spec: activo → `ACTIVE`, invitado → `INVITED`, inactivo → `INACTIVE`.

### `NoteScope` (nuevo)

```prisma
/// Alcance contextual único de una nota (FR-016/FR-017).
enum NoteScope {
  GLOBAL
  PROJECT
  TASK
  TEAM
}
```

## Modelos nuevos

### `Team`

```prisma
/// Equipo de trabajo del tenant (FASE 4). Membresía M:N implícita con User.
model Team {
  id          String  @id @default(cuid())
  tenantId    String
  name        String
  description String? @db.Text

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant  Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  members User[]
  notes   Note[]

  @@index([tenantId])
  @@map("teams")
}
```

- Entra en `SCOPED_MODELS` (todo acceso de negocio queda filtrado por `tenantId`).
- La M:N implícita crea la tabla de unión `_TeamToUser` gestionada por Prisma (research D2).

### `Note`

```prisma
/// Nota con alcance contextual único (FASE 4). La invariante XOR
/// alcance ↔ referencia se valida en la capa de negocio (research D3).
model Note {
  id        String    @id @default(cuid())
  tenantId  String
  scope     NoteScope
  title     String
  content   String    @db.Text
  projectId String?
  taskId    String?
  teamId    String?
  /// Autor; «autor eliminado» si el usuario desaparece (la desactivación no borra).
  authorId  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant  Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task    Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  team    Team?    @relation(fields: [teamId], references: [id], onDelete: Cascade)
  author  User?    @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([tenantId, updatedAt])
  @@index([projectId])
  @@index([taskId])
  @@index([teamId])
  @@map("notes")
}
```

- Entra en `SCOPED_MODELS`.
- `onDelete: Cascade` en las tres referencias implementa FR-023 en la BD (las notas mueren con
  su contexto, incluso si el borrado ocurre por otra ruta).
- `@@index([tenantId, updatedAt])` sirve el widget «Notas recientes» y el listado ordenado.

### `InvitationToken`

```prisma
/// Token de activación de un miembro invitado (FASE 4). Espejo de
/// PasswordResetToken: un solo uso, caducidad 7 días, solo se persiste el hash.
model InvitationToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("invitation_tokens")
}
```

- **No** entra en `SCOPED_MODELS`: no es entidad de negocio consultable; solo lo tocan las
  mutaciones de `src/lib/members/` (que verifican rol ADMIN y tenant) y la aceptación pública
  por token.

## Cambios en modelos existentes

### `User` (solo relaciones nuevas)

```prisma
model User {
  // ... campos existentes sin cambios ...
  teams            Team[]
  notesAuthored    Note[]
  invitationTokens InvitationToken[]
}
```

## Reglas de validación (capa Zod + mutaciones)

| Regla | Dónde | Requisito |
|---|---|---|
| Email de invitación válido y único en la plataforma | `members/schemas.ts` + índice único `users.email`; mensaje sin revelar otras organizaciones | FR-002, FR-004 |
| Rol de invitación ∈ {ADMIN, MANAGER, MEMBER, VIEWER} (nunca MANGO) | `members/schemas.ts` | FR-002 |
| Contraseña de activación con la misma política que el registro | `members/schemas.ts` (reusa reglas existentes) | FR-003 |
| Cuota: `count(User where status ∈ {ACTIVE, INVITED}) < plan.maxUsers` en transacción serializable | `plans/gating.ts` + `members/mutations.ts` | FR-009 |
| No cambiar el propio rol; no dejar 0 `ADMIN ACTIVE` (transacción) | `members/mutations.ts` (`LastAdminError`) | FR-006, FR-008 |
| Nombre de equipo obligatorio (1–120), descripción opcional | `teams/schemas.ts` | FR-012 |
| Miembros asignados a equipo pertenecen al tenant | `teams/mutations.ts` | FR-013, FR-026 |
| Título de nota obligatorio (1–200); contenido obligatorio (texto plano) | `notes/schemas.ts` | FR-016 |
| XOR alcance ↔ referencia (unión discriminada): `GLOBAL` sin refs; `PROJECT` solo `projectId`; `TASK` solo `taskId`; `TEAM` solo `teamId` | `notes/schemas.ts` + re-verificación de existencia/tenant en `notes/mutations.ts` | FR-017 |
| Permisos de nota: autor edita/elimina las suyas; ADMIN/MANAGER cualquiera; VIEWER solo lee | `authz-notes.ts` + verificación en mutaciones | FR-019, SC-008 |

## Ciclos de vida

### Miembro (`User.status`)

```text
(invitar) → INVITED --(acepta enlace vigente)--> ACTIVE
INVITED --(cancelar invitación)--> [fila eliminada; libera cupo]
ACTIVE  --(desactivar)--> INACTIVE --(reactivar)--> ACTIVE
```

- `INVITED` e `INACTIVE` no pueden iniciar sesión (`authorize` exige `ACTIVE`; un invitado
  además no tiene contraseña).
- `ACTIVE → INACTIVE` revoca el acceso en la siguiente interacción (guarda en `getTenantDb()` +
  layout, research D5) y conserva proyectos, tareas y notas del usuario (FR-010).

### Invitación (`InvitationToken`)

```text
pendiente (usedAt = null, expiresAt > now)
  --(aceptar)--> usada (usedAt fijado) + User → ACTIVE
  --(reenviar)--> token anterior invalidado (usedAt fijado), token nuevo pendiente
  --(caducar: expiresAt ≤ now)--> inválida; el enlace muestra error y ofrece pedir reenvío
  --(cancelar)--> eliminada junto con el User INVITED (cascade)
```

### Nota

```text
creada (author = sesión) → editada (updatedAt refleja la última edición)
  --(delete directo con permiso)--> eliminada
  --(delete de proyecto/tarea/equipo)--> eliminada por cascada (FR-023)
  --(delete del autor)--> permanece con authorId = null («autor eliminado»)
```

## Consultas clave (sin N+1)

| Consulta | Forma | Requisito |
|---|---|---|
| Listado de miembros + carga | `user.findMany` (tenant) + `task.groupBy(assigneeId, status ≠ DONE)` + `project.groupBy(ownerId, status ∉ {COMPLETED, ARCHIVED})`, fusión en memoria | FR-001, FR-011 |
| Listado de equipos | `team.findMany` con `_count.members` | FR-014 |
| Detalle de equipo | `team.findUnique` con `members` + notas del equipo ordenadas por `updatedAt desc` | FR-014, FR-022 |
| Listado central de notas | `note.findMany` paginado; `where` combinable: `scope`, `OR [title contains q, content contains q]` (colación `*_ai_ci`); `include author`, referencia según scope | FR-021, SC-006 |
| Notas recientes (widget) | `note.findMany take 4 orderBy updatedAt desc` (índice `[tenantId, updatedAt]`) | FR-024 |
| Notas por contexto | `note.findMany where projectId/taskId/teamId` | FR-022 |
