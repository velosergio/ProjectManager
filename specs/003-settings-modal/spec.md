# Feature Specification: Modal de Configuración unificado

**Feature Branch**: `003-settings-modal`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Modal de Configuración (estilo ChatGPT): reemplazar el popover de controles de diseño y el conmutador de cuenta del navbar por un único modal con pestañas verticales (Apariencia, Cuenta, Notificaciones, Plan), abierto desde el menú de usuario del sidebar."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ajustar la apariencia desde un único lugar (Priority: P1)

Una persona usuaria abre el menú de su perfil en el pie del sidebar, elige "Apariencia" y modifica el tema, la fuente, el modo de color, la disposición de página y el comportamiento del sidebar. Los cambios se aplican de inmediato y se conservan al recargar.

**Why this priority**: Es la capacidad mínima que reemplaza al control de diseño existente del navbar. Sin ella, la feature no entrega su valor central (centralizar la configuración) y se rompería una funcionalidad que hoy ya existe.

**Independent Test**: Abrir el modal en la pestaña Apariencia, cambiar cada control y verificar que el cambio surte efecto al instante y persiste tras recargar la página.

**Acceptance Scenarios**:

1. **Given** la app autenticada, **When** la persona abre el menú de usuario y pulsa "Apariencia", **Then** se abre el modal en la sección Apariencia con los valores actuales reflejados.
2. **Given** el modal en Apariencia, **When** cambia el tema o la fuente, **Then** la interfaz se actualiza inmediatamente sin recargar.
3. **Given** un cambio de apariencia aplicado, **When** recarga la página, **Then** los valores elegidos se mantienen.
4. **Given** el modal en Apariencia, **When** pulsa "Restaurar valores por defecto", **Then** todos los controles vuelven a sus valores predeterminados y se persisten.

---

### User Story 2 - Gestionar los datos de la cuenta (Priority: P1)

La persona usuaria abre la pestaña "Cuenta", actualiza su nombre y la imagen de avatar, y cambia su contraseña verificando la actual. El correo se muestra pero no es editable en esta fase.

**Why this priority**: Reemplaza al conmutador de cuenta del navbar y habilita la autogestión básica del perfil y la seguridad de la cuenta, requisito fundamental para un producto SaaS.

**Independent Test**: Abrir el modal en Cuenta, guardar un nombre/avatar nuevo y confirmar que el avatar se refleja; cambiar la contraseña con la actual correcta e incorrecta y verificar los mensajes de resultado.

**Acceptance Scenarios**:

1. **Given** el modal en Cuenta, **When** la persona cambia su nombre y guarda, **Then** se muestra confirmación de éxito y el nombre actualizado aparece en la interfaz.
2. **Given** el modal en Cuenta, **When** introduce una URL de avatar válida y guarda, **Then** la previsualización y el avatar del sidebar reflejan la nueva imagen.
3. **Given** el formulario de contraseña, **When** introduce una contraseña actual incorrecta, **Then** se muestra un mensaje de error claro en español y no se cambia la contraseña.
4. **Given** el formulario de contraseña, **When** introduce la contraseña actual correcta y una nueva válida, **Then** se confirma el cambio y el formulario se limpia.
5. **Given** el campo de correo, **When** la persona intenta editarlo, **Then** permanece de solo lectura.

---

### User Story 3 - Configurar preferencias de notificación (Priority: P2)

La persona usuaria abre la pestaña "Notificaciones" y activa o desactiva los avisos por correo, las novedades de producto y los recordatorios de tareas. Cada cambio se guarda automáticamente.

**Why this priority**: Aporta control sobre las comunicaciones, valioso para la experiencia, pero no bloquea el reemplazo de los controles del navbar ni la gestión básica de cuenta.

**Independent Test**: Alternar cada interruptor, cerrar y reabrir el modal, y verificar que el estado persistió.

**Acceptance Scenarios**:

1. **Given** el modal en Notificaciones, **When** la persona alterna un interruptor, **Then** la preferencia se guarda sin acción adicional.
2. **Given** una preferencia alternada, **When** reabre el modal, **Then** el interruptor refleja el último estado guardado.
3. **Given** un fallo al guardar, **When** ocurre el error, **Then** el interruptor revierte a su estado anterior y se muestra un aviso de error.
4. **Given** una persona usuaria sin preferencias previas, **When** abre la pestaña por primera vez, **Then** se muestran los valores predeterminados (avisos y recordatorios activos; novedades inactivas).

