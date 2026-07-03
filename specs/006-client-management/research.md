# Research — Gestión de Clientes (FASE 3)

Decisiones técnicas de la fase. No quedaban `NEEDS CLARIFICATION` en el Technical Context; las
dudas de producto se resolvieron en la sesión de clarificación del spec (2026-07-03).

## 1. Relación Cliente ↔ Etiqueta: M:N implícita de Prisma

- **Decision**: añadir una relación M:N **implícita** entre `Client` y `Tag`
  (`tags Tag[]` en `Client`, `clients Client[]` en `Tag`), igual que la relación
  `Project ↔ Tag` existente.
- **Rationale**: es exactamente el patrón ya usado por proyectos (consistencia); Prisma genera y
  gestiona la tabla de unión sin modelo propio; no necesitamos atributos en la relación (fecha,
  autor). Ambos extremos están en `SCOPED_MODELS`, por lo que el aislamiento por tenant se
  conserva accediendo siempre desde los extremos escopados.
- **Alternatives considered**: tabla de unión explícita (`ClientTag`) — rechazada: solo aporta
  valor si la relación lleva atributos, y obligaría a añadirla a `SCOPED_MODELS` y a las pruebas
  de aislamiento; catálogo de etiquetas separado para clientes — descartado en clarificación
  (catálogo único por tenant).

## 2. Búsqueda insensible a mayúsculas y acentos: colación de la base de datos

- **Decision**: apoyarse en la colación `utf8mb4` accent/case-insensitive (`*_ai_ci` /
  `unicode_ci`) vigente en MySQL/MariaDB: `contains` de Prisma ya encuentra «Pérez» con «perez».
  Sin normalización manual ni columnas espejo.
- **Rationale**: cero código y cero deuda; es el mismo comportamiento del buscador de proyectos
  de la FASE 2. El edge case del spec se fija con una prueba de integración que inserta nombres
  acentuados y busca sin acentos.
- **Alternatives considered**: normalizar términos en la app (quitar diacríticos y comparar
  contra columna normalizada) — rechazada: duplica datos y migraciones para un problema que la
  colación ya resuelve; búsqueda full-text — innecesaria a esta escala (≤ 1.000 clientes).

## 3. «Última actividad»: agregación en lectura, sin denormalizar

- **Decision**: calcularla en la consulta de detalle como
  `max(client.updatedAt, _max(project.updatedAt) de sus proyectos)` usando `aggregate`/`_max`.
- **Rationale**: el spec la define exactamente así (cambio más reciente entre el cliente y sus
  proyectos) y solo se muestra en el detalle: una agregación por vista es barata y siempre
  exacta. Evita un campo `lastActivityAt` que habría que mantener desde las mutaciones de
  proyectos (FASE 2), acoplando fases.
- **Alternatives considered**: campo denormalizado actualizado por triggers/mutaciones —
  rechazado: complejidad y riesgo de desincronización sin necesidad de rendimiento; registro de
  auditoría — fuera de alcance según Assumptions del spec.

## 4. Creación al vuelo: subdiálogo dentro del formulario de proyecto

- **Decision**: el selector de cliente de `project-form-dialog.tsx` gana una opción
  «Crear cliente…» que abre un subdiálogo (mismo árbol React). Al confirmar, una Server Action
  crea el cliente (reutilizando `createClient` de `src/lib/clients/mutations.ts`) y devuelve
  `{ id, name }`; el subdiálogo se cierra, la opción se añade a la lista local y queda
  seleccionada. El formulario del proyecto nunca se desmonta, así que el estado RHF se conserva
  (FR-013, SC-004).
- **Rationale**: cumple el requisito de no perder datos sin persistencia intermedia ni borradores;
  reutiliza la misma mutación y validación que el CRUD (una sola fuente de verdad).
- **Alternatives considered**: navegar a `/dashboard/clients` con retorno — rechazada: pierde el
  estado del formulario o exige borradores; crear cliente «fantasma» al teclear en el selector —
  rechazada: crea registros basura sin confirmación explícita.

## 5. Permisos: módulo propio `authz-clients.ts`

- **Decision**: crear `src/lib/authz-clients.ts` con `canManageClients(role)`
  (`ADMIN` | `MANAGER` | `MANGO`) siguiendo el patrón de `authz-projects.ts`. Lectura permitida a
  todos los roles del tenant. La fuente de verdad se aplica en `mutations.ts`; la UI solo oculta
  acciones.
- **Rationale**: la clarificación fija ADMIN+MANAGER como gestores; un módulo puro y separado se
  prueba con una matriz unit igual que en FASE 2 y evita acoplar la semántica de clientes a la de
  proyectos (que tiene reglas extra para MEMBER).
- **Alternatives considered**: reutilizar `canManageProjects` — rechazada: acopla dos políticas
  que hoy coinciden pero pueden divergir, y el nombre mentiría en los tests.

## 6. Filtro «con proyectos activos»: estados no finales

- **Decision**: «activo» = `status ∉ { COMPLETED, ARCHIVED }` (el enum `ProjectStatus` no tiene
  `CANCELLED`; sus valores son PENDING, IN_PROGRESS, IN_REVIEW, COMPLETED, ARCHIVED). El filtro
  se aplica en la propia consulta paginada con `projects: { some: { status: { notIn: [...] } } }`.
- **Rationale**: traduce la definición del spec («estado no final») a los estados reales de la
  FASE 2; una sola consulta mantiene la paginación correcta.
- **Alternatives considered**: filtrar en memoria tras paginar — rechazada: rompe conteos y
  paginación.

## 7. Planes: sin cambios en `src/lib/plans/`

- **Decision**: no se toca el gating de planes; no hay cuota de clientes (clarificación) ni
  feature flag nuevo.
- **Rationale**: decisión de negocio explícita; menos superficie de cambio.
- **Alternatives considered**: reservar un slot de cuota «por si acaso» — rechazada: YAGNI; el
  mecanismo existente permite añadirla después sin migración.
