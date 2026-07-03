# Feature Specification: Gestión de Proyectos y Tareas (FASE 2)

**Feature Branch**: `005-project-management`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "FASE 2 — Gestión de Proyectos. Objetivo: núcleo funcional. Campos: nombre cliente, prioridad, tipo proceso, estado, fecha inicio, fecha cierre, responsable, tareas. Funciones: CRUD proyectos, vista detalle, seguimiento, búsqueda, filtros, etiquetas, tareas. Además, dejar funcionales los componentes del panel actual que usan proyectos y tareas."

## Clarifications

### Session 2026-07-02

- Q: ¿Qué datos deben mostrar las secciones «Proyectos» y «Tareas» del panel principal? → A: Mixto: «Proyectos» muestra todos los de la organización; «Tareas» solo las asignadas al usuario actual y las que no tienen responsable.
- Q: ¿Qué puede hacer exactamente un usuario con rol MEMBER sobre proyectos y tareas? → A: Gestiona tareas de cualquier proyecto y puede editar (no eliminar) los proyectos donde es responsable del proyecto o de alguna de sus tareas.
- Q: ¿Cómo debe funcionar la eliminación de proyectos? → A: Eliminación definitiva con confirmación; el estado «Archivado» cubre la retirada no destructiva.
- Q: ¿Cómo se captura el «tipo de proceso» de un proyecto? → A: Catálogo de tipos gestionado por cada organización (no texto libre).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar proyectos de la organización (Priority: P1)

Como miembro de una organización, quiero crear, consultar, editar y eliminar los proyectos de
mi organización, con sus datos clave (cliente, prioridad, tipo de proceso, estado, fechas,
responsable), para que el trabajo real del equipo viva en la plataforma y deje de gestionarse
por fuera.

**Why this priority**: Es el núcleo funcional del producto (objetivo declarado de la FASE 2).
Sin proyectos reales, ninguna otra vista (detalle, panel, Kanban futuro) tiene datos que mostrar.

**Independent Test**: Iniciar sesión con un usuario de un tenant, crear un proyecto con todos
sus campos, verlo en el listado, editarlo, y eliminarlo con confirmación. Verificable de punta
a punta sin ninguna otra historia.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado de una organización, **When** crea un proyecto indicando
   nombre y, opcionalmente, cliente, prioridad, tipo de proceso, estado, fecha de inicio, fecha
   de cierre y responsable, **Then** el proyecto queda guardado y aparece en el listado de
   proyectos de su organización.
2. **Given** un proyecto existente, **When** el usuario edita cualquiera de sus campos,
   **Then** los cambios se persisten y se reflejan de inmediato en el listado y el detalle.
3. **Given** un proyecto existente, **When** el usuario solicita eliminarlo, **Then** el sistema
   pide confirmación explícita, advierte que se eliminarán también sus tareas asociadas y, tras
   confirmar, el proyecto desaparece del listado.
4. **Given** una organización cuyo plan ya alcanzó su cuota de proyectos, **When** un usuario
   intenta crear otro proyecto, **Then** el sistema lo impide y muestra un mensaje claro que
   indica el límite del plan y cómo ampliarlo.
5. **Given** dos organizaciones distintas con proyectos propios, **When** un usuario de la
   primera consulta el listado, **Then** solo ve los proyectos de su organización, nunca los de
   la otra.

---

### User Story 2 - Ver el detalle de un proyecto y gestionar sus tareas (Priority: P1)

Como miembro del equipo, quiero abrir un proyecto y ver toda su información junto con sus
tareas, y poder crear, editar, completar, asignar y eliminar tareas, para coordinar el trabajo
diario dentro de cada proyecto.

**Why this priority**: El detalle con tareas es la otra mitad del núcleo funcional: un proyecto
sin tareas operables no permite gestionar trabajo. Junto con la US1 constituye el MVP.

**Independent Test**: Con un proyecto creado (puede sembrarse), abrir su vista de detalle,
crear varias tareas, cambiarles el estado, asignar una a un usuario, ponerle fecha límite y
eliminarla. Todo verificable dentro de la vista de detalle.

