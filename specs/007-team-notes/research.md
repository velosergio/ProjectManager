# Research — Equipo de trabajo y Notas (FASE 4)

**Fecha**: 2026-07-03 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Sin `NEEDS CLARIFICATION` pendientes en el Technical Context; este documento registra las
decisiones de diseño con sus alternativas.

## D1 — Representación del miembro invitado

**Decision**: la invitación crea la fila `User` de inmediato (con `status: INVITED`, `password:
null`, rol y `tenantId` asignados) más un `InvitationToken` espejo de `PasswordResetToken`
(`tokenHash` único, `expiresAt` a 7 días, `usedAt`). Aceptar la invitación fija nombre y hash de
contraseña y transiciona a `ACTIVE`. Se añade el valor `INVITED` al enum `UserStatus` existente
(`SUSPENDED` queda reservado, sin uso en esta fase).

**Rationale**: la unicidad de email queda garantizada por el índice único ya existente en
`users.email`; el conteo de cuota (activos + invitados, Clarifications) es un simple `count`
sobre `User`; el listado de miembros muestra invitados sin unir dos entidades; y el flujo de
aceptación reutiliza el patrón probado de tokens de restablecimiento (hash en BD, un solo uso).

**Alternatives considered**: (a) entidad `Invitation` independiente sin fila `User` — obliga a
duplicar la validación de unicidad de email, complica el conteo de cuota y el listado; (b)
reutilizar `PasswordResetToken` con un campo de tipo — mezcla ciclos de vida distintos y rompe
la semántica de sus consultas existentes.

## D2 — Modelo de equipos y membresía

**Decision**: modelo `Team` (`tenantId`, `name`, `description?`) con relación M:N **implícita**
`Team ↔ User` (campo `members`). `Team` entra en `SCOPED_MODELS`.

**Rationale**: la membresía no necesita atributos propios (sin rol por equipo ni fechas en el
alcance de esta fase); la M:N implícita evita un modelo extra, y Prisma gestiona la tabla de
unión. Es el mismo criterio aplicado a `Client ↔ Tag` en la FASE 3.

**Alternatives considered**: tabla de unión explícita `TeamMember` — solo aporta valor si la
membresía gana atributos (p. ej. rol dentro del equipo); se puede migrar a explícita más
adelante sin pérdida.

## D3 — Modelo de nota y exclusión mutua del alcance

**Decision**: modelo `Note` con enum `NoteScope` (`GLOBAL | PROJECT | TASK | TEAM`), tres FKs
nullable (`projectId`, `taskId`, `teamId`) con `onDelete: Cascade`, y `authorId` con `onDelete:
SetNull`. La invariante «exactamente la referencia que corresponde al alcance» se aplica en dos
capas: unión discriminada de Zod en `notes/schemas.ts` (rechaza combinaciones inválidas en el
borde) y re-verificación en `notes/mutations.ts` (la referencia existe y pertenece al tenant),
cubierta con pruebas de integración.

**Rationale**: MySQL/MariaDB vía Prisma no ofrece constraints CHECK portables; la validación en
la capa de negocio es el patrón del repo y es testeable (Principio II). `Cascade` implementa
FR-023 (las notas mueren con su contexto) directamente en la BD, lo que cubre también borrados
hechos por otras rutas. `SetNull` en autor preserva las notas si el usuario se elimina
(la desactivación ni siquiera toca la fila).

**Alternatives considered**: (a) tabla polimórfica (`refType` + `refId` sin FK) — pierde
integridad referencial y las cascadas; (b) una tabla de nota por alcance — cuadruplica CRUD,
listado central y widget; (c) trigger SQL para el XOR — invisible para Prisma y frágil en
migraciones.

## D4 — Cuota de usuarios: activos + invitados

**Decision**: `assertWithinQuota(..., "users")` pasa a contar `User` con
`status: { in: [ACTIVE, INVITED] }` (hoy cuenta todos los del tenant). La invitación corre en
una transacción serializable (comprobación + creación), reutilizando el patrón de
`createProjectWithQuota`.

