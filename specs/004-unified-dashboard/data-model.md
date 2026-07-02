# Data Model: Panel unificado del dashboard

**Fase 1** · Feature `004-unified-dashboard` · 2026-07-02

Esta feature **no introduce entidades persistentes** (sin cambios en `prisma/schema.prisma`, sin
migraciones): los widgets conservan sus datos de demostración estáticos. El «modelo de datos» de
la feature es el **inventario de widgets** con su mapeo origen → destino, que gobierna la
integración (fase 1) y la limpieza (fase bloqueada).

## Inventario de widgets (origen → destino)

Rutas relativas a `src/app/(main)/dashboard/`. Destino bajo `_components/widgets/`.

| # | Widget (título visible en origen) | Origen | Destino | Tipo | Datos demo |
|---|-----------------------------------|--------|---------|------|------------|
| 1 | Upcoming Meetings | `crm/_components/task-reminders.tsx` | `widgets/crm/meetings-and-goal.tsx` | Server | constantes en archivo |
| 2 | Monthly Proposal Goal | `crm/_components/task-reminders.tsx` (mismo archivo que #1) | `widgets/crm/meetings-and-goal.tsx` | Server | constantes en archivo |
| 3 | Recent Opportunities | `crm/_components/opportunities-section.tsx` + `crm/_components/opportunities-table/{columns.tsx,schema.ts,data.json}` | `widgets/crm/recent-opportunities.tsx` + `widgets/crm/opportunities-table/…` | Client (TanStack Table) | `data.json` validado con Zod |
| 4 | Spending Overview | `finance/_components/transactions-overview-card.tsx` | `widgets/finance/spending-overview.tsx` | Client (recharts LineChart) | constantes en archivo |
| 5 | Account Allocation | `finance/_components/balance-distribution-card.tsx` | `widgets/finance/account-allocation.tsx` | Client (recharts PieChart) | constantes en archivo |
| 6 | Shortcuts | `finance/_components/quick-actions.tsx` | `widgets/finance/shortcuts.tsx` ⚠️ renombrado (colisión con `_components/quick-actions.tsx` del panel) | Server | constantes en archivo |
| 7 | Traffic Sources | `analytics/_components/top-traffic-sources.tsx` | `widgets/analytics/traffic-sources.tsx` | Client (recharts BarChart + Tabs) | constantes en archivo |
| 8 | Highlights de Academy (Students Taught, Avg. Attendance, Assignments, Classes Today) | `academy/_components/kpi-cards.tsx` | `widgets/academy/academy-highlights.tsx` ⚠️ renombrado (colisión con `crm/_components/kpi-cards.tsx`) | Server | constantes en archivo |
| 9 | Class Schedule | `academy/_components/class-schedule.tsx` | `widgets/academy/class-schedule.tsx` | Server | constantes en archivo |
| 10 | Assignment Status | `academy/_components/assignment-status.tsx` | `widgets/academy/assignment-status.tsx` | Client (recharts) | constantes en archivo |
| 11 | Performance Highlights | `academy/_components/performance-highlights.tsx` | `widgets/academy/performance-highlights.tsx` | Client (recharts) | constantes en archivo |
| 12 | Upcoming Events | `academy/_components/upcoming-events.tsx` | `widgets/academy/upcoming-events.tsx` | Server | constantes en archivo |

Notas:

- Los widgets #1 y #2 conviven en un mismo archivo/section en origen; se copian juntos y ambos
  títulos deben ser visibles (supuesto documentado en la spec).
- «Tipo» refleja la frontera server/client de origen, que se conserva (research.md, D4).
- El tipo exacto (client/server) de #10 y #11 se confirma al copiar; ambos usan recharts según
  sus imports, por lo que se asumen client.

## Traducciones de títulos (FR-006)

| Título en origen | Título en el panel unificado |
|------------------|------------------------------|
| Upcoming Meetings | Reuniones próximas |
| Monthly Proposal Goal | Meta mensual de propuestas |
| Recent Opportunities | Oportunidades recientes |
| Spending Overview | Resumen de gastos |
| Account Allocation | Distribución de cuentas |
| Shortcuts | Atajos |
| Traffic Sources | Fuentes de tráfico |
| Students Taught | Estudiantes atendidos |
| Avg. Attendance | Asistencia promedio |
| Assignments | Tareas asignadas |
| Classes Today | Clases de hoy |
| Class Schedule | Horario de clases |
| Assignment Status | Estado de tareas |
| Performance Highlights | Rendimiento destacado |
| Upcoming Events | Próximos eventos (Academia) — sufijo para no confundir con el calendario lateral del panel |

El resto de textos internos (etiquetas, botones, tooltips, series de gráficas, estados) se
traduce durante la implementación siguiendo el mismo criterio (research.md, D3).

## Secciones temáticas del panel

| Sección (encabezado en español) | Widgets | Disposición (xl) |
|---------------------------------|---------|-------------------|
| Negocio | #1, #2, #3 | fila 1: 8+4 col; fila 2: tabla a ancho completo |
| Finanzas | #4, #5, #6 | 7+5 col; Atajos debajo |
| Analítica | #7 | ancho completo (o equilibrado con Atajos; decisión fina en implementación) |
| Academia | #8, #9, #10, #11, #12 | KPIs 4 col; 5+7 col; 8+4 col (como en origen) |

## Inventario de limpieza (fase bloqueada)

Elementos a eliminar **solo tras aprobación humana** (FR-009/FR-010):

- `src/app/(main)/dashboard/crm/` (página + `_components/` completos, incluidos los archivos no
  importados: `kpi-cards.tsx`, `pipeline-activity.tsx`)
- `src/app/(main)/dashboard/finance/` (página + `_components/` completos, incluidos
  `overview-kpis.tsx`, `income-breakdown.tsx`, `finance-notification.tsx`, `wallet.tsx`,
  `upcoming-transactions.tsx`)
- `src/app/(main)/dashboard/analytics/` (página + `_components/` completos, incluidos
  `analytics-kpi-strip.tsx`, `analytics-toolbar.tsx`, `realtime-visitors.tsx`, `top-pages.tsx`,
  `traffic-quality.tsx`)
- `src/app/(main)/dashboard/academy/` (página + `_components/` completos)
- Entradas `crm`, `finance`, `analytics`, `academy` en
  `src/navigation/sidebar/sidebar-items.ts` (≈ líneas 89-111)

Verificación posterior: `npm run build` sin errores + búsqueda de imports huérfanos hacia las
carpetas eliminadas (SC-006).
