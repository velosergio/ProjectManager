# Quickstart — Validación de Gestión de Clientes (FASE 3)

Guía de validación manual y automática. Contratos en
[contracts/server-actions.md](./contracts/server-actions.md); esquema en
[data-model.md](./data-model.md).

## Prerrequisitos

1. MySQL/MariaDB corriendo y `.env.local` configurado (ver `.env.example`).
2. Dependencias y cliente Prisma al día, con la migración de esta fase aplicada:

   ```bash
   npm install
   npm run db:migrate    # aplica la migración client_tags
   npm run db:seed       # planes; crear usuarios/tenant de prueba si no existen
   npm run dev
   ```

3. Dos cuentas de prueba en el mismo tenant (una `ADMIN` o `MANAGER`, otra `MEMBER` o `VIEWER`)
   y una cuenta en un segundo tenant para el aislamiento.

## Pruebas automatizadas

```bash
npm run test          # Vitest: unit (schemas, authz) + integración (BD real)
npm run check         # Biome al 100 %
npm run doctor        # React Doctor sin diagnósticos
npm run build         # TypeScript + build sin errores
```

Suites nuevas esperadas: `tests/unit/client-schemas.test.ts`,
`tests/unit/authz-clients.test.ts`, `tests/integration/clients-crud.test.ts`,
`tests/integration/client-tags.test.ts`, `tests/integration/client-queries.test.ts`.

## Escenarios de validación manual

### 1. CRUD y permisos (US1, FR-001…FR-005)

1. Como `ADMIN`/`MANAGER`, ir a **Clientes** en el sidebar (`/dashboard/clients`).
2. Crear un cliente solo con nombre → aparece en el listado con confirmación (Sonner).
3. Intentar crear sin nombre o con email inválido → mensaje de validación en español, sin registro.
4. Editar el cliente (email/teléfono) → cambios visibles en listado y detalle.
5. Eliminar un cliente **con proyectos**: el diálogo advierte cuántos proyectos quedarán sin
   cliente; al confirmar, los proyectos siguen existiendo sin cliente (verificar en
   `/dashboard/projects`).
6. Repetir como `MEMBER`/`VIEWER`: el listado y el detalle son visibles, pero no hay acciones de
   crear/editar/eliminar.

### 2. Detalle y seguimiento (US2, FR-006…FR-008)

1. Con un cliente que tenga proyectos en ≥ 2 estados, abrir su detalle (URL propia
   `/dashboard/clients/<id>`).
2. Verificar: datos de contacto, etiquetas, conteo de proyectos por estado y última actividad
   (editar un proyecto del cliente y recargar → la fecha avanza).
3. Hacer clic en un proyecto del listado → navega a `/dashboard/projects/<id>`.
4. Abrir el detalle de un cliente sin proyectos → estado vacío claro.
5. Copiar la URL del detalle y abrirla autenticado en **otro tenant** → 404.

### 3. Búsqueda y filtros (US3, FR-009, FR-010, FR-015)

1. Buscar por fragmento de nombre, email y teléfono → solo coincidencias.
2. Buscar «Perez» debiendo existir «Pérez» → lo encuentra (insensible a acentos/mayúsculas).
3. Búsqueda sin resultados → estado vacío con opción de limpiar.
4. Combinar búsqueda + filtro por etiqueta + «con proyectos activos» → intersección correcta;
   filtros visibles y removibles; la paginación se mantiene coherente.

### 4. Etiquetas (US4, FR-011, FR-012)

1. Asignar a un cliente una etiqueta ya usada por proyectos → visible en listado y detalle.
2. Crear una etiqueta nueva desde el asignador → queda en el catálogo del tenant (visible también
   en el gestor de etiquetas de proyectos).
3. Quitar la etiqueta del cliente → desaparece de él sin borrarse del catálogo ni de los
   proyectos que la usan.

### 5. Creación al vuelo (US5, FR-013)

1. En `/dashboard/projects`, abrir «Nuevo proyecto» y llenar nombre/descripción.
2. En el selector de cliente, elegir «Crear cliente…», crear uno con nombre y email.
3. Verificar: el cliente queda seleccionado en el proyecto y **todos** los campos previos
   conservan su valor.
4. Repetir cancelando el subdiálogo → el formulario del proyecto queda intacto.

## Resultados esperados (criterios de éxito)

- SC-001: alta de cliente < 30 s desde el listado.
- SC-002: búsqueda/filtros < 1 s percibido con datos de prueba abundantes.
- SC-003: detalle → proyecto en una interacción.
- SC-004: creación al vuelo sin pérdida de datos, 100 % de los intentos.
- SC-005/SC-006: aislamiento entre tenants y borrado sin pérdida de proyectos (cubiertos también
  por integración).