**Rationale**: implementa literalmente la clarificación (invitados consumen cupo; inactivos y
cancelaciones lo liberan) y cierra la carrera de dos invitaciones simultáneas en el límite.

**Alternatives considered**: validar cupo al aceptar la invitación — permite sobre-invitar y
produce rechazos tardíos con peor UX (descartado en Clarifications).

## D5 — Revocación de acceso en la siguiente interacción

**Decision**: triple guarda con un único lookup por PK: (1) `authorize` en `src/lib/auth.ts`
rechaza credenciales de usuarios con `status ≠ ACTIVE` (mensaje genérico, sin filtrar el
estado); (2) `getTenantDb()`/`getAdminDb()` verifican el estado del usuario de la sesión antes
de devolver el cliente — cubre toda Server Action y toda lectura de negocio; (3) el layout del
dashboard redirige a `/login` si el usuario ya no está activo — cubre la navegación.

**Rationale**: con estrategia JWT no hay sesión en BD que borrar y el middleware/proxy no puede
importar Prisma (restricción edge documentada en CLAUDE.md). Poner la verificación en la puerta
de datos garantiza SC-003 («0 acciones efectivas tras la revocación») sin tocar cada action; el
coste es un `findUnique` por PK por request, aceptable (Principio IV).

**Alternatives considered**: (a) comprobar solo en el callback `jwt` — el token puede seguir
siendo válido para actions ya en vuelo y añade latencia a *todas* las rutas, incluidas las
públicas; (b) sesiones en BD (adapter database) — cambio estructural de NextAuth fuera del
alcance; (c) lista de revocación en Redis — infraestructura extra sin necesidad a esta escala.

## D6 — Adopción de TanStack Query (convención transversal)

**Decision**: crear `src/components/providers/query-provider.tsx` (client, `QueryClient` en
`useState`) y montarlo en el layout del dashboard. Convención: las **lecturas de primer render**
siguen siendo RSC (listados, detalles, widget); las **islas cliente interactivas** (pestaña de
miembros del modal de ajustes, refrescos tras mutación) usan `useQuery`/`useMutation` invocando
Server Actions delgadas. Query keys con scoping por tenant: `[tenantId, dominio, ...filtros]`
(p. ej. `[tenantId, "members"]`, `[tenantId, "notes", { scope, q }]`). Toda mutación invalida
las keys de su dominio además del `revalidatePath` para las rutas RSC.

**Rationale**: cumple la convención del ROADMAP («fetching y mutación en componentes cliente con
TanStack Query, keys por tenant, invalidación tras mutación») sin renunciar al RSC-first que
exige la constitución (Principio IV). El modal de ajustes es client-side puro, por lo que la
pestaña de miembros es el caso canónico de la convención. La librería ya está en
`package.json` (v5): no hay dependencia nueva.

**Alternatives considered**: (a) route handlers REST para las queries cliente — más superficie
(validación/authz duplicada) sin beneficio frente a Server Actions tipadas; (b) migrar también
las lecturas RSC a client-side — contradice el Principio IV y el patrón de FASES 2–3.

## D7 — Notas de tarea sin página de detalle de tarea

**Decision**: las tareas no tienen (ni ganan) página propia: la acción «Notas» en cada fila de
`task-list.tsx` abre un `Sheet` lateral (`task-notes-sheet.tsx`) con las notas de la tarea y su
formulario de creación en contexto.

**Rationale**: cumple FR-022 («vista detalle de tarea») sin inventar una ruta que la FASE 2 no
definió; el Sheet es un patrón shadcn ya disponible y mantiene al usuario en el proyecto.

**Alternatives considered**: crear `/dashboard/projects/[projectId]/tasks/[taskId]` — alcance de
navegación nuevo que ninguna otra parte del producto exige aún (Kanban/Gantt podrán decidirlo).

## D8 — Entrega del enlace de invitación

