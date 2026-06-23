# Contrato — Gating de cuotas y features por plan

**Módulos**: `src/lib/plans/definitions.ts`, `src/lib/plans/gating.ts`. Cubre FR-009 a FR-012, FR-011a.

## Definición de features (config tipada)

```ts
export type PlanFeature = "kanban" | "gantt" | "calendar" | "executiveDashboard" | "audit";

// Parametrizable en configuración, keyed por PlanCode.
export const PLAN_FEATURES: Record<PlanCode, Record<PlanFeature, boolean>>;
```

Las **cuotas numéricas** (`maxProjects`, `maxUsers`, `maxStorageBytes`) NO viven aquí: están en la
tabla `Plan` (nullable = ilimitado) para ajustarse sin tocar código (FR-010).

## API de gating

```ts
// Lanza FeatureNotInPlanError si el plan vigente no incluye la feature.
export function assertFeature(planCode: PlanCode, feature: PlanFeature): void;

// Comprueba la cuota del recurso para el tenant antes de crear/añadir.
// Lanza QuotaExceededError con { resource, limit, current } si se superaría.
export async function assertWithinQuota(
  db: PrismaClient,
  tenantId: string,
  resource: "projects" | "users" | "storage",
  delta?: number, // p. ej. bytes a subir; default 1
): Promise<void>;
```

## Semántica

- `null` en una cuota ⇒ recurso ilimitado (nunca lanza).
- `projects`/`users`: compara `count` actual + `delta` con el límite.
- `storage`: compara `SUM(sizeBytes)` actual + `delta` (bytes) con `maxStorageBytes`.
- **Descenso de plan (FR-011a)**: si el uso ya supera la cuota destino, las creaciones nuevas fallan
  con `QuotaExceededError` hasta que el uso baje; los datos existentes se conservan.

## Aplicación

- **Backend**: las server actions / rutas que crean recursos llaman a `assertWithinQuota` /
  `assertFeature` antes de persistir. La verificación es la barrera real.
- **UI**: refleja el estado (botones deshabilitados, avisos con Sonner indicando límite y vía de
  ampliación), pero **no** es la única barrera (FR-022).

## Errores → respuesta

| Error | HTTP (en rutas) | Mensaje al usuario |
|---|---|---|
| `QuotaExceededError` | 409 | "Has alcanzado el límite de tu plan (X). Amplía tu plan para continuar." |
| `FeatureNotInPlanError` | 403 | "Esta función requiere un plan superior." |

## Pruebas asociadas

- Cuota alcanzada ⇒ `assertWithinQuota` lanza (SC-005).
- Cuota `null` ⇒ nunca lanza.
- Feature ausente ⇒ `assertFeature` lanza; presente ⇒ no lanza.
- Concurrencia: dos creaciones simultáneas no superan la cuota (caso límite).
