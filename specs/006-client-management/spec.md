# Feature Specification: Gestión de Clientes

**Feature Branch**: `006-client-management`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "FASE 3 — Gestión de Clientes: administrar el catálogo de contactos y empresas de la organización. CRUD de clientes (nombre, email, teléfono), vista detalle con seguimiento (proyectos asociados por estado, última actividad), búsqueda, filtros, etiquetas (ampliando el esquema actual que solo asocia proyectos), listado de proyectos asociados y creación al vuelo desde el formulario de proyecto."

## Clarifications

### Session 2026-07-03

- Q: ¿Qué roles pueden gestionar clientes (crear, editar, eliminar)? → A: `ADMIN` y `MANAGER` gestionan; `MEMBER` y `VIEWER` solo consultan listado y detalle.
- Q: ¿Existe una cuota de clientes por plan (Gratuito/Pro/Pro+)? → A: No; ningún plan limita el número de clientes.
- Q: ¿Las etiquetas de clientes usan un catálogo propio o el de proyectos? → A: Catálogo único por organización, compartido entre proyectos y clientes.
- Q: ¿La vista detalle del cliente es una página dedicada o un panel lateral? → A: Página dedicada con URL propia, enlazable desde otras vistas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrar el catálogo de clientes (Priority: P1)

Como administrador de la organización, quiero crear, consultar, editar y eliminar los clientes
de mi organización desde una vista dedicada, para mantener al día el catálogo de contactos y
empresas con los que trabajamos.

**Why this priority**: Es la base de toda la fase. Hoy el registro de clientes existe en los
datos pero no hay ninguna interfaz para gestionarlo: el selector de cliente en proyectos solo
lista registros ya existentes y no hay forma de crearlos ni mantenerlos. Sin el CRUD no hay
catálogo que buscar, filtrar, etiquetar ni detallar.

**Independent Test**: Puede probarse de forma aislada creando un cliente con nombre, email y
teléfono, verificando que aparece en el listado, editando sus datos y eliminándolo. Entrega valor
por sí sola: la organización ya puede mantener su catálogo.

**Acceptance Scenarios**:

1. **Given** un administrador autenticado en su organización, **When** accede a la sección de
   clientes, **Then** ve el listado de clientes de su organización con nombre, email y teléfono.
2. **Given** el formulario de nuevo cliente, **When** el administrador ingresa un nombre y guarda,
   **Then** el cliente se crea, aparece en el listado y se muestra una confirmación.
3. **Given** el formulario de nuevo cliente, **When** el administrador intenta guardar sin nombre
   o con un email con formato inválido, **Then** el sistema muestra un mensaje de validación en
   español y no crea el registro.
4. **Given** un cliente existente, **When** el administrador edita sus datos y guarda, **Then**
   los cambios se reflejan en el listado y en el detalle.
5. **Given** un cliente con proyectos asociados, **When** el administrador solicita eliminarlo,
   **Then** el sistema pide confirmación advirtiendo cuántos proyectos quedarán sin cliente y,
   al confirmar, elimina el cliente dejando los proyectos existentes intactos y sin cliente.
6. **Given** dos organizaciones distintas, **When** un usuario de la organización A consulta el
   listado o el detalle de clientes, **Then** nunca ve clientes de la organización B.

---

### User Story 2 - Vista detalle con seguimiento del cliente (Priority: P2)

Como miembro de la organización, quiero abrir la ficha de un cliente y ver de un vistazo sus
datos de contacto, un resumen de seguimiento (cuántos proyectos tiene en cada estado y cuándo fue
la última actividad) y el listado de sus proyectos asociados con enlace directo a cada uno, para
entender la relación con ese cliente sin recorrer otras vistas.

**Why this priority**: El seguimiento es el valor diferencial de la fase frente a una simple
libreta de contactos: conecta el catálogo con los proyectos ya existentes de la FASE 2. Depende
de que exista el CRUD (P1) para tener clientes que consultar.

**Independent Test**: Con un cliente que tenga proyectos en distintos estados, abrir su detalle y
verificar que el resumen por estado, la última actividad y el listado de proyectos enlazados son
correctos.

