# Data Model: Protección de auth global y landing pública

**Fecha**: 2026-06-22 · **Feature**: 001-auth-guard-landing

Esta feature **no introduce entidades persistentes nuevas** ni migraciones de Prisma. Reutiliza
la sesión existente de NextAuth. Los "modelos" relevantes son conceptuales (estado de sesión y
clasificación de rutas) y datos de presentación estáticos (contenido de la landing).

## 1. Estado de sesión (conceptual, no persistente)

Derivado de NextAuth (`req.auth` en el middleware / `auth()` en servidor).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `isLoggedIn` | boolean | `true` si existe una sesión JWT válida. |
| `user.id` | string | Identificador del usuario (ya presente en el JWT actual). |

No se modifica el esquema Prisma ni el flujo de autenticación. Solo se **lee** el estado.

## 2. Clasificación de rutas (regla de dominio del middleware)

| Categoría | Patrón | Comportamiento sin sesión | Comportamiento con sesión |
|-----------|--------|---------------------------|---------------------------|
| Pública raíz | `/` | Mostrar landing | Redirigir a `/dashboard/default` |
| Pública auth | `/auth/*` | Permitir | Redirigir a `/dashboard/default` |
| API auth | `/api/auth/*` | Permitir (excluida del matcher) | Permitir |
| Assets/Next | `_next/*`, `*.ext`, `favicon.ico` | Permitir (excluida del matcher) | Permitir |
| Protegida | cualquier otra (`/dashboard/*`, `/chat`, `/mail`, …) | Redirigir a `/` | Permitir |

**Invariantes**:
- El destino de redirección de no-autenticados (`/`) es público → sin bucle.
- El destino de redirección de autenticados (`/dashboard/default`) es protegido pero el usuario
  tiene sesión → sin bucle.

## 3. Contenido de presentación de la landing (estático)

Datos estáticos definidos en el código (no persistencia). Se documentan para fijar el contenido.

### 3.1 Característica (`Feature`)

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `icon` | icono lucide | `KanbanSquare` |
| `title` | string | "Kanban" |
| `description` | string | "Tableros con drag & drop, swimlanes y filtros." |

Conjunto mínimo (FR-010): Kanban, Gantt, Calendario, Dashboard ejecutivo, Gestión documental,
Bitácora/Auditoría, Recordatorios.

### 3.2 Plan (`Plan`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | "Gratuito" · "Pro" · "Pro+" |
| `priceMonthly` | number (COP) | 0 · 30000 · 50000 |
| `priceAnnual` | number (COP) | precio anual con descuento (informativo) |
| `features` | string[] | Lista de capacidades incluidas |
| `highlighted` | boolean | `true` para "Pro" |
| `cta` | string | Texto del botón (p. ej. "Empezar gratis") |

El conmutador mensual/anual (FR-013) alterna entre `priceMonthly` y `priceAnnual` en el cliente.
Se menciona el pago vía Wompi (informativo, FR-012).

### 3.3 Rol (`Role`) — sección multitenant

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | `admin` · `mango` |
| `description` | string | Alcance del rol (organización vs global) |

## Notas

- Ningún dato de esta feature requiere validación de servidor ni acceso a base de datos.
- Los precios y la mención a Wompi son informativos en la landing; el cobro real pertenece a la
  Fase 9 del roadmap y queda fuera de alcance.