---

### User Story 4 - Consultar plan y rol (Priority: P3)

La persona usuaria abre la pestaña "Plan" y ve, en modo solo lectura, su plan de servicio vigente y su rol dentro de la organización.

**Why this priority**: Es informativo y no habilita acciones; la gestión de facturación y cambios de plan quedan fuera de alcance. Útil pero no crítico para el reemplazo de los controles del navbar.

**Independent Test**: Abrir el modal en Plan y verificar que el plan y el rol mostrados corresponden a los reales de la sesión.

**Acceptance Scenarios**:

1. **Given** el modal en Plan, **When** se muestra la sección, **Then** aparecen el plan vigente y el rol correctos para la persona usuaria de la sesión.
2. **Given** una persona sin plan asignado, **When** abre la sección, **Then** se indica claramente la ausencia de plan.

---

### User Story 5 - Cerrar sesión y limpieza del navbar (Priority: P2)

Desde el menú de usuario del sidebar la persona puede cerrar sesión y ser redirigida al inicio de sesión. El navbar superior deja de mostrar el control de diseño y el conmutador de cuenta, conservando la búsqueda y el conmutador claro/oscuro.

**Why this priority**: Completa la consolidación de la configuración en un único punto y elimina la redundancia del navbar, mejorando la coherencia de la interfaz.

**Independent Test**: Verificar que el navbar ya no muestra los controles retirados, que conserva búsqueda y tema, y que "Cerrar sesión" redirige al inicio de sesión.

**Acceptance Scenarios**:

1. **Given** la app autenticada, **When** se carga el navbar, **Then** no aparecen el control de diseño ni el conmutador de cuenta, pero sí la búsqueda y el conmutador de tema.
2. **Given** el menú de usuario, **When** la persona pulsa "Cerrar sesión", **Then** la sesión termina y se redirige a la pantalla de inicio de sesión.

---

### Edge Cases

- ¿Qué ocurre si la cuenta no tiene una contraseña configurada (p. ej. usuario creado por un proveedor externo) y se intenta cambiarla? El sistema debe informar que no hay contraseña configurada y no aplicar cambios.
- ¿Qué ocurre si se introduce una URL de avatar inválida? La validación debe rechazarla con un mensaje claro antes de guardar.
- ¿Qué ocurre si se deja el campo de avatar vacío? Se interpreta como "sin avatar" y se muestra la inicial/marcador de posición.
- ¿Qué ocurre si falla el guardado de una preferencia de notificación por un error de red? El cambio visual revierte y se notifica el error.
- ¿Qué ocurre al abrir el modal en una sección concreta según el ítem del menú pulsado? El modal debe abrirse directamente en la sección correspondiente.
- ¿Qué ocurre con el desplazamiento cuando el contenido de una sección excede la altura del modal? El contenido debe poder desplazarse dentro del modal sin romper el layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer un único modal de Configuración con cuatro secciones navegables: Apariencia, Cuenta, Notificaciones y Plan.
- **FR-002**: El sistema MUST permitir abrir el modal desde el menú de usuario ubicado en el pie del sidebar, directamente en la sección correspondiente al ítem seleccionado.
- **FR-003**: El sistema MUST permitir, en Apariencia, configurar tema, fuente, modo de color, disposición de página, comportamiento del navbar, estilo del sidebar y modo de colapso del sidebar, aplicando los cambios de inmediato.
- **FR-004**: El sistema MUST persistir las preferencias de apariencia de modo que se conserven al recargar y entre sesiones, respetando que las preferencias críticas para el layout se resuelvan en el servidor.
- **FR-005**: El sistema MUST ofrecer una acción para restaurar todas las preferencias de apariencia a sus valores por defecto.
- **FR-006**: El sistema MUST permitir, en Cuenta, editar el nombre y la imagen de avatar (mediante URL) de la persona usuaria de la sesión.
- **FR-007**: El sistema MUST mostrar el correo electrónico de la cuenta en solo lectura (no editable en esta fase).
- **FR-008**: El sistema MUST permitir cambiar la contraseña verificando previamente la contraseña actual, y rechazar el cambio con un mensaje claro si la actual es incorrecta o si la cuenta no tiene contraseña.
- **FR-009**: El sistema MUST exigir una longitud mínima razonable para la nueva contraseña y comunicar el requisito si no se cumple.
- **FR-010**: El sistema MUST permitir activar o desactivar tres tipos de notificación: avisos por correo, novedades de producto y recordatorios de tareas, guardando cada cambio automáticamente.
- **FR-011**: El sistema MUST crear las preferencias de notificación con valores por defecto (avisos y recordatorios activos; novedades inactivas) la primera vez que se consultan.
- **FR-012**: El sistema MUST revertir el cambio visual y notificar el error si no se puede guardar una preferencia de notificación.
- **FR-013**: El sistema MUST mostrar, en Plan, el plan de servicio vigente y el rol de la persona usuaria en modo solo lectura, indicando claramente cuando no hay plan asignado.
- **FR-014**: El sistema MUST permitir cerrar sesión desde el menú de usuario, redirigiendo a la pantalla de inicio de sesión.
- **FR-015**: El sistema MUST retirar del navbar superior el control de diseño y el conmutador de cuenta, conservando la búsqueda y el conmutador de tema claro/oscuro.
- **FR-016**: El sistema MUST escopar toda lectura y escritura de datos de perfil, contraseña y notificaciones a la identidad de la persona usuaria de la sesión, sin aceptar identificadores provistos por el cliente.
- **FR-017**: El sistema MUST presentar toda la copia de interfaz y los mensajes en español con ortografía y acentos correctos.
- **FR-018**: El sistema MUST cargar los datos necesarios del modal (usuario, plan/rol y preferencias de notificación) antes de mostrarlo, evitando estados de carga visibles dentro del modal.
- **FR-019**: El sistema MUST permitir el desplazamiento del contenido dentro del modal cuando una sección excede la altura disponible, sin romper la disposición de pestañas.

