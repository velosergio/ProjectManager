# Feature Specification: Equipo de trabajo y Notas

**Feature Branch**: `007-team-notes`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "FASE 4 — Equipo de trabajo y Notas: gestionar los miembros y equipos de la organización (invitar y dar de alta miembros, asignar y cambiar roles admin/manager/member/viewer, estados activo/invitado/inactivo, CRUD de equipos, desactivar o revocar acceso, respetar cuota de usuarios por plan, carga por usuario) y centralizar notas con alcance contextual único (global, proyecto, tarea o equipo) con CRUD, filtro por alcance, búsqueda, notas en vistas de detalle, widget «Notas recientes» con datos reales, acción rápida «Nueva nota» operativa y permisos por rol."

## Clarifications

### Session 2026-07-03

- Q: ¿Cómo se dan de alta los nuevos miembros de la organización? → A: Solo por invitación con
  enlace de activación (el invitado define su contraseña); si el correo no está configurado, el
  sistema muestra el enlace al administrador para compartirlo manualmente. Sin alta directa.
- Q: ¿Quién puede ver las notas con alcance «equipo»? → A: Toda la organización; el alcance
  organiza y filtra las notas por contexto, pero no restringe su lectura.
- Q: ¿Quién puede editar y eliminar una nota? → A: El autor edita y elimina sus propias notas;
  administradores y gestores pueden editar o eliminar cualquier nota de la organización.
- Q: ¿Dónde vive la gestión de miembros, equipos y notas en la interfaz? → A: La gestión de
  miembros y roles se integra en los ajustes de la organización; equipos y notas son secciones
  dedicadas de la navegación principal, al estilo de Proyectos y Clientes.
- Q: ¿Qué miembros cuentan para la cuota de usuarios del plan? → A: Activos e invitados; las
  invitaciones pendientes consumen cupo desde que se envían, y los inactivos y las invitaciones
  canceladas o caducadas lo liberan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar los miembros de la organización (Priority: P1)

Como administrador de la organización, quiero invitar a nuevos miembros, asignarles un rol
(administrador, gestor, miembro o lector), ver su estado (activo, invitado, inactivo) y
desactivar o reactivar su acceso, para que mi equipo real pueda trabajar en la plataforma con
los permisos adecuados y sin exceder el límite de usuarios de mi plan.

**Why this priority**: Es la base de toda la fase. Hoy los roles `MANAGER`, `MEMBER` y `VIEWER`
existen en los datos pero no hay ningún flujo para incorporar miembros a una organización: solo
el administrador que se registró puede usarla. Sin miembros no hay equipos que formar ni
colaboración que soportar.

**Independent Test**: Puede probarse de forma aislada invitando a un miembro con un rol,
verificando que aparece en el listado como «invitado», que al aceptar la invitación pasa a
«activo» y puede iniciar sesión, y que al desactivarlo pierde el acceso. Entrega valor por sí
sola: la organización deja de ser de un solo usuario.

**Acceptance Scenarios**:

1. **Given** un administrador autenticado, **When** accede a la gestión de miembros en los
   ajustes de la organización, **Then** ve el listado de miembros con nombre, email, rol y
   estado.
2. **Given** el formulario de invitación, **When** el administrador ingresa un email válido y un
   rol y envía la invitación, **Then** el miembro aparece en el listado con estado «invitado» y
   recibe un enlace de activación.
3. **Given** una persona con una invitación vigente, **When** abre el enlace y define su
   contraseña, **Then** su cuenta queda activa, puede iniciar sesión y su estado pasa a «activo».
4. **Given** un email ya registrado en la organización, **When** el administrador intenta
   invitarlo de nuevo, **Then** el sistema muestra un mensaje claro y no crea un duplicado.
5. **Given** una organización que alcanzó la cuota de usuarios de su plan, **When** el
   administrador intenta invitar a alguien más, **Then** el sistema bloquea la invitación e
   indica el límite del plan vigente y cómo ampliarlo.
6. **Given** un miembro activo, **When** el administrador le cambia el rol, **Then** los permisos
   del miembro se actualizan y el cambio se refleja en el listado.