**Acceptance Scenarios**:

1. **Given** un cliente con proyectos en varios estados, **When** el usuario abre su detalle,
   **Then** ve los datos de contacto y un resumen con el número de proyectos por estado.
2. **Given** un cliente con actividad reciente en alguno de sus proyectos, **When** el usuario
   abre su detalle, **Then** ve la fecha de última actividad correspondiente al cambio más
   reciente entre el propio cliente y sus proyectos.
3. **Given** el detalle de un cliente con proyectos asociados, **When** el usuario selecciona un
   proyecto del listado, **Then** navega al detalle de ese proyecto.
4. **Given** un cliente sin proyectos asociados, **When** el usuario abre su detalle, **Then** ve
   un estado vacío claro que le indica que aún no hay proyectos vinculados.

---

### User Story 3 - Buscar y filtrar clientes (Priority: P2)

Como miembro de la organización, quiero buscar clientes por su texto (nombre, email o teléfono) y
filtrar el listado (por etiquetas y por si tienen proyectos activos), para encontrar rápidamente
al cliente que necesito aunque el catálogo crezca.

**Why this priority**: Sin búsqueda ni filtros el catálogo deja de ser útil en cuanto supera unas
decenas de registros. Depende del listado (P1) pero es independiente del detalle y las etiquetas.

**Independent Test**: Con varios clientes creados, escribir un término de búsqueda y verificar que
el listado se reduce a las coincidencias; aplicar y quitar filtros y verificar el resultado.

**Acceptance Scenarios**:

1. **Given** un catálogo con varios clientes, **When** el usuario escribe parte de un nombre,
   email o teléfono en la búsqueda, **Then** el listado muestra solo los clientes coincidentes.
2. **Given** una búsqueda sin coincidencias, **When** se muestra el resultado, **Then** aparece un
   estado vacío en español con la opción de limpiar la búsqueda.
3. **Given** filtros aplicados (por etiqueta o por clientes con proyectos activos), **When** el
   usuario combina filtros con la búsqueda, **Then** el listado refleja la intersección de ambos
   criterios y los filtros activos son visibles y removibles.

---

### User Story 4 - Etiquetar clientes (Priority: P3)

Como administrador, quiero asignar etiquetas a los clientes usando el mismo catálogo de etiquetas
de la organización que ya usan los proyectos, para clasificarlos según mis propios criterios
(sector, tipo de relación, prioridad comercial) y poder filtrarlos por ellas.

**Why this priority**: Aporta organización flexible pero no bloquea el uso básico del catálogo.
Requiere ampliar el alcance actual de las etiquetas, que hoy solo se asocian a proyectos.

**Independent Test**: Asignar una etiqueta existente y una nueva a un cliente, verificar que se
muestran en el listado y el detalle, y que el filtro por esa etiqueta devuelve al cliente.

**Acceptance Scenarios**:

1. **Given** el formulario o detalle de un cliente, **When** el administrador asigna una etiqueta
   existente del catálogo de la organización, **Then** la etiqueta queda asociada y visible en el
   listado y en el detalle.
2. **Given** el asignador de etiquetas, **When** el administrador escribe un nombre de etiqueta
   que no existe, **Then** puede crearla en el momento y queda asociada al cliente y disponible
   en el catálogo de la organización.
3. **Given** un cliente con etiquetas, **When** el administrador quita una etiqueta, **Then** la
   asociación desaparece del cliente sin eliminar la etiqueta del catálogo ni afectar a los
   proyectos que la usan.

---

### User Story 5 - Crear un cliente al vuelo desde un proyecto (Priority: P3)

Como usuario que está creando o editando un proyecto, quiero poder crear un cliente nuevo sin
abandonar el formulario del proyecto, para no perder los datos que ya ingresé cuando el cliente
todavía no existe en el catálogo.

**Why this priority**: Elimina una fricción real del flujo de la FASE 2 (el selector solo lista
clientes existentes), pero es un atajo de conveniencia sobre el CRUD (P1), que debe existir antes.

