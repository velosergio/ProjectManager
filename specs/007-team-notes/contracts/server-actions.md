# Contratos — Server Actions y rutas (FASE 4)

**Fecha**: 2026-07-03 · **Spec**: [../spec.md](../spec.md) · **Data model**: [../data-model.md](../data-model.md)

Convenciones (heredadas de FASES 2–3):

- Toda action valida la entrada con Zod, resuelve la sesión, obtiene el cliente escopado con
  `getTenantDb()` y delega en `src/lib/{members,teams,notes}/`. Errores de dominio → resultado
  `{ ok: false, error: string }` en español; nunca se filtran errores crudos de Prisma.
- Resultado estándar: `{ ok: true, data? } | { ok: false, error, fieldErrors? }`.
- Tras cada mutación: `revalidatePath` de las rutas RSC afectadas. Las islas cliente con
  TanStack Query invalidan además sus query keys (`[tenantId, dominio, ...]`, research D6).
- Permisos verificados en servidor con `authz-members.ts` / `authz-teams.ts` / `authz-notes.ts`
  (la UI solo oculta; el servidor rechaza — SC-008).

## Miembros — pestaña «Miembros» del modal de ajustes

Ubicación: `src/app/(main)/dashboard/_components/sidebar/settings-dialog/` consume actions de
un `actions.ts` propio del dominio de miembros. Solo `ADMIN` (y `MANGO` vía consola) pasa la
autorización; el resto recibe `{ ok: false }`.

| Action | Entrada (Zod) | Salida | Reglas |
|---|---|---|---|
| `listMembersAction` | — | `{ members: MemberView[] }` con nombre, email, rol, estado, carga (tareas/proyectos activos), invitación pendiente (caducidad) | FR-001, FR-011; lectura permitida a todos los roles (solo gestión restringida) |
| `inviteMemberAction` | `{ email, role }` | `{ member, inviteUrl }` — la URL **siempre** se devuelve para copiar (research D8) | Cuota en transacción serializable (FR-009); email único (FR-004); crea `User INVITED` + token 7 días; envía correo vía `sendMail` |
| `resendInvitationAction` | `{ userId }` | `{ inviteUrl }` | Invalida el token anterior, genera uno nuevo (FR-005) |
| `cancelInvitationAction` | `{ userId }` | `{ ok }` | Solo si `status = INVITED`; elimina el `User` (cascade token) y libera cupo (FR-005) |
| `changeMemberRoleAction` | `{ userId, role }` | `{ ok }` | Rechaza el propio rol; guard último admin en transacción (FR-006, FR-008) |
| `deactivateMemberAction` | `{ userId }` | `{ ok }` | Guard último admin; conserva trabajo asignado (FR-007, FR-010) |
| `reactivateMemberAction` | `{ userId }` | `{ ok }` | Cuenta para la cuota al volver a `ACTIVE` → re-verifica cupo (FR-009) |

## Aceptación de invitación — ruta pública

| Ruta | Método | Contrato |
|---|---|---|
| `/invite?token=<token>` | GET (RSC) | Verifica hash + vigencia. Token inválido/caducado/usado → estado de error en español con aviso de pedir reenvío (edge «Invitación caducada»). Vigente → formulario de activación |
| `acceptInvitationAction` | Server Action | Entrada `{ token, name, password, confirm }` (política de contraseña del registro). Efecto: fija nombre + hash bcrypt, `status → ACTIVE`, marca `usedAt`. Salida: redirección a `/login` con aviso de éxito (FR-003) |

## Equipos — `src/app/(main)/dashboard/teams/actions.ts`

Gestión: `ADMIN`, `MANAGER` (y `MANGO`). Lectura: todos los roles.

| Action | Entrada (Zod) | Salida | Reglas |
|---|---|---|---|
| `createTeamAction` | `{ name, description?, memberIds? }` | `{ team }` | Nombre obligatorio; miembros del tenant (FR-012, FR-013) |
| `updateTeamAction` | `{ teamId, name, description? }` | `{ team }` | FR-012 |
| `setTeamMembersAction` | `{ teamId, memberIds }` | `{ ok }` | Reemplaza composición (`set`); valida pertenencia al tenant (FR-013) |
| `deleteTeamAction` | `{ teamId }` | `{ ok, deletedNotes }` | La confirmación previa muestra el conteo de notas (la action de lectura del diálogo lo aporta); borra equipo + notas por cascada (FR-015) |

Lecturas RSC (sin action): listado con `_count.members` en `teams/page.tsx`; detalle con
miembros y notas en `teams/[teamId]/page.tsx`.

## Notas — `src/app/(main)/dashboard/notes/actions.ts`

Crear: todo rol salvo `VIEWER`. Editar/eliminar: autor o `ADMIN`/`MANAGER`. Leer: todos.

| Action | Entrada (Zod) | Salida | Reglas |
|---|---|---|---|
| `createNoteAction` | Unión discriminada por `scope`: `{ scope: "GLOBAL", title, content }` \| `{ scope: "PROJECT", projectId, ... }` \| `{ scope: "TASK", taskId, ... }` \| `{ scope: "TEAM", teamId, ... }` | `{ note }` | XOR validado en Zod; referencia existente y del tenant re-verificada (FR-016, FR-017); autor = sesión (FR-018) |
| `updateNoteAction` | `{ noteId, title, content }` (el alcance no se reasigna) | `{ note }` | Permisos autor/ADMIN/MANAGER (FR-019); actualiza `updatedAt` (FR-018) |
| `deleteNoteAction` | `{ noteId }` | `{ ok }` | Mismos permisos (FR-019) |
| `searchNotesAction` | `{ q?, scope?, page? }` | `{ notes, total, page }` | Para islas cliente (widget/diálogos); misma consulta paginada del listado RSC (FR-021) |

Lecturas RSC (sin action): listado central con `searchParams` en `notes/page.tsx` (FR-021);
notas por contexto en detalle de proyecto/equipo y en el Sheet de tarea (FR-022); 4 recientes
en `dashboard/page.tsx` para el widget (FR-024).

Decisión de contrato: `updateNoteAction` no permite cambiar el alcance de una nota existente —
mover una nota de contexto equivale a crearla donde corresponde; mantiene el XOR trivialmente
cierto en actualizaciones.

## Panel

| Pieza | Contrato |
|---|---|
| Widget «Notas recientes» | RSC: `dashboard/page.tsx` pasa `RecentNoteView[]` (título, fecha relativa, enlace al contexto) a `recent-notes-card.tsx`; vacío → estado con CTA «crear la primera nota»; «Ver todas» → `/dashboard/notes` (FR-024) |
| Acción rápida «Nueva nota» | `quick-actions.tsx` abre `note-form-dialog.tsx` (alcance por defecto: GLOBAL); al guardar → toast Sonner + nota visible en el widget (FR-025, SC-005). Los demás botones no cambian en esta fase |

## Guardas transversales (sin contrato de UI)

| Pieza | Contrato |
|---|---|
| `authorize` (`src/lib/auth.ts`) | Credenciales de usuario con `status ≠ ACTIVE` → rechazo con mensaje genérico (no revela el estado) |
| `getTenantDb()` / `getAdminDb()` | Verifican `status = ACTIVE` del usuario de la sesión antes de devolver el cliente; si no → error de autenticación (revocación efectiva, FR-007/SC-003) |
| Layout del dashboard | Usuario no activo o inexistente → `redirect("/login")` |
| Cuota `users` (`plans/gating.ts`) | `count(status ∈ {ACTIVE, INVITED})` contra `plan.maxUsers`; `null` = ilimitado (FR-009) |