7. **Given** un miembro activo, **When** el administrador lo desactiva, **Then** el miembro no
   puede iniciar sesión ni continuar usando la aplicación, y sus tareas y proyectos asignados
   permanecen intactos.
8. **Given** una organización con un único administrador activo, **When** intenta desactivarse o
   degradarse a sí mismo (o alguien intenta hacerlo), **Then** el sistema lo impide y explica que
   debe existir al menos un administrador activo.
9. **Given** dos organizaciones distintas, **When** un administrador de la organización A consulta
   miembros, **Then** nunca ve usuarios de la organización B.

---

### User Story 2 - Organizar equipos de trabajo (Priority: P2)

Como administrador o gestor, quiero crear equipos de trabajo con nombre y descripción, y asignar
o retirar miembros de cada equipo, para reflejar la estructura real de la organización y usarla
como contexto de colaboración (por ejemplo, notas de equipo).

**Why this priority**: Los equipos dan estructura a los miembros incorporados en la historia 1 y
son un alcance requerido por las notas (historia 3). Dependen de que existan miembros, pero no
de las notas.

**Independent Test**: Con varios miembros dados de alta, crear un equipo, asignarle miembros,
editar su nombre y descripción, retirar un miembro y eliminar el equipo, verificando listado y
detalle en cada paso.

**Acceptance Scenarios**:

1. **Given** un administrador o gestor autenticado, **When** crea un equipo con nombre y
   descripción y le asigna miembros, **Then** el equipo aparece en el listado con su número de
   miembros.
2. **Given** un equipo existente, **When** el usuario abre su detalle, **Then** ve nombre,
   descripción y el listado de sus miembros con rol y estado.
3. **Given** un equipo existente, **When** un administrador o gestor añade o retira miembros,
   **Then** la composición del equipo se actualiza de inmediato.
4. **Given** un miembro que pertenece a varios equipos, **When** se consulta cada equipo,
   **Then** el miembro aparece en todos ellos sin conflicto.
5. **Given** un equipo con notas asociadas, **When** un administrador o gestor solicita
   eliminarlo, **Then** el sistema pide confirmación advirtiendo cuántas notas se eliminarán con
   él y, al confirmar, elimina el equipo y sus notas.
6. **Given** un formulario de equipo sin nombre, **When** se intenta guardar, **Then** el sistema
   muestra un mensaje de validación en español y no crea el registro.

---

### User Story 3 - Crear y gestionar notas con alcance contextual (Priority: P3)

Como miembro de la organización, quiero crear notas con título y contenido asociadas a un único
alcance (global, proyecto, tarea o equipo), listarlas, filtrarlas por alcance y buscarlas por
título o contenido, para centralizar el conocimiento del trabajo donde corresponde.

**Why this priority**: Es el segundo pilar de la fase. Aporta valor incluso solo con los alcances
global, proyecto y tarea (que no dependen de equipos), y habilita las historias 4 y 5.

**Independent Test**: Crear notas en cada alcance, verificar que cada una exige la referencia
correcta (proyecto, tarea o equipo, o ninguna si es global), filtrar el listado por alcance,
buscar por texto del título y del contenido, editar y eliminar según permisos del rol.

**Acceptance Scenarios**:

1. **Given** un miembro autenticado con rol distinto de lector, **When** crea una nota global con
   título y contenido, **Then** la nota queda registrada con autor y fecha de creación y es
   visible para toda la organización.
2. **Given** el formulario de nota con alcance «proyecto», **When** el usuario no selecciona un
   proyecto, **Then** el sistema muestra un mensaje de validación y no guarda la nota.
3. **Given** una nota existente de otro autor, **When** un miembro con rol «member» intenta
   editarla o eliminarla, **Then** el sistema lo impide; **When** lo intenta un administrador o
   gestor, **Then** puede hacerlo.
4. **Given** un usuario con rol lector, **When** accede a las notas, **Then** puede leer las
   notas de su organización pero no crear, editar ni eliminar.
