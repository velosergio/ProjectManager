# Feature Specification: Panel unificado del dashboard

**Feature Branch**: `004-unified-dashboard`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Unificar en un único panel varios componentes de las diferentes plantillas actuales: todo se agregará al panel actual /dashboard. Componentes a importar: CRM (Upcoming Meetings, Monthly Proposal Goal, Recent Opportunities), Finance (Spending Overview, Account Allocation, Shortcuts), Analytics (Traffic Sources), Academy (highlights: Students Taught, Avg. Attendance, Assignments, Classes Today; Class Schedule; Assignment Status; Performance Highlights; Upcoming Events). Primero se integran todos y luego, después de una validación humana, se aprueba la eliminación de los dashboards y componentes no usados (dejar como task)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el panel unificado con todos los widgets (Priority: P1)

Un usuario autenticado entra a `/dashboard` y encuentra, en una sola vista, además del contenido
actual del panel (saludo, resumen, tareas, proyectos, calendario, etc.), los widgets provenientes
de los dashboards de demostración: los tres bloques de CRM, los tres de Finance, el de Analytics
y los cinco de Academy. Ya no necesita navegar a `/dashboard/crm`, `/dashboard/finance`,
`/dashboard/analytics` ni `/dashboard/academy` para ver esa información.

**Why this priority**: Es la misión central de la feature: consolidar la información dispersa en
un único panel. Sin esto, no existe la feature.

**Independent Test**: Iniciar sesión, abrir `/dashboard` y verificar visualmente que los 12
widgets listados aparecen renderizados junto al contenido existente del panel, sin errores en
consola ni bloques rotos.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** abre `/dashboard`, **Then** ve los widgets de CRM
   «Upcoming Meetings», «Monthly Proposal Goal» y «Recent Opportunities» integrados en el panel.
2. **Given** un usuario autenticado, **When** abre `/dashboard`, **Then** ve los widgets de
   Finance «Spending Overview», «Account Allocation» y «Shortcuts».
3. **Given** un usuario autenticado, **When** abre `/dashboard`, **Then** ve el widget de
   Analytics «Traffic Sources».
4. **Given** un usuario autenticado, **When** abre `/dashboard`, **Then** ve los highlights de
   Academy (Students Taught, Avg. Attendance, Assignments, Classes Today) y los widgets
   «Class Schedule», «Assignment Status», «Performance Highlights» y «Upcoming Events».
5. **Given** el panel unificado, **When** el usuario revisa el contenido previo del dashboard
   (saludo, resumen, tareas, proyectos), **Then** ese contenido sigue presente y funcional.

---

### User Story 2 - Experiencia coherente del panel unificado (Priority: P2)

El usuario percibe el panel unificado como un único producto: los widgets importados respetan el
idioma de la interfaz (español), el tema claro/oscuro activo, la disposición responsive y los
patrones visuales del resto del panel, en lugar de verse como piezas pegadas de plantillas
distintas.

**Why this priority**: La constitución del proyecto (Principio III) exige coherencia de
experiencia; un panel unificado que se sienta inconexo no cumple el objetivo de «unificar».

**Independent Test**: Con el panel unificado en pantalla, cambiar entre tema claro y oscuro,
redimensionar la ventana (móvil, tablet, escritorio) y revisar los textos visibles de los widgets
importados: todo debe mantenerse legible, ordenado y en español.

**Acceptance Scenarios**:

1. **Given** el panel unificado, **When** el usuario cambia de tema claro a oscuro, **Then**
   todos los widgets importados se adaptan sin pérdida de contraste ni estilos rotos.
2. **Given** el panel unificado, **When** se visualiza en un viewport móvil, **Then** los widgets
   se reorganizan en una columna sin desbordamientos horizontales.
3. **Given** los widgets importados, **When** el usuario lee sus títulos, etiquetas y mensajes,
   **Then** los textos visibles están en español con ortografía correcta.
4. **Given** el panel unificado, **When** los widgets se agrupan visualmente, **Then** la
   agrupación sigue un orden temático comprensible (p. ej. bloques de negocio, finanzas,
   analítica y academia diferenciados) y no una mezcla arbitraria.

---

### User Story 3 - Limpieza posterior a la validación humana (Priority: P3)

Después de que una persona valide el panel unificado, el equipo aprueba (o rechaza) la
eliminación de los dashboards de demostración y de los componentes que quedaron sin uso. Esta
limpieza queda registrada como tarea explícita, bloqueada hasta obtener esa aprobación, y no se
ejecuta como parte de la integración inicial.

**Why this priority**: Lo pidió el usuario de forma explícita: primero integrar todo, y solo tras
la validación humana proceder con la eliminación. Es valiosa (reduce código muerto) pero no puede
adelantarse.

**Independent Test**: Verificar que en el plan de tareas de la feature existe una tarea de
limpieza claramente marcada como bloqueada por validación humana, y que la integración inicial no
elimina ninguna página ni componente existente.

**Acceptance Scenarios**:

1. **Given** la integración inicial completada, **When** se revisan las rutas
   `/dashboard/crm`, `/dashboard/finance`, `/dashboard/analytics` y `/dashboard/academy`,
   **Then** siguen existiendo y funcionando (no se eliminó nada todavía).
2. **Given** el plan de tareas de la feature, **When** se busca la fase de limpieza, **Then**
   existe una tarea explícita de eliminación de dashboards y componentes no usados, marcada como
   pendiente de aprobación humana.
3. **Given** la aprobación humana otorgada, **When** se ejecuta la tarea de limpieza, **Then**
   se eliminan los dashboards demo y componentes sin uso sin romper el panel unificado ni la
   navegación restante.