**Independent Test**: Iniciar la creación de un proyecto, llenar campos, abrir «crear cliente»
desde el selector, crear el cliente y verificar que queda seleccionado en el proyecto y que los
datos del proyecto previamente ingresados se conservan.

**Acceptance Scenarios**:

1. **Given** el formulario de proyecto con datos ya ingresados, **When** el usuario elige crear un
   cliente nuevo desde el selector de cliente, **Then** puede ingresar nombre, email y teléfono
   sin salir del flujo del proyecto.
2. **Given** el cliente creado al vuelo, **When** se confirma su creación, **Then** queda
   seleccionado automáticamente como cliente del proyecto y los demás campos del formulario
   conservan sus valores.
3. **Given** la creación al vuelo cancelada o fallida, **When** el usuario vuelve al formulario de
   proyecto, **Then** los datos ingresados del proyecto siguen intactos y el selector conserva su
   valor anterior.

---

### Edge Cases

- Eliminar un cliente con proyectos asociados: los proyectos nunca se eliminan; quedan «sin
  cliente» y el usuario es advertido antes de confirmar.
- Cliente con nombre duplicado dentro de la organización: se permite (empresas homónimas o
  contactos distintos), pero el listado muestra email/teléfono para desambiguar.
- Email o teléfono vacíos: son opcionales; solo el nombre es obligatorio.
- Búsqueda con caracteres acentuados: «Pérez» y «Perez» deben encontrar el mismo cliente.
- Dos usuarios editan el mismo cliente a la vez: gana la última escritura y el listado/detalle
  reflejan el estado final sin corromper datos.
- Un usuario intenta acceder por URL directa al detalle de un cliente de otra organización: el
  sistema responde como si el cliente no existiera.
- Etiqueta eliminada del catálogo mientras está asignada a clientes: desaparece de los clientes
  afectados sin dejar referencias rotas.
- Catálogo grande (cientos de clientes): el listado se pagina y la búsqueda/filtros siguen
  respondiendo con fluidez.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE ofrecer una sección de clientes dentro del área autenticada donde
  se listen los clientes de la organización con nombre, email, teléfono y etiquetas.
- **FR-002**: Los usuarios con rol `ADMIN` o `MANAGER` DEBEN poder crear clientes indicando
  nombre (obligatorio), email y teléfono (opcionales). Los roles `MEMBER` y `VIEWER` solo pueden
  consultar el listado y el detalle; las acciones de gestión no les son visibles ni accesibles.
- **FR-003**: El sistema DEBE validar el formato del email cuando se proporcione y mostrar los
  mensajes de validación en español.
- **FR-004**: Los usuarios con rol `ADMIN` o `MANAGER` DEBEN poder editar los datos de un
  cliente existente.
- **FR-005**: Los usuarios con rol `ADMIN` o `MANAGER` DEBEN poder eliminar un cliente previa
  confirmación; la confirmación DEBE advertir cuántos proyectos quedarán sin cliente, y la
  eliminación NUNCA debe eliminar ni alterar los proyectos más allá de desvincularlos.
- **FR-006**: El sistema DEBE ofrecer una vista de detalle por cliente como página dedicada con
  URL propia (enlazable desde otras vistas), con sus datos de contacto, sus etiquetas y su
  información de seguimiento.
- **FR-007**: El detalle del cliente DEBE mostrar un resumen de seguimiento con el número de
  proyectos asociados por estado y la fecha de última actividad, entendida como el cambio más
  reciente entre el propio cliente y cualquiera de sus proyectos.
- **FR-008**: El detalle del cliente DEBE listar sus proyectos asociados con acceso directo al
  detalle de cada proyecto.
- **FR-009**: El listado de clientes DEBE permitir búsqueda por nombre, email y teléfono, con
  coincidencias parciales e insensibles a mayúsculas y acentos.
- **FR-010**: El listado de clientes DEBE permitir filtrar por etiqueta y por clientes con
  proyectos activos, de forma combinable con la búsqueda, con filtros visibles y removibles.
- **FR-011**: El sistema DEBE permitir asignar y quitar etiquetas a los clientes reutilizando el
  catálogo único de etiquetas de la organización (el mismo que usan los proyectos), incluyendo la
  creación de etiquetas nuevas en el momento de asignarlas.
