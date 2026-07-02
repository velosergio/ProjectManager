# Tasks: Panel unificado del dashboard

**Input**: Design documents from `/specs/004-unified-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: No se generan tareas de pruebas automatizadas: la spec no las solicita, la feature no
introduce lógica de negocio (widgets presentacionales con datos estáticos) y el proyecto aún no
tiene runner configurado. La verificación es manual vía `quickstart.md` más las puertas de
calidad de la constitución.

**Organization**: Tareas agrupadas por historia de usuario. La fase de limpieza (US3) está
**bloqueada por validación humana** y no debe ejecutarse con el resto.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1, US2, US3)

## Path Conventions

Proyecto Next.js App Router con colocación por feature. Rutas relativas a la raíz del
repositorio. Origen y destino de cada widget: ver inventario en
[data-model.md](./data-model.md).

---

## Phase 1: Setup

**Purpose**: Preparar la estructura que recibirá los widgets copiados.

- [X] T001 Crear la estructura de carpetas `src/app/(main)/dashboard/_components/widgets/` con subcarpetas `crm/`, `finance/`, `analytics/`, `academy/` y `crm/opportunities-table/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: N/A — no hay prerrequisitos bloqueantes: todas las dependencias (shadcn/ui,
recharts, TanStack Table, date-fns, lucide-react) ya están instaladas y los widgets de origen ya
funcionan. Ninguna tarea en esta fase.

**Checkpoint**: tras T001 puede comenzar la implementación de las historias.

---

## Phase 3: User Story 1 - Ver el panel unificado con todos los widgets (Priority: P1) 🎯 MVP

**Goal**: Los 12 widgets de CRM, Finance, Analytics y Academy visibles en `/dashboard` junto al
contenido actual del panel, sin tocar los dashboards de origen.

**Independent Test**: Iniciar sesión, abrir `/dashboard` y verificar que los 12 widgets se
renderizan en sus 4 secciones temáticas, que el contenido previo del panel sigue intacto y que
las rutas demo de origen siguen funcionando (quickstart, escenarios 1 y 4).

### Implementation for User Story 1

Copias: conservar la frontera server/client de origen (research.md, D4) y ajustar los imports
relativos. Renombrar el componente exportado cuando el archivo cambia de nombre.

- [X] T002 [P] [US1] Copiar `src/app/(main)/dashboard/crm/_components/task-reminders.tsx` a `src/app/(main)/dashboard/_components/widgets/crm/meetings-and-goal.tsx` (export `MeetingsAndGoal`; contiene los widgets «Upcoming Meetings» y «Monthly Proposal Goal»)
- [X] T003 [P] [US1] Copiar `src/app/(main)/dashboard/crm/_components/opportunities-section.tsx` a `src/app/(main)/dashboard/_components/widgets/crm/recent-opportunities.tsx` (export `RecentOpportunities`) y la subcarpeta `opportunities-table/` (`columns.tsx`, `schema.ts`, `data.json`) a `src/app/(main)/dashboard/_components/widgets/crm/opportunities-table/`, ajustando los imports relativos
- [X] T004 [P] [US1] Copiar `src/app/(main)/dashboard/finance/_components/transactions-overview-card.tsx` a `src/app/(main)/dashboard/_components/widgets/finance/spending-overview.tsx` (export `SpendingOverview`)
- [X] T005 [P] [US1] Copiar `src/app/(main)/dashboard/finance/_components/balance-distribution-card.tsx` a `src/app/(main)/dashboard/_components/widgets/finance/account-allocation.tsx` (export `AccountAllocation`)
- [X] T006 [P] [US1] Copiar `src/app/(main)/dashboard/finance/_components/quick-actions.tsx` a `src/app/(main)/dashboard/_components/widgets/finance/shortcuts.tsx` (export `Shortcuts`; renombrado por colisión con `_components/quick-actions.tsx` del panel)
- [X] T007 [P] [US1] Copiar `src/app/(main)/dashboard/analytics/_components/top-traffic-sources.tsx` a `src/app/(main)/dashboard/_components/widgets/analytics/traffic-sources.tsx` (export `TrafficSources`)
- [X] T008 [P] [US1] Copiar `src/app/(main)/dashboard/academy/_components/kpi-cards.tsx` a `src/app/(main)/dashboard/_components/widgets/academy/academy-highlights.tsx` (export `AcademyHighlights`; renombrado por colisión con `crm/_components/kpi-cards.tsx`)
- [X] T009 [P] [US1] Copiar `src/app/(main)/dashboard/academy/_components/class-schedule.tsx` a `src/app/(main)/dashboard/_components/widgets/academy/class-schedule.tsx`
- [X] T010 [P] [US1] Copiar `src/app/(main)/dashboard/academy/_components/assignment-status.tsx` a `src/app/(main)/dashboard/_components/widgets/academy/assignment-status.tsx`
- [X] T011 [P] [US1] Copiar `src/app/(main)/dashboard/academy/_components/performance-highlights.tsx` a `src/app/(main)/dashboard/_components/widgets/academy/performance-highlights.tsx`
- [X] T012 [P] [US1] Copiar `src/app/(main)/dashboard/academy/_components/upcoming-events.tsx` a `src/app/(main)/dashboard/_components/widgets/academy/upcoming-events.tsx`
- [X] T013 [US1] Modificar `src/app/(main)/dashboard/page.tsx`: añadir debajo del grid actual las 4 secciones temáticas con encabezados en español y las disposiciones del plan — «Negocio» (MeetingsAndGoal; RecentOpportunities a ancho completo), «Finanzas» (SpendingOverview 7 col + AccountAllocation 5 col; Shortcuts), «Analítica» (TrafficSources), «Academia» (AcademyHighlights; ClassSchedule 5 + AssignmentStatus 7; PerformanceHighlights 8 + UpcomingEvents 4). Depende de T002–T012
- [X] T014 [US1] Verificación manual: escenarios 1 y 4 de `specs/004-unified-dashboard/quickstart.md` (12 widgets visibles, contenido previo intacto, dashboards de origen sin cambios, sin errores de consola) — verificado por el propietario el 2026-07-02