5. **Given** notas en varios alcances, **When** el usuario filtra el listado por «equipo»,
   **Then** ve las notas de equipo de la organización con indicación del equipo al que pertenece
   cada una.
6. **Given** notas con distintos títulos y contenidos, **When** el usuario busca un término,
   **Then** el listado muestra las notas cuyo título o contenido contiene el término.
7. **Given** una nota editada, **When** cualquier usuario con acceso la consulta, **Then** ve el
   autor y la fecha de última edición actualizada.
8. **Given** una nota de equipo, **When** la consulta un miembro que no pertenece a ese equipo,
   **Then** puede leerla, pero editarla o eliminarla sigue sujeto a los permisos por rol.

---

### User Story 4 - Notas en el contexto de trabajo (Priority: P4)

Como miembro de la organización, quiero ver y crear notas directamente desde la vista de detalle
de un proyecto, de una tarea o de un equipo, para consultar y dejar contexto sin salir de donde
estoy trabajando.

**Why this priority**: Multiplica el valor de las notas (historia 3) integrándolas en los flujos
existentes de proyectos y tareas, pero requiere que el CRUD de notas ya funcione.

**Independent Test**: Abrir el detalle de un proyecto con notas asociadas y verificar que solo se
muestran las de ese proyecto; crear una nota desde esa vista y comprobar que queda vinculada
automáticamente al proyecto. Repetir con una tarea y con un equipo.

**Acceptance Scenarios**:

1. **Given** un proyecto con notas propias y otras notas ajenas en la organización, **When** el
   usuario abre el detalle del proyecto, **Then** ve únicamente las notas de ese proyecto.
2. **Given** la vista de detalle de una tarea, **When** el usuario crea una nota desde allí,
   **Then** la nota queda vinculada a esa tarea sin que el usuario tenga que seleccionar el
   alcance manualmente.
3. **Given** un equipo con notas, **When** un miembro del equipo abre su detalle, **Then** ve las
   notas del equipo ordenadas de la más reciente a la más antigua.
4. **Given** un proyecto o una tarea que se elimina, **When** se confirma la eliminación,
   **Then** el sistema advierte que sus notas asociadas se eliminarán con él y así ocurre.

---

### User Story 5 - Panel con notas reales y acción rápida (Priority: P5)

Como usuario del panel principal, quiero que el widget «Notas recientes» muestre mis notas
reales más recientes y que la acción rápida «Nueva nota» abra la creación de una nota operativa,
para que el panel refleje mi trabajo real en lugar de contenido de demostración.

**Why this priority**: Cierra los placeholders de demo del panel (spec 004) y da visibilidad
diaria a las notas, pero depende por completo de que el CRUD de notas (historia 3) exista.

**Independent Test**: Con notas creadas en la organización, abrir el panel y verificar que el
widget muestra las más recientes de la organización con enlace a cada una; pulsar «Nueva
nota», crear una nota y comprobar que aparece en el widget.

**Acceptance Scenarios**:

1. **Given** un usuario cuya organización tiene notas, **When** abre el panel, **Then** el
   widget «Notas recientes» muestra las más recientes de la organización, sin contenido de
   demostración.
2. **Given** una organización sin notas, **When** el usuario abre el panel, **Then** el widget
   muestra un estado vacío con invitación a crear la primera nota.
3. **Given** el panel principal, **When** el usuario pulsa la acción rápida «Nueva nota»,
   **Then** se abre el formulario de creación de nota y, al guardar, la nota queda registrada y
   visible en el widget.
4. **Given** una nota listada en el widget, **When** el usuario la selecciona, **Then** navega a
   la nota en su contexto (listado o detalle correspondiente).

---

### User Story 6 - Consultar la carga de trabajo por miembro (Priority: P6)

Como administrador o gestor, quiero ver cuántas tareas y proyectos tiene asignados cada miembro,
para repartir el trabajo con criterio y detectar sobrecargas.

**Why this priority**: Es información derivada que alimenta el dashboard ejecutivo (FASE 7);
aporta valor de gestión pero no bloquea ninguna otra historia de la fase.