**Acceptance Scenarios**:

1. **Given** un proyecto con datos completos, **When** el usuario abre su vista de detalle,
   **Then** ve el nombre, cliente, prioridad, tipo de proceso, estado, fechas, responsable,
   etiquetas, el avance del proyecto y la lista de sus tareas.
2. **Given** la vista de detalle, **When** el usuario crea una tarea con título y, opcionalmente,
   descripción, responsable y fecha límite, **Then** la tarea aparece en la lista del proyecto
   con estado inicial «Pendiente».
3. **Given** una tarea existente, **When** el usuario cambia su estado (pendiente → en proceso →
   finalizada) o la marca como completada, **Then** el cambio se persiste y el avance del
   proyecto se actualiza en consecuencia.
4. **Given** una tarea con responsable asignado, **When** se consulta la tarea, **Then** se
   muestra el nombre del usuario asignado, que debe pertenecer a la misma organización.
5. **Given** un proyecto sin tareas, **When** se abre el detalle, **Then** se muestra un estado
   vacío claro que invita a crear la primera tarea.

---

### User Story 3 - Panel con datos reales de proyectos y tareas (Priority: P2)

Como usuario, quiero que el panel principal (`/dashboard`) muestre mis proyectos y tareas
reales — no datos de ejemplo — para tener una foto fiel de mi trabajo al iniciar sesión.

**Why this priority**: El panel ya existe visualmente pero engaña: muestra datos estáticos.
Conectarlo a datos reales convierte la página de inicio en una herramienta útil. Depende de que
existan proyectos y tareas (US1/US2).

**Independent Test**: Con proyectos y tareas creados, abrir `/dashboard` y verificar que las
secciones «Proyectos», «Tareas» y las tarjetas de resumen reflejan los datos reales del tenant;
con una cuenta recién creada, verificar los estados vacíos.

**Acceptance Scenarios**:

1. **Given** una organización con proyectos activos, **When** el usuario abre el panel,
   **Then** la sección «Proyectos» muestra todos los proyectos reales de la organización con
   estado, avance y fecha de cierre, y el filtro por estado funciona sobre datos reales.
2. **Given** tareas con fechas límite, **When** el usuario abre el panel, **Then** la sección
   «Tareas» lista las tareas reales asignadas al usuario actual (o sin responsable) según el
   filtro temporal (hoy / mañana / esta semana), y al marcar una como completada el cambio se
   persiste.
3. **Given** actividad real del tenant, **When** el usuario abre el panel, **Then** las tarjetas
   de resumen muestran cifras derivadas de datos reales (p. ej. tareas de hoy, progreso de la
   semana) en lugar de valores fijos.
4. **Given** una organización sin proyectos ni tareas, **When** el usuario abre el panel,
   **Then** cada sección muestra un estado vacío con una acción clara para crear el primer
   proyecto o la primera tarea (sin errores ni datos de ejemplo).
5. **Given** los botones «Nuevo» y «Nueva tarea» del panel, **When** el usuario los pulsa,
   **Then** conducen a la creación real de un proyecto o una tarea.

---

### User Story 4 - Buscar, filtrar y etiquetar proyectos (Priority: P3)

Como usuario con muchos proyectos, quiero buscarlos por texto, filtrarlos por estado,
prioridad, responsable, cliente o etiqueta, y organizar los proyectos con etiquetas propias,
para encontrar rápidamente lo que necesito.

**Why this priority**: Multiplica la utilidad del listado cuando crece el volumen, pero el CRUD
y el detalle funcionan sin ello. Es una capa de productividad sobre el MVP.

**Independent Test**: Con varios proyectos de distintos estados, prioridades y responsables,
usar la búsqueda por nombre/cliente y combinar filtros; crear etiquetas, asignarlas a proyectos
y filtrar por etiqueta.

**Acceptance Scenarios**:

1. **Given** varios proyectos, **When** el usuario escribe en el buscador parte del nombre del
   proyecto o del cliente, **Then** el listado se reduce a los proyectos coincidentes.
