# Feature Specification: Core del sistema y arquitectura multitenant

**Feature Branch**: `002-core-multitenant`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "FASE 1 — Core del Sistema + Arquitectura Multitenant. Estructura base del Project Manager con aislamiento multitenant (un tenant por organización, discriminador `tenantId`, scoping obligatorio por query con bypass para el rol `mango`), planes de suscripción (Gratuito / Pro 30.000 COP / Pro+ 50.000 COP con cuotas y gating de features), roles globales `admin` y `mango`, autenticación con `tenantId` y `role` en sesión, recuperación de contraseña, comando CLI `npm run mango` para crear el super usuario, y navegación adaptada a rol y plan (sidebar, perfil, indicador de plan, consola exclusiva de `mango` con selector de tenant)."

## Aclaraciones

### Sesión 2026-06-22

- P: ¿Cómo se resuelve el tenant en cada request durante la FASE 1? → R: Solo por sesión; el `tenantId` viaja en el token/sesión de NextAuth (sin subdominios, una sola URL para todos los tenants).
- P: ¿Cómo se crea un tenant y su primer usuario admin? → R: Autoservicio en el registro; al registrarse el usuario crea su organización, queda como `admin` y el tenant arranca con plan Gratuito.
- P: ¿Qué cuotas concretas tiene cada plan? → R: Las cuotas (proyectos, usuarios, almacenamiento) se modelan como configurables/parametrizables por plan; los números concretos se definen más adelante (planificación o decisión de negocio), no se fijan en este spec.
- P: Los planes definen cuota de usuarios, pero la invitación está fuera de alcance. ¿Qué aplica en FASE 1? → R: Un solo usuario `admin` por tenant; la cuota de usuarios se modela pero el flujo de invitación/gestión de equipo se difiere a una fase posterior.
- P: Si una organización baja a un plan con cuota menor que su uso actual, ¿qué hace el sistema? → R: Permite el descenso sin perder datos y bloquea las nuevas creaciones hasta que el uso vuelva por debajo de la cuota destino.
- P: ¿Qué estados debe contemplar la suscripción en FASE 1? → R: `activa`, `en_prueba`, `vencida` y `cancelada` (ciclo de vida completo; el cobro real llega en FASE 9).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aislamiento de datos entre organizaciones (Priority: P1)

Dos organizaciones distintas (tenants) usan la plataforma simultáneamente. Cada usuario solo
puede ver y modificar los datos de su propia organización. Cualquier intento de leer o escribir
datos de otra organización —por manipulación de identificadores, URLs o llamadas directas— es
bloqueado por el sistema, sin filtraciones de información.

**Why this priority**: Es la garantía fundamental de un SaaS multitenant. Sin aislamiento estricto,
una organización podría ver clientes, proyectos o métricas de otra: el peor fallo posible del
producto. Todo lo demás se construye sobre esta base.

**Independent Test**: Crear dos tenants con datos propios, autenticarse como usuario de cada uno y
verificar que las consultas solo devuelven datos del tenant en sesión; intentar acceder a un
recurso de otro tenant por su identificador y confirmar que el sistema lo niega (recurso no
encontrado / acceso denegado), sin revelar su existencia.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado del Tenant A, **When** lista proyectos/clientes/tareas,
   **Then** solo ve entidades cuyo `tenantId` es el del Tenant A.
2. **Given** un usuario del Tenant A que conoce el identificador de un proyecto del Tenant B,
   **When** intenta abrirlo o editarlo, **Then** el sistema responde como si no existiera y no
   expone ningún dato del Tenant B.
3. **Given** una operación de escritura (crear/actualizar) iniciada por un usuario del Tenant A,
   **When** se persiste, **Then** la entidad queda asociada automáticamente al Tenant A y no puede
   reasignarse a otro tenant desde la petición.

---

### User Story 2 - Alta de organización en autoservicio (Priority: P1)

Una persona que aún no tiene cuenta se registra desde la página pública. En ese acto crea su
organización (tenant), queda como `admin` de la misma y la organización arranca con el plan
Gratuito activo. A partir de ahí accede a su espacio de trabajo aislado.