**Independent Test**: Asignar tareas y proyectos a varios miembros y verificar que el listado de
miembros muestra los conteos correctos por miembro, incluyendo cero para quienes no tienen
asignaciones.

**Acceptance Scenarios**:

1. **Given** miembros con tareas y proyectos asignados, **When** un administrador o gestor
   consulta el listado de miembros, **Then** ve por cada miembro el número de tareas y de
   proyectos activos que tiene asignados.
2. **Given** un miembro sin asignaciones, **When** se consulta su carga, **Then** se muestran
   conteos en cero, sin errores.

---

### Edge Cases

- **Último administrador**: no se puede desactivar ni cambiar de rol al único administrador
  activo de la organización; el sistema lo explica en el mensaje de error.
- **Invitación caducada**: el enlace de invitación expira; al usarlo caducado, la persona ve un
  mensaje claro y el administrador puede reenviar la invitación (se genera un nuevo enlace y el
  anterior queda invalidado).
- **Email ya registrado en otra organización**: el sistema informa que ese email no está
  disponible, sin revelar a qué organización pertenece.
- **Cuota alcanzada con invitaciones pendientes**: los miembros invitados cuentan para la cuota;
  desactivar un miembro o cancelar una invitación libera cupo.
- **Miembro desactivado con trabajo asignado**: sus tareas y proyectos asignados se conservan y
  siguen mostrando su nombre; puede reasignarse el trabajo manualmente.
- **Sesión de un miembro recién desactivado**: cualquier acción posterior a la desactivación es
  rechazada y se le cierra la sesión.
- **Miembro retirado de un equipo**: las notas del equipo siguen siendo legibles para él (la
  lectura es organizacional) y las que él escribió permanecen en el equipo; solo pierde la
  pertenencia.
- **Eliminación de contexto**: al eliminar un proyecto, una tarea o un equipo, sus notas
  asociadas se eliminan con él, previa advertencia con el número de notas afectadas.
- **Nota con referencia inconsistente**: el sistema rechaza notas con más de una referencia o con
  alcance que no corresponde a la referencia enviada.
- **Búsqueda sin resultados**: el listado de notas muestra un estado vacío con el término buscado
  y opción de limpiar el filtro.
- **Rol lector**: cualquier intento directo de crear, editar o eliminar (aunque manipule la
  interfaz o las peticiones) es rechazado por el sistema.
- **Super usuario global**: el rol `mango` puede consultar miembros, equipos y notas de cualquier
  organización desde su consola, sin mezclarse los datos entre organizaciones.

## Requirements *(mandatory)*

### Functional Requirements

#### Miembros

- **FR-001**: El sistema DEBE mostrar a los administradores, desde los ajustes de la
  organización, el listado de miembros con nombre, email, rol y estado (activo · invitado ·
  inactivo).
- **FR-002**: Los administradores DEBEN poder invitar a nuevos miembros indicando email y rol
  (`admin` · `manager` · `member` · `viewer`); la invitación crea al miembro en estado
  «invitado» y genera un enlace de activación de un solo uso con caducidad.
- **FR-003**: Una persona invitada DEBE poder activar su cuenta desde el enlace de invitación
  definiendo su nombre y contraseña; al hacerlo su estado pasa a «activo» y puede iniciar sesión.
- **FR-004**: El sistema DEBE impedir invitar un email ya registrado en la plataforma, con un
  mensaje claro y sin revelar información de otras organizaciones.
- **FR-005**: Los administradores DEBEN poder reenviar una invitación pendiente (invalida el
  enlace anterior) y cancelarla (elimina al miembro invitado y libera cupo).
- **FR-006**: Los administradores DEBEN poder cambiar el rol de cualquier miembro de su
  organización, excepto el suyo propio.
- **FR-007**: Los administradores DEBEN poder desactivar y reactivar miembros; un miembro
  inactivo no puede iniciar sesión y sus sesiones vigentes quedan revocadas en la siguiente
  interacción.
- **FR-008**: El sistema DEBE impedir desactivar o degradar al último administrador activo de la
  organización.