2. **Given** proyectos con distintos estados y prioridades, **When** el usuario aplica filtros
   combinados (p. ej. estado «En proceso» + prioridad «Alta»), **Then** solo se muestran los
   proyectos que cumplen todos los filtros activos.
3. **Given** un proyecto, **When** el usuario le asigna una o varias etiquetas (creándolas si no
   existen), **Then** las etiquetas se muestran en el listado y el detalle, y puede filtrarse
   por ellas.
4. **Given** una búsqueda o combinación de filtros sin resultados, **When** se aplica,
   **Then** se muestra un estado vacío que lo indica y permite limpiar los filtros.

---

### Edge Cases

- ¿Qué pasa si el responsable asignado a un proyecto o tarea es desactivado o eliminado de la
  organización? El proyecto/tarea permanece, mostrando el puesto de responsable como «sin
  asignar».
- ¿Qué pasa si se elimina el cliente asociado a un proyecto? El proyecto permanece y el campo
  cliente queda vacío.
- ¿Qué pasa si se elimina un tipo de proceso del catálogo que está en uso? Los proyectos que lo
  usaban quedan «sin tipo»; el resto de sus datos no cambia.
- ¿Qué pasa si la fecha de cierre es anterior a la fecha de inicio? El sistema rechaza el
  guardado con un mensaje de validación claro.
- ¿Qué pasa si dos usuarios editan el mismo proyecto a la vez? Gana la última escritura; los
  listados reflejan el estado más reciente al recargar.
- ¿Qué pasa cuando la cuota de proyectos del plan se alcanza justo entre la apertura del
  formulario y el guardado (condición de carrera)? El guardado se rechaza con el mensaje de
  límite de plan.
- ¿Qué pasa con las tareas cuya fecha límite ya pasó? Se distinguen visualmente como vencidas
  en el detalle y en el panel.
- Un usuario con rol de solo lectura (VIEWER) no ve acciones de crear/editar/eliminar y, si
  intenta ejecutarlas por otra vía, el sistema las rechaza.
- El rol `mango` sin organización propia: al inspeccionar un tenant desde la consola, ve los
  proyectos de ese tenant; sin tenant seleccionado, el listado indica que debe seleccionar una
  organización.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear proyectos con los campos: nombre (obligatorio),
  cliente, prioridad, tipo de proceso (elegido del catálogo de la organización), estado, fecha
  de inicio, fecha de cierre estimada, responsable, etiquetas y descripción (todos opcionales
  salvo el nombre).
- **FR-002**: El sistema DEBE permitir listar, editar y eliminar proyectos de la organización
  del usuario. La eliminación DEBE requerir confirmación explícita e informar que las tareas
  asociadas se eliminan con el proyecto.
- **FR-003**: Todos los proyectos, tareas y etiquetas DEBEN quedar aislados por organización:
  ningún usuario puede ver ni modificar datos de una organización distinta a la suya. El rol
  `mango` accede según el mecanismo global ya existente (consola con selector de organización).
- **FR-004**: La creación de proyectos DEBE respetar la cuota del plan de la organización;
  al alcanzarla, el sistema DEBE impedir la creación y comunicar el límite y la vía de
  ampliación, incluso ante intentos concurrentes.
- **FR-005**: Los proyectos DEBEN manejar un conjunto cerrado de estados: Pendiente, En
  proceso, En revisión, Finalizado y Archivado (alineado con el tablero Kanban de la FASE 3).
- **FR-006**: Los proyectos DEBEN manejar un conjunto cerrado de prioridades: Baja, Media,
  Alta y Urgente.
- **FR-007**: El sistema DEBE validar que la fecha de cierre no sea anterior a la fecha de
  inicio y comunicar los errores de validación en mensajes claros en español.
- **FR-008**: Cada proyecto DEBE tener una vista de detalle que muestre todos sus campos, sus
  etiquetas, su avance (porcentaje de tareas finalizadas) y la lista de sus tareas.
- **FR-009**: El sistema DEBE permitir crear, editar, completar y eliminar tareas dentro de un
  proyecto, con: título (obligatorio), descripción, estado (Pendiente / En proceso /
  Finalizada), responsable (usuario de la misma organización) y fecha límite.