**Decision**: al invitar (o reenviar), la Server Action envía el correo vía `sendMail()` y
**siempre** devuelve la URL de invitación a la UI, que la muestra con acción de copiar.
`sendMail` ya degrada a `console.info` cuando `SMTP_HOST` no está configurado.

**Rationale**: implementa el fallback aclarado en la spec sin ramificar por configuración: el
administrador siempre puede compartir el enlace manualmente. El token viaja en la URL
(`/invite?token=…`) y en BD solo se guarda su hash (mismo estándar que el reset de contraseña).

**Alternatives considered**: mostrar la URL solo si falta SMTP — introduce dos flujos de UI y el
administrador pierde el enlace si el correo rebota.

## D9 — Ubicación de la gestión de miembros

**Decision**: pestaña «Miembros» nueva en el modal de ajustes existente
(`settings-dialog.tsx`), visible solo para `ADMIN` (el shell recibe el rol; la pestaña se
omite para el resto). El contenido (`members-settings.tsx`) lista miembros con estado, rol y
carga, y ofrece invitar/reenviar/cancelar/cambiar rol/desactivar/reactivar.

**Rationale**: decisión tomada en Clarifications. El modal ya tiene pestañas verticales con
patrón establecido (spec 003); añadir una pestaña es el cambio mínimo coherente.

**Alternatives considered**: sección del sidebar — descartada por el usuario en la sesión de
clarificación.

## D10 — Navegación de equipos y notas

**Decision**: dos items nuevos en el grupo «Dashboards» del sidebar: «Equipos» →
`/dashboard/teams` y «Notas» → `/dashboard/notes`, sin restricción de rol ni de plan (todos los
roles consultan; las acciones de gestión se gatean en la UI y en el servidor).

**Rationale**: decisión de Clarifications (secciones dedicadas al estilo Proyectos/Clientes).
El sidebar ya soporta `requiredRole`/`requiredFeature` si más adelante se gatea por plan.

**Alternatives considered**: agrupar bajo un item padre «Equipo de trabajo» con subitems — más
profundidad de navegación para solo dos destinos.

## D11 — Protección del último administrador

**Decision**: `members/mutations.ts` ejecuta cambio de rol y desactivación dentro de una
transacción que cuenta los `ADMIN` con `status: ACTIVE` del tenant y aborta (error de dominio
`LastAdminError`) si la operación dejaría cero. El cambio del propio rol se rechaza siempre.

**Rationale**: FR-006/FR-008 y el edge case correspondiente; la transacción evita la carrera de
dos degradaciones simultáneas.

**Alternatives considered**: validación solo en UI — insuficiente frente a peticiones directas
(SC-008 exige rechazo en servidor).

## D12 — Carga de trabajo por miembro

**Decision**: `members/queries.ts` calcula en dos `groupBy` los conteos por usuario: tareas con
`status ≠ DONE` agrupadas por `assigneeId` y proyectos con `status ∉ {COMPLETED, ARCHIVED}`
agrupados por `ownerId`; se fusionan en memoria con el listado de miembros.

**Rationale**: dos consultas agregadas fijas (sin N+1) que además dejan la base de datos lista
para el widget «Carga por usuario» de la FASE 7.

**Alternatives considered**: `_count` por relación en el `findMany` de usuarios — no permite
filtrar por estado de la tarea/proyecto en Prisma sin subconsultas por fila.

## D13 — Búsqueda y paginación del listado central de notas

**Decision**: mismo patrón que clientes (FASE 3): página RSC que lee `searchParams`
(`q`, `scope`, `page`), consulta paginada en servidor con `contains` sobre título y contenido
(la colación `*_ai_ci` de MySQL/MariaDB ya da insensibilidad a acentos/mayúsculas) y filtros
como isla cliente que actualiza la URL.

**Rationale**: cumple SC-006 (< 1 s con 1.000 notas) con índices por `tenantId` y paginación en
servidor; URLs enlazables y consistencia con el resto del producto.

**Alternatives considered**: búsqueda full-text de MySQL — innecesaria a esta escala y con
soporte limitado en Prisma para MariaDB.