### Key Entities *(include if feature involves data)*

- **Preferencia de notificación**: Conjunto de ajustes de comunicación asociado de forma única a una persona usuaria. Atributos: avisos por correo (sí/no), novedades de producto (sí/no), recordatorios de tareas (sí/no). Relación 1:1 con la cuenta de usuario.
- **Perfil de usuario (campos editables)**: Subconjunto de la cuenta gestionable por la persona usuaria: nombre e imagen de avatar. El correo es visible pero no editable; la contraseña es modificable mediante verificación de la actual.
- **Plan y rol (solo lectura)**: Información derivada de la suscripción del tenant y del rol de la persona usuaria, mostrada de forma informativa.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los ajustes que antes ofrecían el control de diseño y el conmutador de cuenta del navbar quedan disponibles en el nuevo modal.
- **SC-002**: Tras cambiar cualquier preferencia de apariencia y recargar, el valor elegido se conserva en el 100 % de los casos.
- **SC-003**: La persona usuaria puede abrir cualquiera de las cuatro secciones y completar su acción principal sin abandonar el modal.
- **SC-004**: Los cambios de apariencia se reflejan visualmente de forma inmediata (sin recargar la página).
- **SC-005**: Un cambio de contraseña con la actual incorrecta nunca modifica la contraseña y siempre muestra un mensaje de error en español.
- **SC-006**: Las preferencias de notificación alternadas persisten al reabrir el modal en el 100 % de los casos exitosos, y revierten visualmente ante un error.
- **SC-007**: El navbar superior deja de mostrar los dos controles retirados y conserva búsqueda y conmutador de tema.

## Assumptions

- La subida de archivos de avatar a almacenamiento (MinIO) queda fuera de alcance; en esta fase el avatar se define mediante una URL.
- El correo electrónico no es editable en esta fase.
- La gestión de facturación y los cambios de plan quedan fuera de alcance; la sección Plan es informativa.
- No existe aún un runner de pruebas configurado en el repositorio; la verificación se realiza mediante las puertas de calidad del proyecto y verificación manual en navegador.
- Las preferencias de notificación son por persona usuaria (no por tenant) y se inicializan con valores por defecto al primer acceso.
- La identidad de la sesión es la única fuente de autoridad para leer/escribir datos de cuenta; se reutiliza el mecanismo de sesión existente.
- La estructura de navegación del sidebar y su menú de usuario ya existen y se reutilizan como punto de entrada al modal.
