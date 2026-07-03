# Quickstart: Validación de Gestión de Proyectos y Tareas (FASE 2)

**Fecha**: 2026-07-02 · **Spec**: [spec.md](./spec.md) · **Contratos**: [contracts/server-actions.md](./contracts/server-actions.md)

Guía de validación manual de la feature de punta a punta. Complementa (no sustituye) la suite
de Vitest y las puertas de calidad de la constitución.

## Prerrequisitos

```bash
cp .env.example .env.local   # si no existe; DATABASE_URL apuntando a MySQL local
npm install
npm run db:migrate           # aplica la migración project_management
npm run db:seed              # planes
npm run dev
```

- Dos cuentas en **organizaciones distintas** (registrarse dos veces en `/register`), para el
  escenario de aislamiento.
- Una cuenta `mango` si se quiere validar la consola (`npm run mango`).
- Para el escenario de cuota: el plan Gratuito debe tener `maxProjects` finito (ver seed).

## Escenario 1 — CRUD de proyectos (US1)

1. Iniciar sesión y abrir **Proyectos** en el sidebar (`/dashboard/projects`).
2. Con la organización vacía: se ve un estado vacío con acción «Nuevo proyecto». ✅ FR-017
3. Crear un proyecto solo con nombre → aparece en el listado con estado «Pendiente» y
   prioridad «Media» por defecto. ✅ FR-001, FR-005, FR-006
4. Crear otro con todos los campos: cliente, prioridad «Alta», tipo de proceso creado al vuelo,
   estado «En proceso», fechas, responsable, etiquetas nuevas. ✅ FR-001, FR-013, FR-021
5. Intentar guardar con fecha de cierre anterior a la de inicio → error de validación claro en
   español. ✅ FR-007
6. Editar el proyecto (cambiar prioridad y estado) → cambios visibles en listado y detalle. ✅ FR-002
7. Eliminarlo → diálogo de confirmación que avisa del arrastre de tareas; confirmar → desaparece. ✅ FR-002

## Escenario 2 — Detalle y tareas (US2)

1. Abrir el detalle de un proyecto: se ven todos los campos, etiquetas y avance 0 % con estado
   vacío de tareas. ✅ FR-008, FR-017
2. Crear 4 tareas (título; a una asignarle responsable y fecha límite pasada). ✅ FR-009
3. La tarea con fecha pasada se distingue como vencida. ✅ FR-019
4. Completar 2 tareas → el avance del proyecto pasa a 50 % sin recargar manualmente. ✅ FR-010, SC-008
5. Editar y eliminar una tarea. ✅ FR-009

## Escenario 3 — Panel con datos reales (US3)

1. Abrir `/dashboard`:
   - «Proyectos» muestra **todos** los proyectos de la organización con estado, avance y fecha
     de cierre; el filtro por estado funciona. ✅ FR-014
   - «Tareas» muestra solo las tareas **del usuario actual o sin responsable**, con el filtro
     hoy/mañana/esta semana operativo. ✅ FR-015
   - Las tarjetas de resumen muestran cifras reales (tareas de hoy, progreso semanal). ✅ FR-016
2. Marcar una tarea como completada desde el panel → persiste y actualiza el avance. ✅ SC-008
3. «Nuevo» y «Nueva tarea» conducen a los flujos reales de creación. ✅ FR-014, FR-015
4. Con una cuenta recién creada: estados vacíos accionables, sin datos de ejemplo ni errores. ✅ SC-007, SC-003

## Escenario 4 — Búsqueda, filtros y etiquetas (US4)

1. Con ≥ 5 proyectos variados: buscar por fragmento del nombre y por nombre de cliente. ✅ FR-012
2. Combinar filtros (estado + prioridad + etiqueta + tipo de proceso) → solo coincidencias. ✅ FR-012
3. Filtros sin resultados → estado vacío con «limpiar filtros». ✅ FR-012
4. Renombrar una etiqueta → cambia en todos los proyectos que la usan; eliminarla → desaparece
   de ellos sin afectarlos. ✅ FR-013
5. Eliminar un tipo de proceso en uso → los proyectos quedan «sin tipo». ✅ FR-021

## Escenario 5 — Aislamiento, permisos y cuota

1. Con la organización B: no se ve ningún proyecto/tarea/etiqueta/tipo de la organización A
   (listado, detalle por URL directa → not found). ✅ FR-003, SC-004
2. Crear proyectos hasta el límite del plan Gratuito → el siguiente intento se rechaza con
   mensaje de límite y sugerencia de ampliar plan. ✅ FR-004, SC-006
3. Con un usuario MEMBER: puede gestionar tareas; solo puede editar proyectos donde es
   responsable (o tiene tareas asignadas); no ve «Eliminar». Con VIEWER: solo lectura. ✅ FR-018
4. (Opcional) Con `mango`: desde la consola, inspeccionar el tenant y ver sus proyectos. ✅ FR-003

## Escenario 6 — Calidad transversal

1. Alternar tema claro/oscuro en listado, detalle y panel: sin roturas. ✅ FR-020
2. Navegar y operar los formularios con teclado. ✅ FR-020
3. Viewports ~375 px / ~768 px / ~1440 px sin desbordes. ✅ Principio III
4. Puertas de calidad:

```bash
npm run check    # Biome 100 %
npm run doctor   # React Doctor sin diagnósticos nuevos
npm run build    # TS + build sin errores
npm run test     # Vitest: unit + integración (requiere MySQL corriendo)
```