**Why this priority**: Es la puerta de entrada del producto. Sin un alta de organización funcional
no existen tenants sobre los que probar el aislamiento ni los planes. Junto con la Historia 1
constituye el MVP del core multitenant.

**Independent Test**: Completar el registro con datos válidos y comprobar que se crean el usuario
(rol `admin`), la organización asociada y una suscripción al plan Gratuito; iniciar sesión y
confirmar que el espacio de trabajo está vacío y aislado del de otras organizaciones.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta, **When** completa el registro con nombre de organización,
   nombre, email y contraseña válidos, **Then** se crean la organización, el usuario `admin` y la
   suscripción al plan Gratuito, y queda autenticado en su tenant.
2. **Given** un email ya registrado, **When** intenta registrarse de nuevo con ese email, **Then**
   el sistema lo rechaza con un mensaje claro y no crea organización ni usuario duplicados.
3. **Given** una contraseña que no cumple la política de fuerza mínima, **When** envía el registro,
   **Then** el sistema lo rechaza indicando los requisitos incumplidos.

---

### User Story 3 - Acceso global del rol `mango` (Priority: P1)

El super usuario `mango` (operador de la plataforma) puede acceder de forma transversal a los datos
de cualquier organización para soporte, medición y seguimiento. Dispone de una consola exclusiva con
un selector de tenant que le permite situarse en el contexto de cualquier organización.

**Why this priority**: El rol `mango` es la contraparte operativa del aislamiento: el único actor
autorizado a cruzar la frontera entre tenants. Es imprescindible para operar y dar soporte a la
plataforma, y su comportamiento (bypass del scoping) debe quedar especificado junto con el propio
aislamiento para no introducir fugas.

**Independent Test**: Autenticarse como `mango`, abrir la consola exclusiva, seleccionar distintos
tenants y comprobar que puede ver datos de cada uno; verificar que un usuario que no sea `mango` no
puede acceder a esa consola ni cruzar la frontera de su tenant.

**Acceptance Scenarios**:

1. **Given** un usuario con rol `mango`, **When** entra en la consola exclusiva y selecciona un
   tenant, **Then** ve los datos de ese tenant, omitiendo el filtrado por `tenantId`.
2. **Given** un usuario con rol `admin`, **When** intenta acceder a la consola de `mango` o a datos
   de otro tenant, **Then** el sistema le deniega el acceso.
3. **Given** un usuario con rol `mango` sin tenant seleccionado, **When** navega por la consola,
   **Then** puede ver el listado de organizaciones y métricas agregadas sin entrar en ninguna.

---

### User Story 4 - Creación del super usuario por CLI (`npm run mango`) (Priority: P2)

Un operador con acceso al servidor ejecuta `npm run mango` en la terminal. Un formulario
interactivo solicita nombre, email, contraseña y confirmación; valida los datos, avisa si el email
ya existe y crea el usuario con rol `mango` (acceso global, sin tenant asociado), con la contraseña
protegida.

**Why this priority**: Es el mecanismo de arranque (bootstrap) para crear el primer super usuario,
necesario para operar la consola de la Historia 3. No es parte del flujo de cliente final, por eso
va después del MVP, pero es prerrequisito operativo para usar el acceso global.

**Independent Test**: Ejecutar el comando, rellenar el formulario con datos válidos y verificar que
se crea un usuario `mango`; volver a ejecutarlo con el mismo email y confirmar que avisa y no
duplica.

**Acceptance Scenarios**:

1. **Given** el comando en ejecución, **When** se introducen nombre, email, contraseña y
   confirmación válidos, **Then** se crea un usuario con rol `mango`, sin tenant asociado y con la
   contraseña protegida.
2. **Given** un email que ya pertenece a un usuario, **When** se introduce en el formulario,
   **Then** el comando avisa de que ya existe y no crea un duplicado.
3. **Given** una contraseña y una confirmación que no coinciden, o una contraseña débil, **When** se
   envía, **Then** el comando rechaza la entrada e indica el motivo sin persistir nada.

---

### User Story 5 - Límites de plan y gating de funciones (Priority: P2)