- **FR-009**: El sistema DEBE respetar la cuota de usuarios del plan vigente: si los miembros
  activos e invitados alcanzan el límite, bloquea nuevas invitaciones indicando el límite y el
  plan.
- **FR-010**: La desactivación de un miembro DEBE conservar intactos sus proyectos, tareas y
  notas; el trabajo asignado sigue mostrando su nombre y puede reasignarse.
- **FR-011**: El sistema DEBE mostrar por miembro su carga de trabajo: número de tareas activas y
  de proyectos activos asignados.

#### Equipos

- **FR-012**: Los administradores y gestores DEBEN poder crear, consultar, editar y eliminar
  equipos de trabajo con nombre (obligatorio) y descripción (opcional).
- **FR-013**: Los administradores y gestores DEBEN poder asignar y retirar miembros de un equipo;
  un miembro puede pertenecer a varios equipos.
- **FR-014**: El sistema DEBE mostrar el listado de equipos con su número de miembros y una vista
  de detalle con la composición del equipo y sus notas.
- **FR-015**: La eliminación de un equipo DEBE pedir confirmación, advertir cuántas notas de
  equipo se eliminarán con él y, al confirmar, eliminar equipo y notas asociadas.

#### Notas

- **FR-016**: Los usuarios con rol distinto de lector DEBEN poder crear notas con título,
  contenido y un único alcance: global, proyecto, tarea o equipo.
- **FR-017**: El sistema DEBE exigir la referencia correspondiente al alcance elegido (proyecto,
  tarea o equipo; ninguna si es global) y rechazar combinaciones inconsistentes.
- **FR-018**: Cada nota DEBE registrar autor, fecha de creación y fecha de última edición,
  visibles al consultarla.
- **FR-019**: Los permisos de notas DEBEN aplicarse por rol: el autor edita y elimina sus propias
  notas; administradores y gestores editan y eliminan cualquier nota de la organización; los
  lectores solo leen.
- **FR-020**: Todas las notas DEBEN ser legibles por cualquier miembro de la organización,
  independientemente de su alcance; el alcance determina el contexto donde se muestran y cómo se
  filtran, no restringe la lectura.
- **FR-021**: El sistema DEBE ofrecer un listado central de notas con filtro por alcance y
  búsqueda por título y contenido.
- **FR-022**: Las vistas de detalle de proyecto, tarea y equipo DEBEN mostrar las notas de ese
  contexto y permitir crear una nota vinculada automáticamente a él.
- **FR-023**: Al eliminar un proyecto, una tarea o un equipo, el sistema DEBE eliminar sus notas
  asociadas, advirtiéndolo en la confirmación.

#### Panel

- **FR-024**: El widget «Notas recientes» del panel DEBE mostrar las notas reales más recientes
  de la organización, con enlace a cada una, y un estado vacío cuando no haya notas; desaparece
  todo contenido de demostración.
- **FR-025**: La acción rápida «Nueva nota» del panel DEBE abrir el formulario de creación de
  nota y dejarla registrada al guardar.

#### Transversales

- **FR-026**: Todos los datos de miembros, equipos y notas DEBEN quedar aislados por
  organización: ningún usuario ve ni modifica datos de otra organización.
- **FR-027**: El super usuario global (`mango`) DEBE poder consultar miembros, equipos y notas de
  cualquier organización a través de sus herramientas globales.
- **FR-028**: Todos los mensajes de interfaz, validación y error de estos flujos DEBEN estar en
  español, con estados de carga, vacío y error consistentes con el resto de la aplicación.

### Key Entities

- **Miembro**: usuario perteneciente a la organización; atributos clave: nombre, email, rol
  (`admin` · `manager` · `member` · `viewer`), estado (activo · invitado · inactivo). Se
  relaciona con equipos, tareas y proyectos asignados, y es autor de notas.
- **Invitación**: solicitud de alta de un miembro; atributos clave: email, rol propuesto, enlace
  de activación de un solo uso, fecha de caducidad, estado (pendiente · aceptada · cancelada ·
  caducada).