- **FR-012**: Quitar una etiqueta de un cliente NO DEBE eliminarla del catálogo ni afectar a los
  proyectos u otros clientes que la usen.
- **FR-013**: Desde el formulario de creación/edición de proyecto, los usuarios DEBEN poder crear
  un cliente nuevo sin abandonar el flujo; al confirmarse, el cliente DEBE quedar seleccionado en
  el proyecto y los datos ya ingresados del proyecto DEBEN conservarse.
- **FR-014**: Todos los datos de clientes DEBEN quedar aislados por organización: ningún usuario
  puede ver, buscar ni modificar clientes de otra organización, incluso accediendo por URL
  directa.
- **FR-015**: Los listados de clientes DEBEN paginarse para mantener la fluidez con catálogos
  grandes.
- **FR-016**: Los estados de carga, vacíos y de error de todas las vistas de clientes DEBEN ser
  coherentes con el resto de la aplicación y estar redactados en español.

### Key Entities

- **Cliente**: contacto o empresa con la que trabaja la organización. Atributos: nombre
  (obligatorio), email y teléfono (opcionales), etiquetas, fechas de creación y actualización.
  Pertenece a una única organización. Ya existe en el modelo de datos desde la FASE 1.
- **Etiqueta**: rótulo libre definido por la organización para clasificar. Hoy solo se asocia a
  proyectos; esta fase amplía su alcance para asociarse también a clientes, manteniendo un
  catálogo único por organización.
- **Proyecto**: entidad existente (FASE 2) que referencia opcionalmente a un cliente. En esta
  fase se consume su relación para el seguimiento y el listado en el detalle del cliente, y se
  amplía su formulario con la creación de clientes al vuelo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede crear un cliente completo (nombre, email, teléfono) en menos
  de 30 segundos desde el listado.
- **SC-002**: Con catálogos de hasta 1.000 clientes, la búsqueda y los filtros devuelven
  resultados en menos de 1 segundo percibido por el usuario.
- **SC-003**: Desde el detalle de un cliente, el usuario llega al detalle de cualquiera de sus
  proyectos asociados en una sola interacción.
- **SC-004**: Un usuario puede crear un cliente durante la creación de un proyecto sin perder
  ninguno de los datos del proyecto ya ingresados, en el 100 % de los casos.
- **SC-005**: Cero incidentes de fuga de datos entre organizaciones en las vistas y búsquedas de
  clientes (verificable con pruebas de aislamiento).
- **SC-006**: La eliminación de un cliente nunca elimina proyectos: el 100 % de los proyectos
  asociados permanece tras eliminar su cliente, solo desvinculados.
- **SC-007**: El resumen de seguimiento del detalle refleja con exactitud el conteo de proyectos
  por estado y la última actividad en el 100 % de los casos verificados.

## Assumptions

- El rol súper usuario (`mango`) conserva su visibilidad transversal sobre los clientes de
  todas las organizaciones, igual que en el resto de entidades de negocio.
- Confirmado: no existe cuota de clientes por plan (Gratuito/Pro/Pro+); el número de clientes es
  ilimitado en todos los planes.
- Al eliminar un cliente, sus proyectos quedan «sin cliente» (comportamiento ya previsto por el
  modelo de datos de la FASE 1); no se ofrece borrado en cascada de proyectos.
- Confirmado: las etiquetas de clientes reutilizan el catálogo único de etiquetas de la
  organización (el mismo de proyectos), manteniendo una sola taxonomía por tenant.
- «Última actividad» se calcula a partir de las fechas de actualización ya registradas del
  cliente y de sus proyectos; no se introduce un registro de auditoría nuevo en esta fase.
- Se permiten clientes con nombres duplicados dentro de una organización; el email y el teléfono
  sirven para desambiguar.
- «Proyectos activos» para el filtro significa proyectos cuyo estado no es final (completado o
  cancelado), según los estados definidos en la FASE 2.
- El alcance se limita a los campos existentes (nombre, email, teléfono) más etiquetas; campos
  adicionales (dirección, NIT, notas) quedan fuera de esta fase.
