# Research: Panel unificado del dashboard

**Fase 0** · Feature `004-unified-dashboard` · 2026-07-02

No quedaban marcadores `NEEDS CLARIFICATION` en el Technical Context; esta fase documenta las
decisiones de diseño técnico con sus alternativas.

## D1 — Estrategia de integración: copiar y adaptar (no importar en sitio)

- **Decision**: Copiar cada widget de su dashboard de origen a
  `src/app/(main)/dashboard/_components/widgets/{crm,finance,analytics,academy}/` y adaptarlo
  allí (traducción, ajustes de layout). Los originales no se tocan.
- **Rationale**:
  - FR-008 exige que `/dashboard/crm`, `/dashboard/finance`, `/dashboard/analytics` y
    `/dashboard/academy` sigan operativos e **idénticos** hasta la validación humana. Importar
    los componentes originales desde `page.tsx` del panel obligaría a traducirlos y ajustarlos
    en sitio, alterando también las vistas demo que sirven de referencia para la validación.
  - La fase de limpieza se convierte en un borrado simple de carpetas (`crm/`, `finance/`,
    `analytics/`, `academy/`) sin necesidad de mover archivos ni reescribir imports del panel.
  - La duplicación temporal es acotada (≈13 archivos) y desaparece al ejecutar la limpieza.
- **Alternatives considered**:
  - *Importar en sitio* (el panel importa `../crm/_components/task-reminders`): evita duplicar,
    pero acopla el panel a carpetas condenadas a borrarse, obliga a traducir los demos (pierden
    su valor de referencia «antes/después» para la validación) y convierte la limpieza en una
    migración de archivos con reescritura de imports.
  - *Mover directamente y hacer que los demos importen desde `widgets/`*: invierte la dependencia
    (demos → panel), pero los demos mostrarían los textos traducidos/adaptados, violando la idea
    de mantenerlos intactos como referencia; misma complejidad de limpieza que copiar.

## D2 — Ubicación y nomenclatura de los widgets copiados

- **Decision**: Subcarpeta `widgets/` dentro de `_components/` del panel, con un subdirectorio
  por dominio de origen y nombres kebab-case descriptivos del contenido:
  `meetings-and-goal.tsx`, `recent-opportunities.tsx`, `spending-overview.tsx`,
  `account-allocation.tsx`, `shortcuts.tsx`, `traffic-sources.tsx`, `academy-highlights.tsx`,
  `class-schedule.tsx`, `assignment-status.tsx`, `performance-highlights.tsx`,
  `upcoming-events.tsx`.
- **Rationale**:
  - Respeta la convención del proyecto (colocación por feature, carpetas privadas `_`).
  - Resuelve dos colisiones de nombre: `quick-actions.tsx` ya existe en `_components/` del panel
    (widget propio) — el de Finance pasa a llamarse `shortcuts.tsx` (coincide con su título
    visible); `kpi-cards.tsx` existe en crm y academy — el de Academy pasa a
    `academy-highlights.tsx`.
  - Cumple `useFilenamingConvention` de Biome.
- **Alternatives considered**:
  - *Todo plano en `_components/`*: mezclaría 13 archivos nuevos con los 9 del panel actual y
    haría ambigua la fase de limpieza y el origen de cada pieza.
  - *Carpeta compartida `src/components/dashboard-widgets/`*: rompe la colocación por feature;
    esa carpeta es para componentes generados/compartidos (ui, calendar).

## D3 — Traducción de textos visibles

- **Decision**: Traducir al español todos los textos visibles de las **copias** (títulos,
  etiquetas, tooltips, textos de botones, unidades como «sent»/«target», nombres de series de
  gráficas en `chartConfig`). Los datos demo con nombres propios (p. ej. «Weblabs Studio»,
  «Organic Search») se traducen solo cuando son términos genéricos («Búsqueda orgánica»,
  «Directo»); los nombres propios ficticios se conservan.
- **Rationale**: FR-006 y Principio V de la constitución (mensajes de interfaz en español). Los
  demos originales quedan en inglés — no se validan contra FR-006 porque van a eliminarse.
- **Alternatives considered**: *Dejar los widgets en inglés* «porque son demo»: viola la
  constitución y el criterio SC-004; el panel unificado es producto real, no demo.

## D4 — Frontera server/client de los componentes

- **Decision**: Conservar la naturaleza de cada widget tal como está en origen: server
  components los estáticos (`task-reminders`, `quick-actions` de Finance, `kpi-cards` de
  Academy, `class-schedule`, `upcoming-events`) y client components solo los que usan recharts o
  TanStack Table (`transactions-overview-card`, `balance-distribution-card`,
  `top-traffic-sources`, `opportunities-section`, `assignment-status`, `performance-highlights`).
  `page.tsx` sigue siendo server component (usa `auth()`).
- **Rationale**: Principio IV (RSC-first, JS de cliente limitado a lo interactivo). Los widgets
  ya tienen la frontera bien trazada en origen; no hay motivo para moverla.
- **Alternatives considered**: *`next/dynamic` con `ssr: false` para las gráficas*: innecesario —
  recharts ya funciona con el patrón `ChartContainer` de shadcn en el proyecto; añadiría layout
  shift sin beneficio medible.

## D5 — Mecanismo de bloqueo de la fase de limpieza

- **Decision**: La limpieza se modela en `tasks.md` como fase final con marcador explícito
  «⛔ BLOQUEADA: requiere aprobación humana del panel unificado». `/speckit-implement` no debe
  ejecutarla; se desbloquea editando el marcador tras la validación del propietario.
- **Rationale**: Petición explícita del usuario («dejar como task»); FR-009. Un marcador textual
  en tasks.md es el mecanismo estándar de Spec Kit para checkpoints humanos, visible en cualquier
  revisión.
- **Alternatives considered**: *Spec separada para la limpieza*: fragmenta el contexto (el
  inventario de qué borrar vive aquí); *feature flag en código*: complejidad de ejecución para un
  acto único de borrado.

## D6 — Enlaces y acciones internas de los widgets

- **Decision**: Revisar cada copia y neutralizar acciones que naveguen a rutas demo condenadas:
  se conservan como botones decorativos sin `href` roto o se retiran si no aportan (p. ej. «View
  Calendar» del widget de reuniones puede apuntar a `/dashboard/calendar`, que sí es parte del
  producto).
- **Rationale**: Edge case de la spec: tras la limpieza no puede haber enlaces rotos (SC-006).
- **Alternatives considered**: *Dejar los enlaces tal cual y arreglarlos en la limpieza*:
  distribuye el riesgo en dos fases y depende de memoria; mejor dejarlos correctos desde la copia.
