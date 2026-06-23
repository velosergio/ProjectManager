# Research — Core del sistema y arquitectura multitenant

**Feature**: `002-core-multitenant` · **Fecha**: 2026-06-22

Este documento resuelve las incógnitas técnicas previas al diseño. Cada apartado sigue el formato
Decisión / Justificación / Alternativas consideradas.

## 1. Enforcement del scoping por `tenantId` en Prisma 7

**Decisión**: Usar **Prisma Client Extensions** (`$extends`, componente `query`) en lugar del antiguo
middleware `$use`. El scoping se aplica mediante un **cliente escopado por request** producido por una
factoría `getTenantDb()`: lee el `tenantId` y el `role` de la sesión de NextAuth y devuelve
`basePrisma.$extends(tenantScoping(tenantId, role))`. La extensión, para los modelos de negocio
incluidos en una lista explícita (`Client`, `Project`, `Process`, `Task`, `FileAsset`, `Event`,
`Subscription`):

- En lecturas (`findMany`, `findFirst`, `count`, `aggregate`, `updateMany`, `deleteMany`, etc.)
  inyecta `where: { tenantId, ...wherePrevio }`.
- En `findUnique`/`findUniqueOrThrow` los reescribe a `findFirst` para poder forzar el `tenantId`.
- En escrituras (`create`, `createMany`) fija `data.tenantId` ignorando cualquier valor entrante.
- En `update`/`delete`/`upsert` añade el `tenantId` al `where`.

**Justificación**: En Prisma 5+ el middleware `$use` quedó obsoleto y **no existe en Prisma 7**; las
client extensions son el mecanismo soportado y type-safe. Un cliente escopado por request hace el
`tenantId` explícito y elimina estado global ambiguo. La factoría centraliza el filtrado de forma
que el código de feature **no puede** consultar sin scope si usa `getTenantDb()`.

**Alternativas consideradas**:
- `AsyncLocalStorage` + un único cliente extendido global que lee el contexto en cada query: evita
  pasar el cliente, pero la propagación de ALS a través de React Server Components y del streaming de
  Next.js es frágil y difícil de auditar. Rechazada por riesgo de fugas silenciosas.
- Filtrado manual en cada query: viola FR-002 (debe ser no omitible) y es propenso a olvidos.
- Row-Level Security en MariaDB: MariaDB no ofrece RLS equivalente a PostgreSQL; inviable.

## 2. Acceso global del rol `mango` (bypass controlado)

**Decisión**: La factoría expone dos entradas:
- `getTenantDb()` — cliente escopado al `tenantId` de la sesión (para `admin`). Para un `mango` con un
  tenant **seleccionado** (cookie `mango_active_tenant`), escopa a ese tenant.
- `getAdminDb()` — cliente **sin** extensión de scoping, que **asevera** `role === "MANGO"` y lanza si
  no lo es. Es la única vía de acceso transversal y queda restringida a la consola de `mango`.

**Justificación**: Cumple FR-006 (bypass solo por mecanismos previstos) y el caso límite de "mango sin
tenant seleccionado": las operaciones escopadas exigen selección previa; las globales pasan por
`getAdminDb()` con verificación de rol. Mantiene un único punto donde se cruza la frontera de tenant.

**Alternativas consideradas**: un flag booleano `bypass` en `getTenantDb()` — rechazado por ser fácil
de pasar por error desde código de feature; preferimos una función separada y explícita.

## 3. Propagación de `tenantId` y `role` en la sesión (NextAuth v5, JWT)

**Decisión**: 
- `authorize()` (en `auth.ts`, instancia completa con DB) devuelve además `tenantId` y `role` del
  usuario.
- El callback `jwt` (en `auth.config.ts`) copia `tenantId` y `role` al token la primera vez.
- El callback `session` los expone en `session.user`.
- Se añade augmentación de tipos en `src/types/next-auth.d.ts` para `Session`, `User` y `JWT`.

