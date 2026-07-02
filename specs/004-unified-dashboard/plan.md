# Implementation Plan: Panel unificado del dashboard

**Branch**: `main` (sin rama dedicada) | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-unified-dashboard/spec.md`

## Summary

Integrar en el panel raíz `/dashboard` los 12 widgets provenientes de los dashboards demo de la
plantilla (CRM, Finance, Analytics, Academy), conservando el contenido actual del panel. La
estrategia técnica es **copiar y adaptar**: cada widget se copia a
`src/app/(main)/dashboard/_components/widgets/…`, se traduce su texto visible al español y se
monta en secciones temáticas nuevas debajo del contenido existente. Los dashboards de origen
permanecen intactos hasta que una validación humana apruebe la fase de limpieza, que queda
registrada como tarea bloqueada.

## Technical Context

**Language/Version**: TypeScript (modo estricto) sobre Next.js 16 (App Router) + React 19 (React Compiler activado)

**Primary Dependencies**: shadcn/ui (Card, Tabs, Table, Select, etc.), Tailwind CSS v4, recharts (gráficas vía `@/components/ui/chart`), TanStack Table (tabla de oportunidades), lucide-react, date-fns. Todas ya presentes en el proyecto; **no se añade ninguna dependencia nueva**.

**Storage**: N/A — los widgets conservan sus datos de demostración estáticos (constantes en el propio componente o `data.json`), según el supuesto documentado en la spec.

**Testing**: No hay runner de pruebas configurado en el proyecto. Esta feature no introduce lógica de negocio (solo presentación con datos estáticos), por lo que la verificación es manual (guía `quickstart.md`) más las puertas automatizadas (Biome, React Doctor, `tsc`, `next build`).

**Target Platform**: Web (SSR/RSC en Node; producción vía Docker standalone)

**Project Type**: Aplicación web (Next.js App Router, colocación por feature)

**Performance Goals**: El panel unificado debe seguir sintiéndose instantáneo: se mantiene RSC-first — solo los widgets con gráficas/tabla interactiva son client components (ya lo son en origen); sin nuevas consultas a base de datos (datos estáticos); sin dependencias nuevas que engorden el bundle.

**Constraints**: Sin desbordamiento horizontal en móvil; soporte completo de tema claro/oscuro; textos visibles en español (Principio V); no tocar los dashboards de origen hasta la aprobación humana (FR-008).

**Scale/Scope**: 1 página modificada (`/dashboard`), ~13 archivos de widget copiados/adaptados (12 widgets, dos de ellos comparten archivo, más la subcarpeta de la tabla de oportunidades), 4 secciones temáticas nuevas. La fase de limpieza (bloqueada) eliminará 4 rutas demo, sus `_components` y 4 entradas del sidebar.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|-----------|------------|--------|
| I. Calidad del código | El plan cierra con `npm run check`, `npm run doctor` y `npm run build` al 100 %; no se suprimen reglas ni se excluyen archivos. Los widgets copiados deben pasar `useSortedClasses` y `useFilenamingConvention` (kebab-case). | ✅ PASS |
| II. Estándares de prueba | No se añade lógica de negocio (validaciones, dominio, Prisma): los widgets son presentacionales con datos estáticos. No se requieren pruebas nuevas; la validación es manual vía `quickstart.md`. Si durante la implementación apareciera lógica de dominio, se detiene y se configura el runner primero. | ✅ PASS (justificado) |
| III. Coherencia de UX | Es el corazón de la feature: mismos componentes shadcn/ui, tema claro/oscuro heredado (los widgets usan tokens `--chart-*`, `bg-muted`, etc.), agrupación temática, textos en español. Sin sistemas de estilo paralelos. | ✅ PASS |
| IV. Rendimiento | RSC-first: los widgets server-safe permanecen como server components; solo gráficas (recharts) y la tabla TanStack son client (igual que en origen). Cero consultas nuevas a BD. Sin dependencias nuevas. | ✅ PASS |
| V. Documentación en español | Spec, plan, research, quickstart y comentarios en español. Textos de interfaz de los widgets traducidos al español (FR-006). Identificadores de código en inglés. | ✅ PASS |

**Re-evaluación post-diseño (Fase 1)**: sin cambios — el diseño no introdujo dependencias, lógica de negocio ni desviaciones de la pila. ✅ PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-unified-dashboard/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones y alternativas
├── data-model.md        # Fase 1: inventario de widgets y mapeo origen→destino
├── quickstart.md        # Fase 1: guía de validación manual
├── checklists/
│   └── requirements.md  # Checklist de calidad de la spec
└── tasks.md             # Fase 2 (/speckit-tasks — no lo crea /speckit-plan)
```

*No se genera `contracts/`: la feature es puramente de interfaz interna; no expone APIs,
comandos ni esquemas nuevos.*

### Source Code (repository root)