- **FR-010**: El avance del proyecto DEBE calcularse a partir de sus tareas (proporción de
  tareas finalizadas) y actualizarse al cambiar el estado de cualquier tarea.
- **FR-011**: El responsable de un proyecto y el de una tarea DEBEN ser usuarios activos de la
  misma organización; si el usuario deja de estar disponible, el dato se conserva como «sin
  asignar» sin romper el proyecto ni la tarea.
- **FR-012**: El listado de proyectos DEBE ofrecer búsqueda por texto (nombre del proyecto y
  nombre del cliente) y filtros combinables por estado, prioridad, responsable, cliente, tipo
  de proceso y etiqueta, con un estado vacío claro cuando no hay resultados.
- **FR-013**: El sistema DEBE permitir gestionar etiquetas propias de la organización
  (crear al vuelo, renombrar, eliminar) y asignar varias etiquetas a un proyecto.
- **FR-014**: La sección «Proyectos» del panel DEBE mostrar todos los proyectos reales de la
  organización (estado, avance, fecha de cierre) con su filtro por estado operativo, y su
  acción «Nuevo» DEBE conducir a la creación real de un proyecto.
- **FR-015**: La sección «Tareas» del panel DEBE mostrar las tareas reales asignadas al
  usuario actual o sin responsable, según el filtro temporal (hoy / mañana / esta semana),
  permitir marcarlas como completadas con persistencia real, y su acción «Nueva tarea» DEBE
  conducir a la creación real de una tarea.
- **FR-016**: Las tarjetas de resumen del panel DEBEN calcular sus cifras a partir de datos
  reales (al menos: tareas de hoy y progreso semanal de tareas finalizadas, con el mismo
  alcance personal que la sección «Tareas»), eliminando los valores fijos de demostración.
- **FR-017**: Panel, listado y detalle DEBEN presentar estados vacíos accionables cuando la
  organización aún no tiene proyectos o tareas, y estados de carga y de error coherentes con el
  sistema de diseño existente.
- **FR-018**: Los permisos DEBEN aplicarse por rol: los roles con capacidad de gestión
  (ADMIN, MANAGER) crean/editan/eliminan proyectos y tareas; MEMBER gestiona tareas de
  cualquier proyecto y puede editar (no eliminar) los proyectos donde es responsable del
  proyecto o de alguna de sus tareas; VIEWER solo consulta. Las acciones no permitidas no se
  ofrecen en la interfaz y se rechazan si se invocan por otra vía.
- **FR-019**: Las tareas con fecha límite vencida y estado no finalizado DEBEN distinguirse
  visualmente en el detalle del proyecto y en el panel.
- **FR-020**: Toda la interfaz de esta feature DEBE estar en español y mantener el soporte de
  tema claro/oscuro y la accesibilidad (operable por teclado) del resto del producto.
- **FR-021**: El sistema DEBE permitir a los roles de gestión (ADMIN, MANAGER) mantener el
  catálogo de tipos de proceso de su organización (crear —también al vuelo desde el formulario
  de proyecto—, renombrar y eliminar tipos). Cada proyecto referencia como máximo un tipo; al
  eliminar un tipo en uso, los proyectos afectados quedan «sin tipo» sin perder ningún otro
  dato.

### Key Entities

- **Proyecto**: unidad principal de trabajo de una organización. Atributos: nombre,
  descripción, cliente asociado, prioridad, tipo de proceso, estado, fecha de inicio, fecha de
  cierre estimada, responsable, etiquetas, avance derivado de sus tareas. Pertenece a una
  organización (tenant).
- **Tarea**: unidad de trabajo dentro de un proyecto. Atributos: título, descripción, estado,
  responsable, fecha límite. Pertenece a un proyecto y a la misma organización.
- **Etiqueta**: rótulo definido por la organización para clasificar proyectos. Atributos:
  nombre (único dentro de la organización). Relación muchos-a-muchos con proyectos.