**Justificación**: El middleware corre en edge y solo lee el JWT (sin DB), por lo que `tenantId`/`role`
deben viajar en el token (FR-005, FR-016). Es coherente con el split edge-safe ya existente
(`auth.config.ts` vs `auth.ts`) introducido en la feature 001.

**Alternativas consideradas**: consultar la DB en cada request para el tenant — rechazado: rompe el
edge runtime del middleware y añade latencia (Principio IV).

**Nota de invalidación de sesión**: como el `tenantId` se fija al iniciar sesión, los usuarios `mango`
(que no tienen tenant fijo) usan la cookie de selección, no el token. Para `admin`, el tenant es
inmutable durante la sesión (un admin pertenece a un único tenant en esta fase).

## 4. Alta atómica de organización en el registro

**Decisión**: La ruta `POST /api/auth/register` se amplía para crear, en una **transacción**
(`prisma.$transaction`), el `Tenant`, el `User` (`role: ADMIN`, `tenantId`), y la `Subscription` al
plan `GRATUITO` con estado `ACTIVE`. Se mantiene la validación Zod y el hash bcrypt existentes y se
añade el campo `organizationName`. El correo sigue siendo único globalmente.

**Justificación**: Cumple FR-007/FR-008 y SC-003/SC-004. La transacción evita estados a medias
(tenant sin admin, o admin sin suscripción) ante fallos.

**Alternativas consideradas**: crear el tenant en un segundo paso post-registro — rechazado: deja
ventanas de estado inconsistente y complica el onboarding de 2 minutos (SC-003).

## 5. Planes, cuotas parametrizables y gating

**Decisión**:
- Modelo `Plan` en DB con `code` (`GRATUITO`/`PRO`/`PRO_PLUS`), precios (`priceMonthly`,
  `priceYearly`, en COP) y **cuotas como columnas nullable** (`maxProjects`, `maxUsers`,
  `maxStorageBytes`); `null` = ilimitado. Esto hace las cuotas parametrizables sin tocar código
  (FR-010); los valores concretos viven en el `seed` y son ajustables.
- **Features por plan**: mapa tipado en `src/lib/plans/definitions.ts` keyed por `code` (p. ej.
  `{ gantt: false, calendar: true }`), parametrizable en configuración.
- Helpers en `src/lib/plans/gating.ts`: `assertFeature(planCode, feature)` y
  `assertWithinQuota(db, tenantId, "projects")` (cuenta filas bajo el tenant antes de crear). El
  gating se aplica en backend (server actions / rutas) y la UI lo refleja.

**Justificación**: Cumple FR-009/FR-010/FR-011/FR-011a/FR-012. Separar cuotas numéricas (DB) de
features (config) permite ajustar negocio sin migraciones y mantener las features con tipado fuerte.

**Valores semilla propuestos (ajustables, no vinculantes)**: Gratuito `maxProjects=3`,
`maxStorageBytes=1 GiB`; Pro y Pro+ `null` (ilimitado) en proyectos/almacenamiento. `maxUsers=1` para
todos en esta fase (multi-usuario diferido, FR-015a). Los números finales se confirman en negocio.

**Descenso de plan (FR-011a)**: el cambio de plan no borra datos; `assertWithinQuota` bloquea nuevas
creaciones del recurso excedido hasta que el conteo vuelva por debajo de la cuota destino.

**Alternativas consideradas**: cuotas y features ambas en código — rechazado: FR-010 exige cuotas
parametrizables sin cambios de código. Cuotas en DB y features en DB (JSON) — viable, pero el JSON
pierde el tipado; preferimos features tipadas en config.

## 6. Comando CLI `npm run mango`