```text
src/app/(main)/dashboard/
├── page.tsx                              # MODIFICAR: monta las 4 secciones temáticas nuevas
├── _components/                          # widgets existentes del panel (no se tocan)
│   ├── summary-cards.tsx, tasks-section.tsx, quick-actions.tsx, …
│   └── widgets/                          # NUEVO: widgets importados (copiados y adaptados)
│       ├── crm/
│       │   ├── meetings-and-goal.tsx     # ← crm/_components/task-reminders.tsx
│       │   │                             #   (Upcoming Meetings + Monthly Proposal Goal)
│       │   ├── recent-opportunities.tsx  # ← crm/_components/opportunities-section.tsx
│       │   └── opportunities-table/      # ← crm/_components/opportunities-table/
│       │       ├── columns.tsx
│       │       ├── schema.ts
│       │       └── data.json
│       ├── finance/
│       │   ├── spending-overview.tsx     # ← finance/_components/transactions-overview-card.tsx
│       │   ├── account-allocation.tsx    # ← finance/_components/balance-distribution-card.tsx
│       │   └── shortcuts.tsx             # ← finance/_components/quick-actions.tsx (renombrado:
│       │                                 #   colisiona con _components/quick-actions.tsx del panel)
│       ├── analytics/
│       │   └── traffic-sources.tsx       # ← analytics/_components/top-traffic-sources.tsx
│       └── academy/
│           ├── academy-highlights.tsx    # ← academy/_components/kpi-cards.tsx
│           ├── class-schedule.tsx        # ← academy/_components/class-schedule.tsx
│           ├── assignment-status.tsx     # ← academy/_components/assignment-status.tsx
│           ├── performance-highlights.tsx# ← academy/_components/performance-highlights.tsx
│           └── upcoming-events.tsx       # ← academy/_components/upcoming-events.tsx
│
├── crm/        # INTACTO hasta aprobación humana (fase de limpieza)
├── finance/    # INTACTO hasta aprobación humana
├── analytics/  # INTACTO hasta aprobación humana
└── academy/    # INTACTO hasta aprobación humana

src/navigation/sidebar/sidebar-items.ts   # SOLO en fase de limpieza: quitar entradas
                                          # crm/finance/analytics/academy (líneas ~89-111)
```

**Structure Decision**: colocación por feature bajo la ruta propietaria (`/dashboard`), con los
widgets importados agrupados en `_components/widgets/{crm,finance,analytics,academy}/` para que
la fase de limpieza posterior sea un borrado simple de las carpetas de origen. Ver
[research.md](./research.md) para la justificación de copiar-y-adaptar frente a importar en sitio.

## Diseño de la página unificada

`page.tsx` conserva su grid actual (columna principal 9/12 + lateral 3/12) y añade debajo
cuatro secciones temáticas de ancho completo, cada una con un encabezado en español:

1. **«Negocio» (CRM)** — fila 1: Reuniones próximas (8 col) + Meta mensual de propuestas (4 col)
   (ambos vienen juntos en `meetings-and-goal.tsx`); fila 2: Oportunidades recientes (tabla, ancho completo).
2. **«Finanzas»** — Resumen de gastos (7 col) + Distribución de cuentas (5 col); Atajos debajo (ancho completo o 4 col según densidad).
3. **«Analítica»** — Fuentes de tráfico (ancho completo o 6 col emparejado con Atajos de Finanzas si el equilibrio visual lo pide; decisión fina en implementación).
4. **«Academia»** — highlights (4 tarjetas KPI en grid 4 col), luego Horario de clases (5 col) + Estado de tareas (7 col), luego Aspectos destacados de rendimiento (8 col) + Próximos eventos (4 col) — misma disposición relativa que la vista de origen, que ya está probada.

Reglas transversales:

- Encabezados de sección con la misma tipografía/jerarquía que el panel actual.
- Breakpoints: 1 columna en móvil, transiciones en `md`/`xl` como los grids de origen.
- El widget «Upcoming Events» de Academy se titula **«Próximos eventos (Academia)»** para no
  confundirse con el calendario lateral existente (edge case de la spec).
- Botones/acciones internas de los widgets que apuntaban a rutas demo se dejan como acciones
  decorativas (sin navegación rota) o se retiran; nunca deben enlazar a rutas que la limpieza
  vaya a eliminar.

## Fase de limpieza (bloqueada por validación humana)

Se materializa en `tasks.md` como fase final explícitamente marcada
**«⛔ BLOQUEADA: requiere aprobación humana del panel unificado»**. Alcance al ejecutarse:

1. Eliminar `src/app/(main)/dashboard/{crm,finance,analytics,academy}/` completos.
2. Quitar las 4 entradas correspondientes de `src/navigation/sidebar/sidebar-items.ts`.
3. Verificar con `npm run build` + grep de imports que no quedan referencias huérfanas
   (SC-006). Otros demos (invoice, kanban, etc.) quedan fuera del alcance salvo decisión
   explícita durante la validación.

## Complexity Tracking

> Sin violaciones de la constitución que justificar.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

*Nota (no es violación):* existe duplicación temporal de código entre los widgets copiados y sus
originales. Es deliberada y acotada: FR-008 exige que los dashboards de origen sigan operativos
hasta la validación humana, y la fase de limpieza elimina los originales. Ver research.md, D1.