- **Tipo de proceso**: categoría del catálogo propio de cada organización para clasificar
  proyectos. Atributos: nombre (único dentro de la organización). Un proyecto referencia como
  máximo un tipo; lo gestionan los roles de gestión (ADMIN, MANAGER).
- **Cliente**: contacto/empresa para quien se ejecuta un proyecto (ya existe en el sistema);
  un proyecto referencia como máximo un cliente.
- **Responsable**: usuario de la organización asignado a un proyecto o tarea (ya existe como
  usuario del sistema).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear un proyecto completo (todos los campos) en menos de
  2 minutos desde el listado, sin instrucciones previas.
- **SC-002**: Un usuario puede crear una tarea dentro de un proyecto en menos de 30 segundos
  desde la vista de detalle.
- **SC-003**: El 100 % de los datos de proyectos y tareas visibles en el panel, el listado y el
  detalle proviene de datos reales de la organización; no queda ningún dato de demostración en
  las secciones «Proyectos», «Tareas» ni en las tarjetas de resumen del panel.
- **SC-004**: En pruebas de aislamiento, 0 registros de una organización resultan visibles o
  modificables desde otra organización.
- **SC-005**: Con 200 proyectos en una organización, la búsqueda y los filtros devuelven
  resultados percibidos como inmediatos (menos de 1 segundo) y el listado permanece navegable
  (paginado o equivalente).
- **SC-006**: Al alcanzar la cuota de proyectos del plan, el 100 % de los intentos de creación
  (incluidos concurrentes) se rechazan con un mensaje que menciona el límite del plan.
- **SC-007**: Una cuenta recién creada (sin datos) ve estados vacíos accionables en panel,
  listado y detalle, sin errores visibles ni cifras inventadas.
- **SC-008**: Marcar una tarea como completada desde el panel o el detalle actualiza el avance
  del proyecto sin recargar manualmente la página.

## Assumptions

- **Alcance de organizaciones y planes**: la infraestructura multitenant, las cuotas por plan
  (incluida la cuota de proyectos) y los roles ya existen (FASE 1) y esta feature los consume,
  no los redefine.
- **Eliminación definitiva con confirmación**: en esta fase la eliminación de proyectos es
  definitiva (con confirmación y aviso de arrastre de tareas). El estado «Archivado» cubre el
  caso de retirar un proyecto de la operación sin perder datos; los flujos avanzados de
  archivado/restauración se tratarán con el Kanban (FASE 3).
- **Catálogo de tipos de proceso**: cada organización parte con el catálogo vacío y crea sus
  tipos (p. ej. «Ordinario laboral», «Consultoría») desde la gestión del catálogo o al vuelo en
  el formulario de proyecto (decidido en la clarificación del 2026-07-02).
- **Etiquetas solo para proyectos**: el roadmap las lista entre las funciones de proyectos;
  etiquetar tareas queda fuera del alcance de esta fase.
- **Tareas agrupadas de forma simple**: cada tarea pertenece a un proyecto; la agrupación
  interna del trabajo (procesos/listas dentro del proyecto) existe en el modelo de datos y se
  usa de forma transparente (una lista por defecto por proyecto), sin interfaz propia en esta
  fase — su gestión visual llega con el Kanban (FASE 3).
- **Estados de tarea**: se usan los tres estados ya definidos (Pendiente, En proceso,
  Finalizada); los estados adicionales del tablero («En revisión», «Archivado») se incorporan
  en la FASE 3.
- **Sin notificaciones ni recordatorios**: los avisos por vencimiento corresponden a la FASE 7;
  aquí solo hay distinción visual de tareas vencidas.
- **Volumen esperado**: organizaciones de decenas a pocos cientos de proyectos y hasta unos
  miles de tareas; el listado se pagina o carga de forma incremental para mantener la fluidez.
- **Widgets demo restantes**: las secciones «Negocio», «Finanzas», «Analítica» y «Academia»
  del panel (spec 004) siguen siendo presentacionales y quedan fuera del alcance; esta feature
  solo conecta a datos reales las secciones de proyectos, tareas y tarjetas de resumen.