**Decisión**: Script `scripts/create-mango.ts` ejecutado con `tsx` sobre `tsconfig.scripts.json`,
con `npm run mango`. Prompts interactivos con **`@clack/prompts`** (nueva devDependency): solicita
nombre, email, contraseña y confirmación, con enmascarado de contraseña. Validación con **Zod**
(email válido, fuerza mínima de contraseña, coincidencia de confirmación). Comprueba unicidad del
email (idempotencia: avisa y aborta sin duplicar). Hash con `bcryptjs`. Crea `User` con `role: MANGO`
y `tenantId: null` vía el cliente base de Prisma (sin scoping).

**Justificación**: Cumple FR-019/FR-020. `@clack/prompts` ofrece enmascarado y validación inline con
buena DX; `tsx` ya es dependencia y `tsconfig.scripts.json` es el patrón del repo (usado por
`generate:presets`).

**Alternativas consideradas**: `readline/promises` nativo (sin dep) — rechazado: no enmascara la
contraseña con comodidad. `prompts`/`inquirer` — válidos, pero `@clack` es más ligero y moderno.

## 7. Recuperación de contraseña

**Decisión**: Modelo `PasswordResetToken` (token **hasheado** en DB, `expiresAt`, `usedAt`). Flujo:
`POST /api/auth/password/request` (genera token, responde **neutro** sin revelar existencia del email,
envía enlace), página `/auth/v1/forgot` y `/auth/v1/reset`, `POST /api/auth/password/reset` (valida
token vigente y no usado, fija nueva contraseña hasheada, marca `usedAt`). Envío de correo vía
`src/lib/mailer.ts` con SMTP (**`nodemailer`**, nueva dependency); en desarrollo, si no hay SMTP,
registra el enlace por consola. Rate-limit básico por email/IP.

**Justificación**: NextAuth Credentials no trae reset propio. Token de un solo uso con caducidad y
respuesta neutra cumplen FR-018, SC-008 y el caso límite de no revelar emails. SMTP opcional en dev ya
está contemplado en `.env.example`.

**Alternativas consideradas**: reutilizar `VerificationToken` de NextAuth — rechazado: mezcla
responsabilidades (verificación de email del adapter vs. reset) y complica caducidad/uso único. Magic
links de NextAuth — fuera del alcance (no se cambia la estrategia de auth).

## 8. Estados de suscripción

**Decisión**: Enum `SubscriptionStatus { ACTIVE, TRIALING, PAST_DUE, CANCELED }` ↔ `activa`,
`en_prueba`, `vencida`, `cancelada` (FR-013). En esta fase, las altas nacen `ACTIVE`; los demás
estados quedan modelados para la FASE 9 (pagos) sin lógica de transición automática todavía.

**Justificación**: Cubre el ciclo de vida pedido en la aclaración del 2026-06-22 sin acoplar la
pasarela. Mapear español↔enum mantiene identificadores en inglés (constitución, Principio V).

## 9. Marco de pruebas (Principio II)

**Decisión**: Adoptar **Vitest** (config nueva `vitest.config.ts`, script `test`). Cobertura mínima
de esta fase: pruebas unitarias de la extensión de scoping, del bypass de `mango`, de `gating`/cuotas
y de los tokens de reset; más **una prueba de aislamiento** que verifique que el Tenant A no lee datos
del Tenant B (SC-001/SC-007). Las pruebas que tocan DB usan una base de datos de prueba dedicada.

**Justificación**: La constitución exige pruebas para la lógica de negocio y no hay runner aún.
Vitest integra bien con TypeScript/ESM y el ecosistema Next/React del repo.

**Alternativas consideradas**: Jest — más pesado de configurar con ESM/TS; Node test runner —
ergonomía inferior para mocking. Vitest es el estándar actual del ecosistema.

## Dependencias nuevas (resumen)

| Paquete | Tipo | Motivo |
|---|---|---|
| `@clack/prompts` | dev | Formulario interactivo del CLI `mango` |
| `nodemailer` (+ `@types/nodemailer`) | prod/dev | Envío de correo de recuperación de contraseña |
| `vitest` | dev | Marco de pruebas (Principio II) |

Todas pasan por las puertas de calidad (Biome, build). No se relaja ninguna configuración.