---

### Edge Cases

- ¿Qué ocurre si dos widgets importados tienen títulos o contenidos duplicados con los ya
  existentes en el panel (p. ej. «Upcoming Events» de Academy frente al calendario actual del
  panel)? Deben convivir con títulos que los distingan o integrarse sin ambigüedad.
- ¿Qué ocurre en viewports muy estrechos con widgets densos en datos (tablas de oportunidades,
  gráficas de gasto)? No debe haber desbordamiento horizontal ni contenido inaccesible.
- ¿Qué ocurre con los enlaces o acciones internas de los widgets importados que apuntaban a
  secciones de su dashboard de origen? No deben producir enlaces rotos tras la limpieza.
- ¿Qué ocurre si la eliminación posterior borra un componente compartido que el panel unificado
  todavía usa? La tarea de limpieza debe verificar dependencias antes de borrar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El panel `/dashboard` DEBE mostrar, además de su contenido actual, los widgets de
  CRM «Upcoming Meetings», «Monthly Proposal Goal» y «Recent Opportunities».
- **FR-002**: El panel `/dashboard` DEBE mostrar los widgets de Finance «Spending Overview»,
  «Account Allocation» y «Shortcuts».
- **FR-003**: El panel `/dashboard` DEBE mostrar el widget de Analytics «Traffic Sources».
- **FR-004**: El panel `/dashboard` DEBE mostrar los highlights de Academy (Students Taught,
  Avg. Attendance, Assignments, Classes Today) y los widgets «Class Schedule», «Assignment
  Status», «Performance Highlights» y «Upcoming Events».
- **FR-005**: El contenido preexistente del panel `/dashboard` DEBE conservarse funcional tras la
  integración; la incorporación de widgets no puede degradar ni eliminar lo que ya existe.
- **FR-006**: Los textos visibles de los widgets integrados DEBEN presentarse en español, con
  ortografía y acentuación correctas, conforme a la constitución del proyecto.
- **FR-007**: Los widgets integrados DEBEN respetar el tema claro/oscuro activo y la disposición
  responsive del panel en móvil, tablet y escritorio.
- **FR-008**: La integración inicial NO DEBE eliminar los dashboards de origen
  (`/dashboard/crm`, `/dashboard/finance`, `/dashboard/analytics`, `/dashboard/academy`) ni sus
  componentes; deben permanecer operativos hasta la validación humana.
- **FR-009**: El plan de la feature DEBE incluir una tarea explícita de limpieza (eliminación de
  dashboards demo y componentes sin uso) condicionada a la aprobación humana del panel unificado.
- **FR-010**: La tarea de limpieza, cuando se apruebe y ejecute, DEBE eliminar solo elementos sin
  uso verificado (incluida su entrada en la navegación lateral, si aplica) y DEBE dejar el panel
  unificado y la navegación restante plenamente funcionales.

### Key Entities

- **Widget del panel**: bloque visual autocontenido con un título y un conjunto de datos de
  demostración (métricas, listas, gráficas). Proviene de uno de los cuatro dashboards de origen y
  pasa a formar parte del panel unificado.
- **Dashboard de origen**: cada una de las vistas demo (CRM, Finance, Analytics, Academy) de las
  que se extraen widgets; candidatas a eliminación tras la validación humana.
- **Tarea de limpieza**: registro en el plan de trabajo que agrupa la eliminación de dashboards y
  componentes sin uso, con estado «bloqueada por validación humana» hasta su aprobación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los 12 widgets listados es visible y funcional en `/dashboard` en una
  sola visita, sin necesidad de navegar a otra ruta.
- **SC-002**: Un usuario puede localizar cualquiera de los widgets integrados en el panel en
  menos de 15 segundos gracias a la agrupación temática.
- **SC-003**: El panel unificado se muestra sin desbordamientos ni bloques rotos en los tres
  rangos de viewport (móvil, tablet, escritorio) y en ambos temas (claro y oscuro).
- **SC-004**: El 100 % de los textos visibles de los widgets integrados está en español.
- **SC-005**: Tras la integración inicial, las cuatro rutas de dashboards de origen siguen
  respondiendo correctamente (0 rutas rotas antes de la validación humana).
- **SC-006**: Tras ejecutar la limpieza aprobada, no queda ningún componente huérfano de los
  dashboards eliminados referenciado por el panel ni por la navegación (0 referencias rotas).

## Assumptions

- Los widgets importados conservan por ahora sus **datos de demostración** (estáticos); conectar
  cada widget a datos reales del producto queda fuera del alcance de esta feature y se abordará
  cuando exista el modelo de datos correspondiente en el roadmap.
- El contenido actual de `/dashboard` (saludo, resumen, tareas, proyectos, calendario, notas)
  se mantiene como base; los widgets importados se suman a él, no lo sustituyen.
- La disposición exacta (orden y agrupación de los widgets) es una decisión de diseño de la fase
  de plan; la spec solo exige agrupación temática comprensible y responsive.
- La «validación humana» la realiza el propietario del proyecto revisando el panel unificado en
  ejecución; no se requiere un flujo formal de aprobación dentro de la aplicación.
- Los widgets de CRM «Upcoming Meetings» y «Monthly Proposal Goal» hoy conviven en un mismo
  bloque de la vista de origen; pueden importarse juntos o por separado siempre que ambos sean
  visibles en el panel.
- La eliminación posterior abarca los cuatro dashboards de origen citados y sus componentes sin
  uso; otros demos heredados de la plantilla (invoice, kanban demo, etc.) no forman parte de esta
  feature salvo decisión explícita durante la validación.