Cada organización tiene un plan vigente (Gratuito, Pro o Pro+) que determina sus cuotas (proyectos,
usuarios, almacenamiento) y qué funciones están disponibles. Cuando una organización alcanza el
límite de su plan o intenta usar una función no incluida, el sistema lo impide y la informa de la
restricción y de la vía para ampliar el plan.

**Why this priority**: Es la base del modelo de negocio (diferenciación entre planes), pero depende
de que el aislamiento y el alta de organización existan primero. El cobro real y la pasarela se
abordan en una fase posterior; aquí solo se modela y aplica el gating.

**Independent Test**: Configurar una organización en plan Gratuito, alcanzar una cuota (p. ej. el
número máximo de proyectos) y comprobar que el sistema bloquea la creación adicional con un mensaje
claro; cambiar la organización a un plan superior y verificar que el límite se actualiza.

**Acceptance Scenarios**:

1. **Given** una organización en plan Gratuito que alcanzó su cuota de proyectos, **When** intenta
   crear otro, **Then** el sistema lo impide e informa del límite y de cómo ampliar el plan.
2. **Given** una organización cuyo plan no incluye cierta función, **When** un usuario intenta
   usarla, **Then** el sistema la bloquea e indica que requiere un plan superior.
3. **Given** una organización que cambia a un plan con cuotas mayores, **When** se aplica el cambio,
   **Then** los nuevos límites quedan vigentes de inmediato.

---

### User Story 6 - Recuperación de contraseña (Priority: P3)

Un usuario que olvidó su contraseña solicita restablecerla desde la página de acceso indicando su
email. Recibe un enlace o código de un solo uso y con tiempo de caducidad para definir una nueva
contraseña, sin necesidad de contactar con soporte.

**Why this priority**: Mejora importante de autonomía y soporte, pero no bloquea el MVP: los
usuarios pueden operar mientras recuerden su contraseña. Por eso va al final.

**Independent Test**: Solicitar el restablecimiento con un email registrado, usar el mecanismo de un
solo uso para fijar una contraseña nueva e iniciar sesión con ella; verificar que el enlace caduca y
no es reutilizable.

**Acceptance Scenarios**:

1. **Given** un usuario registrado que olvidó su contraseña, **When** solicita restablecerla con su
   email, **Then** recibe un mecanismo de un solo uso y con caducidad para fijar una nueva.
2. **Given** un enlace/código de restablecimiento ya usado o caducado, **When** se intenta usar de
   nuevo, **Then** el sistema lo rechaza e invita a solicitar uno nuevo.
3. **Given** un email no registrado, **When** se solicita el restablecimiento, **Then** el sistema
   responde de forma neutra sin revelar si el email existe.

---

### User Story 7 - Navegación adaptada a rol y plan (Priority: P3)

Al entrar en su espacio de trabajo, cada usuario ve un sidebar y un layout coherentes con su rol y
su plan: solo aparecen las secciones a las que tiene acceso, junto con un indicador del plan vigente
y su estado, y acceso a su perfil. El super usuario `mango` ve además la entrada a su consola
exclusiva.

**Why this priority**: Mejora la experiencia y refuerza visualmente las reglas de acceso, pero el
sistema es funcional sin ella (las protecciones de las Historias 1, 3 y 5 actúan en cualquier caso).
Es una capa de presentación sobre reglas ya garantizadas en el backend.

**Independent Test**: Iniciar sesión como `admin` de un plan concreto y verificar que el sidebar solo
muestra lo permitido y el indicador del plan correcto; iniciar sesión como `mango` y comprobar que
aparece la consola exclusiva; confirmar que ocultar un elemento del menú no es la única barrera (el
acceso directo a la ruta también se deniega).

**Acceptance Scenarios**:

1. **Given** un `admin` autenticado, **When** abre su espacio de trabajo, **Then** ve el sidebar con
   las secciones permitidas, su perfil y el indicador de plan vigente y estado.
2. **Given** un usuario `mango`, **When** abre su espacio de trabajo, **Then** ve adicionalmente la
   entrada a la consola exclusiva con selector de tenant.