**Checkpoint**: Panel unificado funcional (aún con textos de origen). MVP demostrable.

---

## Phase 4: User Story 2 - Experiencia coherente del panel unificado (Priority: P2)

**Goal**: Los widgets integrados se sienten parte del producto: textos en español, tema
claro/oscuro correcto, responsive sin desbordes y sin enlaces hacia rutas demo condenadas.

**Independent Test**: Con el panel en pantalla, alternar tema claro/oscuro, probar viewports
móvil/tablet/escritorio y leer todos los textos visibles: en español y sin bloques rotos
(quickstart, escenarios 2 y 3).

### Implementation for User Story 2

Traducciones según la tabla de [data-model.md](./data-model.md) y el criterio D3 de research.md
(términos genéricos se traducen; nombres propios ficticios se conservan).

- [X] T015 [P] [US2] Traducir al español los textos visibles de los widgets CRM: `src/app/(main)/dashboard/_components/widgets/crm/meetings-and-goal.tsx` («Reuniones próximas», «Meta mensual de propuestas», «sent»/«target», etc.), `recent-opportunities.tsx` y `opportunities-table/columns.tsx` («Oportunidades recientes», encabezados de columna, filtros, paginación)
- [X] T016 [P] [US2] Traducir al español los textos visibles de los widgets Finance: `src/app/(main)/dashboard/_components/widgets/finance/spending-overview.tsx` («Resumen de gastos», series de `chartConfig`), `account-allocation.tsx` («Distribución de cuentas», nombres de cuenta genéricos) y `shortcuts.tsx` («Atajos», etiquetas de acciones)
- [X] T017 [P] [US2] Traducir al español los textos visibles del widget Analytics: `src/app/(main)/dashboard/_components/widgets/analytics/traffic-sources.tsx` («Fuentes de tráfico», pestañas, fuentes genéricas como «Búsqueda orgánica», «Directo»)
- [X] T018 [P] [US2] Traducir al español los textos visibles de los widgets Academy: `academy-highlights.tsx` («Estudiantes atendidos», «Asistencia promedio», «Tareas asignadas», «Clases de hoy»), `class-schedule.tsx` («Horario de clases»), `assignment-status.tsx` («Estado de tareas»), `performance-highlights.tsx` («Rendimiento destacado») y `upcoming-events.tsx` (título «Próximos eventos (Academia)» para distinguirlo del calendario lateral)
- [X] T019 [US2] Revisar y neutralizar enlaces/acciones internas de los widgets copiados que apunten a rutas demo (research.md, D6): «View Calendar» → `/dashboard/calendar` traducido, botones sin destino útil quedan decorativos o se retiran. Archivos bajo `src/app/(main)/dashboard/_components/widgets/`
- [X] T020 [US2] Ajustes de responsive y tema en `src/app/(main)/dashboard/page.tsx` y los widgets copiados: verificar móvil (~375 px), tablet (~768 px), escritorio (~1440 px) y tema claro/oscuro; corregir desbordes horizontales (la tabla de oportunidades debe desplazarse sin romper el layout)
- [X] T021 [US2] Verificación manual: escenarios 2 y 3 de `specs/004-unified-dashboard/quickstart.md` — verificado por el propietario el 2026-07-02