- **Equipo**: agrupación de miembros dentro de la organización; atributos clave: nombre,
  descripción, composición de miembros. Puede ser contexto de notas.
- **Pertenencia a equipo**: relación miembro–equipo; un miembro puede pertenecer a varios
  equipos y un equipo tiene varios miembros.
- **Nota**: apunte con título y contenido; atributos clave: alcance único (global · proyecto ·
  tarea · equipo), referencia según alcance, autor, fecha de creación y de última edición. Su
  ciclo de vida está ligado al del contexto al que pertenece.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador completa la invitación de un nuevo miembro (formulario + envío)
  en menos de 1 minuto, y la persona invitada activa su cuenta en menos de 3 minutos desde que
  abre el enlace.
- **SC-002**: El 100 % de los intentos de exceder la cuota de usuarios del plan quedan
  bloqueados con un mensaje que indica el límite vigente.
- **SC-003**: Un miembro desactivado pierde todo acceso en su siguiente interacción con la
  aplicación (0 acciones efectivas después de la revocación).
- **SC-004**: El 100 % de las consultas de miembros, equipos y notas devuelven exclusivamente
  datos de la organización del usuario (aislamiento verificado por pruebas automatizadas).
- **SC-005**: Un usuario crea una nota desde la acción rápida del panel en menos de 30 segundos
  y la ve reflejada en el widget «Notas recientes» inmediatamente después de guardar.
- **SC-006**: La búsqueda de notas devuelve resultados en menos de 1 segundo con al menos 1 000
  notas en la organización.
- **SC-007**: El panel no muestra ningún contenido de demostración en el widget de notas ni en
  la acción rápida: el 100 % de lo mostrado proviene de datos reales del usuario.
- **SC-008**: El 100 % de los intentos de un rol lector de crear, editar o eliminar (incluso por
  peticiones directas) son rechazados.

## Assumptions

- **Mecanismo de alta**: la única vía de incorporación de miembros es la invitación con enlace de
  activación. Si el envío de correo no está configurado en la instalación, el sistema muestra el
  enlace al administrador para compartirlo manualmente; no hay alta directa con contraseña
  definida por el administrador.
- **Caducidad de invitaciones**: los enlaces de invitación caducan a los 7 días; pueden
  reenviarse, lo que genera un enlace nuevo e invalida el anterior.
- **Cuota de usuarios**: la cuota por plan ya definida en la FASE 1 cuenta miembros activos e
  invitados; los inactivos no consumen cupo. Ningún plan limita el número de equipos ni de notas.
- **Gestión de miembros**: solo los administradores gestionan miembros, roles e invitaciones.
  Los gestores (`manager`) gestionan equipos, pero no miembros ni roles. Todos los roles pueden
  consultar el listado de miembros y equipos de su organización.
- **Ubicación en la interfaz**: la gestión de miembros y roles vive en los ajustes de la
  organización (junto a la configuración existente); equipos y notas son secciones dedicadas de
  la navegación principal, con páginas propias como Proyectos y Clientes.
- **Visibilidad de notas**: todas las notas de la organización son legibles por todos sus
  miembros; el alcance solo contextualiza y filtra. Si en el futuro se restringe el acceso por
  proyecto o equipo, la visibilidad de sus notas podrá revisarse.
- **Contenido de las notas**: texto plano multilínea; el texto enriquecido queda fuera del
  alcance de esta fase.
- **Estado «invitado»**: es un estado nuevo del ciclo de vida del miembro; el detalle de cómo se
  representa junto a los estados existentes se decide en la fase de plan.
- **Convención de datos en cliente**: la convención transversal del ROADMAP sobre obtención y
  mutación de datos en componentes cliente aplica desde esta fase; es una decisión de
  implementación que corresponde al plan, no a esta especificación.
- **Dependencias**: reutiliza la autenticación, el aislamiento multitenant y el gating de planes
  de la FASE 1; los proyectos y tareas de la FASE 2; y sustituye los placeholders del panel de la
  spec 004 (widget «Notas recientes» y acción rápida «Nueva nota»).