3. **Given** un usuario cuyo plan no incluye una sección, **When** intenta abrir su ruta directa,
   **Then** el sistema deniega el acceso aunque el elemento no aparezca en el menú.

---

### Edge Cases

- **Usuario sin tenant que no es `mango`**: una sesión válida sin `tenantId` y sin rol `mango` no
  debe poder acceder a datos de negocio; el sistema la trata como acceso inválido.
- **`mango` sin tenant seleccionado**: las operaciones que requieren contexto de tenant deben exigir
  una selección previa o quedar deshabilitadas hasta elegir organización.
- **Manipulación del `tenantId` en la petición**: cualquier intento de fijar o cambiar el `tenantId`
  desde el cliente se ignora; el tenant efectivo proviene de la sesión (o de la selección de `mango`).
- **Cambio de plan a la baja con cuotas superadas**: si una organización baja a un plan con cuotas
  inferiores a su uso actual, el sistema permite el descenso sin perder datos y bloquea las nuevas
  creaciones del recurso afectado hasta que el uso vuelva por debajo de la cuota destino; los datos
  existentes se conservan y siguen accesibles.
- **Email duplicado entre el registro y el comando `mango`**: el mismo email no puede pertenecer a la
  vez a un usuario de tenant y a un `mango`; el sistema lo impide de forma consistente.
- **Concurrencia en el límite de cuota**: dos creaciones simultáneas no deben permitir superar la
  cuota del plan.
- **Recuperación de contraseña con varios intentos**: solicitudes repetidas no deben permitir abuso
  (limitación de frecuencia) ni invalidar de forma confusa los enlaces previos.

## Requirements *(mandatory)*

### Functional Requirements

#### Multitenancy y aislamiento

- **FR-001**: El sistema DEBE asociar toda entidad de negocio (clientes, proyectos, procesos,
  tareas, archivos, eventos y futuras) a una organización mediante un discriminador `tenantId`.
- **FR-002**: El sistema DEBE forzar, en toda consulta de lectura y escritura, el filtrado por el
  `tenantId` del contexto de la sesión, de forma automática y no omitible por el código de feature.
- **FR-003**: El sistema DEBE asignar automáticamente el `tenantId` del contexto al crear cualquier
  entidad de negocio, ignorando cualquier `tenantId` provisto desde el cliente.
- **FR-004**: El sistema DEBE impedir que un usuario de una organización lea o modifique datos de
  otra, respondiendo como si el recurso no existiera y sin revelar su existencia.
- **FR-005**: El sistema DEBE resolver el tenant del request a partir del `tenantId` presente en la
  sesión/token autenticado (no por subdominio ni por parámetro de URL).
- **FR-006**: El sistema DEBE permitir al rol `mango` omitir el filtrado por `tenantId` y operar
  sobre los datos de cualquier organización, solo a través de los mecanismos previstos para ese rol.

#### Organizaciones, planes y suscripciones

- **FR-007**: El sistema DEBE permitir crear una organización (tenant) en el momento del registro
  en autoservicio, dejando al usuario que la crea como `admin` de la misma.
- **FR-008**: El sistema DEBE asociar cada organización a un plan vigente y arrancar toda
  organización nueva con el plan Gratuito.
- **FR-009**: El sistema DEBE modelar tres planes —Gratuito, Pro y Pro+— con sus precios de
  referencia (Pro: 30.000 COP/mes; Pro+: 50.000 COP/mes; con precio anual con descuento) y un
  conjunto de cuotas y funciones por plan.
- **FR-010**: El sistema DEBE modelar las cuotas por plan (al menos: número de proyectos, número de
  usuarios y almacenamiento) como valores configurables/parametrizables, sin requerir cambios de
  código para ajustarlos. (Los valores numéricos concretos se definen en planificación.)
- **FR-011**: El sistema DEBE impedir que una organización supere las cuotas de su plan vigente,
  informando del límite alcanzado y de la vía para ampliar el plan.
- **FR-011a**: Cuando una organización baja a un plan cuya cuota es inferior a su uso actual, el
  sistema DEBE permitir el cambio sin eliminar datos y DEBE bloquear nuevas creaciones del recurso
  excedido hasta que el uso vuelva por debajo de la cuota destino.
