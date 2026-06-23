# Contrato — Sesión, JWT y resolución de tenant

**Módulos**: `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/types/next-auth.d.ts`,
`src/lib/tenant-context.ts`. Cubre FR-005, FR-014, FR-016, FR-017.

## Forma de la sesión

```ts
interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "ADMIN" | "MANGO" | "MANAGER" | "MEMBER" | "VIEWER";
  tenantId: string | null; // null para MANGO
}
```

El JWT transporta `id`, `role` y `tenantId`. El middleware edge (`src/proxy.ts`) solo **lee** el
token (sin DB).

## Flujo

1. `authorize()` (instancia completa, con DB) valida credenciales y devuelve
   `{ id, name, email, image, role, tenantId }`.
2. Callback `jwt`: en el primer login copia `role` y `tenantId` al token.
3. Callback `session`: expone `role` y `tenantId` en `session.user`.

## Resolución del tenant de contexto (`tenant-context.ts`)

```ts
// Devuelve el contexto efectivo para el acceso a datos.
export async function getTenantContext(): Promise<{
  role: SessionUser["role"];
  // tenant efectivo: el de la sesión (admin) o el seleccionado por cookie (mango)
  tenantId: string | null;
}>;
```

- `ADMIN`: `tenantId` = el de la sesión (inmutable durante la sesión).
- `MANGO`: `tenantId` = valor de la cookie `mango_active_tenant` (o `null` si no ha seleccionado).

## Reglas de autorización

- Una sesión sin `tenantId` y sin rol `MANGO` se trata como acceso inválido a datos de negocio
  (caso límite del spec).
- El acceso a rutas/datos/funciones se deniega por rol y por plan con independencia de la visibilidad
  en el menú (FR-017, FR-022).
- La manipulación del `tenantId` en la petición se ignora; el efectivo proviene del contexto (FR-003).

## Pruebas asociadas

- Token incluye `tenantId`+`role` tras login (mock de `authorize`).
- `getTenantContext` para mango sin cookie ⇒ `tenantId: null`.