**Checkpoint**: Panel unificado coherente y en español; los dashboards demo de origen siguen en
inglés e intactos.

---

## Phase 5: Polish y puertas de calidad (previas a la validación humana)

**Purpose**: Cumplir las puertas de la constitución y dejar el panel listo para la validación
del propietario.

- [X] T022 Ejecutar `npm run check` (usar `npm run check:fix` para autocorregibles) y resolver todo error/advertencia de Biome sin suprimir reglas (clases Tailwind ordenadas, imports organizados, kebab-case)
- [X] T023 Ejecutar `npm run doctor` (React Doctor) y resolver todos los diagnósticos pendientes
- [X] T024 Ejecutar `npm run build` y corregir cualquier error de TypeScript o de build
- [X] T025 Ejecutar la validación completa de `specs/004-unified-dashboard/quickstart.md` (escenarios 1–5) y **solicitar la validación humana del propietario** presentando el panel unificado. Registrar el resultado (aprobado/observaciones) como comentario en este archivo — **resultado: APROBADO** por el propietario el 2026-07-02 («ya verifiqué, todo pasa ok»)

> **Registro de ejecución (2026-07-02, /speckit-implement):**
>
> - Puertas verificadas: Biome limpio (0 errores, 0 advertencias) en los 15 archivos de la
>   feature; `npm run build` y TypeScript sin errores; las 4 rutas demo de origen intactas.
> - Deuda preexistente del repo (fuera del alcance de esta feature): 16 advertencias de Biome en
>   `src/lib/tenant-db.ts`, `users.tsx`, `roles.tsx` y el CRM de origen (protegido por FR-008), y
>   diagnósticos de React Doctor repartidos por los demos de la plantilla (puntuación global 49).
> - Hallazgos justificados que permanecen en las copias: `"use no memo"` + `useMemo` en
>   `recent-opportunities.tsx` (patrón oficial de TanStack Table con React Compiler, heredado del
>   origen) e importaciones estáticas de recharts (decisión D6→D4 de research.md: sin
>   `next/dynamic`).
> - T014 y T021 (verificación visual en navegador: 12 widgets, tema, responsive) quedan a cargo
>   del propietario junto con T025: **validación humana solicitada, pendiente de registro aquí**.

**Checkpoint**: 🧑‍⚖️ **PUNTO DE VALIDACIÓN HUMANA** — el trabajo se detiene aquí hasta obtener
la aprobación explícita del propietario del proyecto.

---

## Phase 6: User Story 3 - Limpieza posterior a la validación humana (Priority: P3)

> ## ✅ FASE DESBLOQUEADA
>
> **Aprobación**: otorgada por el propietario del proyecto el 2026-07-02 tras verificar el panel
> unificado («ya verifiqué, todo pasa ok, puedes continuar»). Marcador ⛔ retirado conforme al
> mecanismo de research.md, D5.

**Goal**: Eliminar los dashboards demo de origen y sus componentes sin uso, dejando el panel
unificado y la navegación plenamente funcionales.

**Independent Test**: Tras ejecutar la fase, las 4 rutas demo ya no existen, el sidebar no las
muestra, `/dashboard` funciona íntegro y no quedan referencias huérfanas (quickstart, escenario 6).

### Implementation for User Story 3

- [X] T026 [US3] Confirmar que el marcador ⛔ de esta fase fue retirado con la aprobación registrada; si sigue presente, DETENERSE
- [X] T027 [US3] Eliminar las carpetas completas `src/app/(main)/dashboard/crm/`, `src/app/(main)/dashboard/finance/`, `src/app/(main)/dashboard/analytics/` y `src/app/(main)/dashboard/academy/` (páginas y `_components`, incluidos los archivos nunca importados al panel; inventario exacto en data-model.md)
- [X] T028 [US3] Quitar las entradas `crm`, `finance`, `analytics` y `academy` de `src/navigation/sidebar/sidebar-items.ts` (≈ líneas 89-111), conservando el resto de items
- [X] T029 [US3] Buscar referencias huérfanas hacia las carpetas eliminadas (grep de `dashboard/crm`, `dashboard/finance`, `dashboard/analytics`, `dashboard/academy` en `src/`) y corregir cualquier resultado
- [X] T030 [US3] Puertas de calidad tras la limpieza: `npm run check`, `npm run doctor`, `npm run build` al 100 % y verificación del escenario 6 de `specs/004-unified-dashboard/quickstart.md`