- **FR-012**: El sistema DEBE restringir el uso de funciones según el plan vigente de la organización
  (gating), mediante guardas reutilizables, y aplicar la restricción tanto en la interfaz como en el
  backend.
- **FR-013**: El sistema DEBE registrar la suscripción de cada organización con su ciclo
  (mensual/anual) y su estado, contemplando los estados `activa`, `en_prueba`, `vencida` y
  `cancelada`, sin implementar todavía el cobro ni la pasarela de pago (diferidos a la FASE 9).

#### Autenticación, roles y autorización

- **FR-014**: El sistema DEBE autenticar a los usuarios mediante email y contraseña, con la
  contraseña almacenada de forma protegida (con hash, nunca en claro).
- **FR-015**: El sistema DEBE soportar dos roles globales: `admin` (administra su organización) y
  `mango` (super usuario global con acceso transversal).
- **FR-015a**: En esta fase cada organización tiene un único usuario `admin`; la cuota de usuarios
  por plan se modela en datos, pero el flujo de invitación y gestión de equipo (varios usuarios por
  tenant) se difiere a una fase posterior.
- **FR-016**: El sistema DEBE incluir el `tenantId` y el `role` del usuario en el token/sesión y
  usarlos como fuente de verdad para el aislamiento y la autorización.
- **FR-017**: El sistema DEBE autorizar cada acción según el rol y el plan, denegando el acceso a
  rutas, datos y funciones no permitidos, con independencia de que estén o no visibles en la interfaz.
- **FR-018**: El sistema DEBE permitir a un usuario restablecer su contraseña mediante un mecanismo de
  un solo uso y con caducidad, sin revelar si un email está o no registrado.

#### Super usuario y consola `mango`

- **FR-019**: El sistema DEBE ofrecer un comando de línea de órdenes (`npm run mango`) que cree un
  usuario con rol `mango`, sin tenant asociado, a partir de un formulario interactivo en terminal
  (nombre, email, contraseña y confirmación).
- **FR-020**: El comando `mango` DEBE validar los datos de entrada (email con formato válido y único,
  fuerza mínima de contraseña, coincidencia de confirmación), proteger la contraseña antes de
  persistir y avisar de forma idempotente si el email ya existe, sin crear duplicados.
- **FR-021**: El sistema DEBE ofrecer al rol `mango` una consola exclusiva con un selector de tenant
  que permita situarse en el contexto de cualquier organización y ver datos y métricas agregadas.

#### Navegación e interfaz

- **FR-022**: El sistema DEBE mostrar un sidebar y un layout principal cuyos elementos se adapten al
  rol y al plan del usuario, ocultando lo no disponible sin que esa ocultación sea la única barrera
  de acceso.
- **FR-023**: El sistema DEBE mostrar el plan vigente de la organización y el estado de su
  suscripción de forma visible en la navegación.
- **FR-024**: El sistema DEBE ofrecer una vista de perfil donde el usuario consulte y gestione sus
  datos básicos de cuenta.

### Key Entities *(include if feature involves data)*

- **Tenant (Organización)**: unidad de aislamiento; agrupa a sus usuarios y todas sus entidades de
  negocio. Atributos clave: nombre/identificador de organización, plan vigente y suscripción
  asociada. Es el valor de `tenantId` que discrimina todos los datos.
- **Plan**: definición de un nivel de servicio (Gratuito, Pro, Pro+). Atributos: nombre, precios de
  referencia (mensual y anual con descuento), conjunto de cuotas (proyectos, usuarios,
  almacenamiento) y conjunto de funciones habilitadas.
- **Subscription**: vínculo vigente entre una organización y un plan. Atributos: plan, ciclo
  (mensual/anual), estado (`activa`, `en_prueba`, `vencida`, `cancelada`) y datos de vigencia. No
  incluye aún cobro ni pasarela.
- **Usuario**: persona con acceso. Atributos: nombre, email único, contraseña protegida, `role`
  (`admin` o `mango`) y `tenantId` (vacío para `mango`, que tiene acceso global).
