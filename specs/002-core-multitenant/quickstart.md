# Quickstart — Validación del core multitenant

**Feature**: `002-core-multitenant` · **Fecha**: 2026-06-22

Guía para validar de extremo a extremo que la FASE 1 cumple su spec. Referencia los contratos en
[`contracts/`](./contracts/) y el [`data-model.md`](./data-model.md); no duplica implementación.

## Prerrequisitos

- MariaDB/MySQL accesible y `DATABASE_URL` en `.env.local` (ver `.env.example`).
- `NEXTAUTH_SECRET`/`NEXTAUTH_URL` definidos. SMTP opcional (sin él, el enlace de reset se imprime en
  consola).
- Dependencias instaladas (`npm install`), incluidas las nuevas (`@clack/prompts`, `nodemailer`,
  `vitest`).

## Puesta en marcha

```bash
npm run db:migrate     # aplica la migración del core multitenant
npm run db:seed        # siembra los 3 planes (Gratuito/Pro/Pro+)
npm run dev            # arranca la app
```

## Escenarios de validación

### 1. Alta de organización en autoservicio (US2 · SC-003/SC-004)

1. Abrir `/auth/v1/register`, indicar organización, nombre, email y contraseña válidos.
2. **Esperado**: se crean `Tenant` + `User(ADMIN)` + `Subscription(GRATUITO, ACTIVE)` (verificable en
   `npm run db:studio`); el usuario queda autenticado en su espacio vacío.
3. Repetir con el mismo email ⇒ rechazo `409` sin duplicar.

### 2. Aislamiento entre organizaciones (US1 · SC-001/SC-002)

1. Crear dos organizaciones (A y B) y algún proyecto/cliente en cada una.
2. Autenticado como A, listar proyectos ⇒ **solo** los de A.
3. Tomar el `id` de un proyecto de B y abrir su ruta directa ⇒ **no encontrado** (sin revelar datos).
4. Verificación automatizada: `npm run test` ejecuta la prueba de aislamiento del contrato
   [tenant-data-access](./contracts/tenant-data-access.md) (I1–I4).

### 3. Acceso global del rol `mango` (US3 · SC-007)

1. Crear el super usuario: `npm run mango` (ver escenario 5).
2. Iniciar sesión como `mango` y abrir `/dashboard/mango`.
3. Seleccionar un tenant ⇒ se ven sus datos; sin selección ⇒ se ve el listado de organizaciones.
4. Iniciar sesión como `admin` e intentar abrir `/dashboard/mango` ⇒ **acceso denegado**.

### 4. Límites de plan y gating (US5 · SC-005)

1. Con una organización en plan Gratuito, crear proyectos hasta alcanzar `maxProjects`.
2. Crear uno más ⇒ bloqueo con mensaje de límite y vía de ampliación (`QuotaExceededError` → 409).
3. Cambiar la organización a Pro/Pro+ ⇒ el límite se actualiza y permite crear.
4. Bajar de nuevo a Gratuito con uso por encima de la cuota ⇒ datos intactos; nuevas creaciones
   bloqueadas hasta volver bajo el límite (FR-011a).

### 5. Comando `npm run mango` (US4 · SC-006)

1. Ejecutar `npm run mango`, completar nombre/email/contraseña/confirmación.
2. **Esperado**: "Usuario mango creado: <email>"; en DB, `role=MANGO`, `tenantId=null`, password
   hasheada.
3. Reejecutar con el mismo email ⇒ aviso "Ya existe…" y salida sin duplicar.

### 6. Recuperación de contraseña (US6 · SC-008)

1. En `/auth/v1/forgot`, solicitar reset con un email registrado ⇒ respuesta neutra; el enlace llega
   por correo o aparece en consola (dev).
2. Abrir el enlace `/auth/v1/reset?token=…`, fijar nueva contraseña ⇒ login con la nueva funciona.
3. Reusar el mismo enlace ⇒ rechazado. Solicitar con email inexistente ⇒ respuesta idéntica (neutra).

### 7. Navegación adaptada a rol y plan (US7 · SC-009)

1. Como `admin`, el sidebar muestra solo lo permitido; el indicador refleja el plan vigente; hay
   acceso a perfil.
2. Como `mango`, aparece adicionalmente la consola exclusiva.
3. Acceso directo a una ruta no incluida en el plan ⇒ denegado aunque no figure en el menú.

## Puertas de calidad (antes de fusionar)

```bash
npm run check          # Biome al 100 %
npm run doctor         # React Doctor sin diagnósticos
npm run build          # TypeScript + build sin errores
npm run test           # Vitest: scoping, gating, bypass mango, tokens, aislamiento
```

Todas deben pasar sin trampas (constitución, Principios I, II, IV).