**Checkpoint**: Feature completa: panel unificado como única vista, sin código demo muerto.

> **Registro de ejecución de la limpieza (2026-07-02, /speckit-implement):**
>
> - Eliminadas las 4 carpetas demo (crm, finance, analytics, academy) y sus 4 entradas del
>   sidebar, junto con los iconos de lucide que quedaron sin uso en `sidebar-items.ts`.
> - Grep de referencias huérfanas (`dashboard/(crm|finance|analytics|academy)` y
>   `*/_components` de origen) en `src/`: 0 resultados (SC-006 ✓).
> - `npm run build`: sin errores; las rutas demo ya no aparecen en el mapa de rutas.
> - Biome: 0 errores (las advertencias bajaron de 18 a 14; las 14 restantes son deuda
>   preexistente en `tenant-db.ts`, `users.tsx` y `roles.tsx`, fuera del alcance de la feature).
> - React Doctor: sin diagnósticos nuevos en los archivos de la feature; permanecen los dos
>   patrones justificados documentados en el registro de la Phase 5.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: vacía — tras T001 pueden empezar las historias
- **US1 (Phase 3)**: depende de T001. T002–T012 en paralelo; T013 depende de T002–T012; T014 depende de T013
- **US2 (Phase 4)**: depende de US1 (traduce y ajusta las copias creadas en US1). T015–T018 en paralelo; T019–T020 tras las traducciones; T021 al final
- **Polish (Phase 5)**: depende de US1 + US2; secuencial (T022 → T023 → T024 → T025)
- **US3 (Phase 6)**: ⛔ depende de la **aprobación humana** posterior a T025. T026 → T027 → T028 → T029 → T030

### User Story Dependencies

- **US1 (P1)**: independiente — MVP
- **US2 (P2)**: depende de US1 (opera sobre los archivos copiados); independientemente verificable con los escenarios 2–3 del quickstart
- **US3 (P3)**: depende de US1+US2+validación humana; independientemente verificable con el escenario 6

### Parallel Opportunities

- T002–T012 (11 tareas de copia): totalmente paralelizables — archivos de destino distintos
- T015–T018 (4 tareas de traducción): paralelizables — carpetas de widgets distintas

## Parallel Example: User Story 1

```text
# Lanzar todas las copias de widgets a la vez (archivos independientes):
Task: "Copiar task-reminders.tsx → widgets/crm/meetings-and-goal.tsx"
Task: "Copiar opportunities-section.tsx + opportunities-table/ → widgets/crm/"
Task: "Copiar transactions-overview-card.tsx → widgets/finance/spending-overview.tsx"
Task: "Copiar balance-distribution-card.tsx → widgets/finance/account-allocation.tsx"
Task: "Copiar quick-actions.tsx → widgets/finance/shortcuts.tsx"
Task: "Copiar top-traffic-sources.tsx → widgets/analytics/traffic-sources.tsx"
Task: "Copiar kpi-cards.tsx → widgets/academy/academy-highlights.tsx"
Task: "Copiar class-schedule.tsx → widgets/academy/class-schedule.tsx"
Task: "Copiar assignment-status.tsx → widgets/academy/assignment-status.tsx"
Task: "Copiar performance-highlights.tsx → widgets/academy/performance-highlights.tsx"
Task: "Copiar upcoming-events.tsx → widgets/academy/upcoming-events.tsx"
# Después, secuencial:
Task: "Montar las 4 secciones en page.tsx" (T013)
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (T001) → Phase 3 (T002–T014)
2. **PARAR y VALIDAR**: panel unificado visible con los 12 widgets, origen intacto
3. Demostrable como MVP aunque los textos sigan en inglés

### Incremental Delivery

1. US1 → panel unificado funcional (MVP)
2. US2 → coherencia total (español, tema, responsive)
3. Phase 5 → puertas de calidad + **solicitud de validación humana**
4. 🧑‍⚖️ *espera de aprobación* (el trabajo automatizado se detiene aquí)
5. US3 (tras desbloquear) → eliminación de demos y cierre de la feature

## Notes

- No modificar nada bajo `src/app/(main)/dashboard/{crm,finance,analytics,academy}/` antes de la Phase 6 (FR-008)
- No editar `src/components/ui/**` (código generado, ignorado por Biome)
- Commit tras cada tarea o grupo lógico; los hooks de pre-commit (Husky + lint-staged) deben pasar sin `--no-verify`
- El React Compiler está activo: no añadir `useMemo`/`useCallback` manuales en las copias