- **Cliente**: contacto/empresa gestionada dentro de una organización. Pertenece a un `tenant`.
- **Proyecto**: trabajo gestionado dentro de una organización; sujeto a cuotas del plan. Pertenece a
  un `tenant`.
- **Proceso**: agrupación de trabajo dentro de un proyecto. Pertenece a un `tenant`.
- **Tarea**: unidad de trabajo dentro de un proceso/proyecto. Pertenece a un `tenant`.
- **Archivo**: documento o recurso almacenado; cuenta para la cuota de almacenamiento. Pertenece a un
  `tenant`.
- **Evento**: entrada de calendario/actividad asociada al trabajo. Pertenece a un `tenant`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de los intentos de acceso a datos de otra organización (por identificador,
  URL o llamada directa), el sistema niega el acceso sin filtrar ningún dato del otro tenant.
- **SC-002**: El 100 % de las entidades de negocio creadas quedan asociadas al tenant correcto del
  contexto, verificado sobre un conjunto representativo de operaciones.
- **SC-003**: Una persona sin cuenta puede completar el alta de su organización (registro → admin →
  plan Gratuito activo) en menos de 2 minutos y empezar a trabajar en un espacio aislado.
- **SC-004**: Toda organización nueva queda con el plan Gratuito vigente en el 100 % de las altas.
- **SC-005**: Al alcanzar una cuota del plan, el sistema impide la acción excedente en el 100 % de
  los casos y muestra un mensaje que indica el límite y cómo ampliarlo.
- **SC-006**: Un operador puede crear un super usuario `mango` con `npm run mango` en menos de 1
  minuto; reejecutarlo con un email existente nunca crea duplicados.
- **SC-007**: El rol `mango` puede consultar datos de cualquier organización desde su consola,
  mientras que ningún usuario `admin` consigue cruzar la frontera de su tenant en pruebas de intento
  de acceso cruzado (0 fugas).
- **SC-008**: Un usuario que olvidó su contraseña puede restablecerla y volver a entrar sin
  intervención de soporte, y los enlaces de un solo uso son inservibles tras su uso o caducidad en el
  100 % de los casos.
- **SC-009**: La navegación muestra el plan vigente correcto y solo las secciones permitidas por rol
  y plan en el 100 % de las combinaciones probadas.

## Assumptions

- **Modelo de aislamiento**: base de datos compartida con esquema compartido y discriminador por
  `tenantId` (shared DB, shared schema), con scoping forzado en la capa de acceso a datos. No se usa
  base de datos por tenant en esta fase.
- **Resolución de tenant**: por sesión/token (el `tenantId` viaja en la sesión autenticada). No hay
  subdominios ni multi-organización por usuario en esta fase: cada usuario `admin` pertenece a un
  único tenant.
- **Onboarding**: el registro público está habilitado y crea organización + usuario `admin` + plan
  Gratuito en un solo paso (autoservicio). En esta fase cada organización tiene un único `admin`; la
  invitación y gestión de usuarios adicionales (varios miembros por tenant) queda fuera del alcance
  de esta fase y se aborda más adelante, aunque la cuota de usuarios por plan ya se modela en datos.
- **Cuotas**: los valores numéricos concretos de cada plan (proyectos, usuarios, almacenamiento) se
  fijan en la fase de planificación o por decisión de negocio; el spec exige que sean parametrizables,
  no codificados.
- **Pagos**: el cobro, la vigencia facturable y la pasarela (Wompi) se implementan en la FASE 9
  (Pagos y Suscripciones); aquí solo se modela la suscripción y se aplica el gating.
- **Recuperación de contraseña**: requiere un canal de envío (correo); su configuración concreta es
  un prerrequisito de despliegue y puede quedar como opcional en entornos de desarrollo.
- **Entidades de negocio (Cliente, Proyecto, Proceso, Tarea, Archivo, Evento)**: en esta fase se
  modelan principalmente como soporte del aislamiento y de las cuotas; sus funciones completas
  (Kanban, Gantt, calendario, etc.) corresponden a fases posteriores del ROADMAP.
- **Rol `mango`**: es un rol global de operador de plataforma, no asociado a ninguna organización;
  no se autoregistra desde la interfaz pública, solo mediante el comando CLI.
