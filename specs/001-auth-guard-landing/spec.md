# Feature Specification: Protección de auth global y landing pública

**Feature Branch**: `001-auth-guard-landing`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Protección de autenticación global y landing page pública. Todas las vistas internas (dashboard, chat, mail, etc.) deben requerir sesión autenticada; un visitante no autenticado que intente acceder a cualquier ruta protegida es redirigido automáticamente a la landing page en la ruta `/`. Un usuario ya autenticado que entre a `/` es redirigido a `/dashboard/default`. Las rutas públicas son `/`, `/auth/*` y `/api/auth/*`. La landing presenta el producto (MangoMorado) con estilo dark premium y glow morado, animaciones modernas y secciones de navbar, hero, características, multitenant/roles, planes y footer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Protección de las vistas internas (Priority: P1)

Un visitante sin sesión iniciada intenta acceder directamente a una vista interna (por
ejemplo `/dashboard/default`, `/chat` o `/mail`) escribiendo la URL o siguiendo un enlace
guardado. El sistema detecta que no hay sesión y lo redirige automáticamente a la landing
page en `/`, sin exponer ningún contenido protegido.

**Why this priority**: Es el requisito de seguridad central. Sin esta protección, cualquier
persona puede ver datos de proyectos, clientes y métricas. Es el mayor riesgo y la base del
resto de la funcionalidad.

**Independent Test**: Con el navegador en estado no autenticado, visitar varias rutas
internas y confirmar que todas redirigen a `/` y que en ningún momento se renderiza contenido
protegido. Entregar valor por sí solo: cierra el acceso no autorizado.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** navega a `/dashboard/default`, **Then** es
   redirigido a `/` y no ve contenido del dashboard.
2. **Given** un visitante sin sesión, **When** navega a cualquier ruta interna (`/chat`,
   `/mail`, `/dashboard/*`), **Then** es redirigido a `/`.
3. **Given** un visitante sin sesión, **When** navega a una ruta interna concreta y luego
   inicia sesión, **Then** accede correctamente a las vistas internas.

---

### User Story 2 - Landing pública que presenta el producto (Priority: P1)

Un visitante sin sesión llega a `/` y ve una landing page moderna que explica qué es
MangoMorado, sus capacidades (Kanban, Gantt, Calendario, Dashboard ejecutivo, Gestión
documental, Bitácora/Auditoría, Recordatorios), su arquitectura multitenant con roles,
los planes disponibles y cómo empezar. Desde la landing puede ir a iniciar sesión o crear
una cuenta.

**Why this priority**: Es la cara pública del producto y el destino de todos los visitantes
no autenticados (incluidas las redirecciones de la Historia 1). Sin ella, las redirecciones
llevarían a una página vacía. Junto con la Historia 1 forma el MVP.

**Independent Test**: Visitar `/` sin sesión y comprobar que se muestran todas las secciones
descritas, que los enlaces a iniciar sesión y crear cuenta funcionan, y que la página es
navegable por teclado y respeta `prefers-reduced-motion`.

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** abre `/`, **Then** ve navbar, hero,
   características, sección multitenant/roles, planes, CTA final y footer.
2. **Given** un visitante en la landing, **When** pulsa "Iniciar sesión", **Then** llega a la
   página de login (`/auth/v1/login`).
3. **Given** un visitante en la landing, **When** pulsa "Crear cuenta", **Then** llega a la
   página de registro (`/auth/v1/register`).
4. **Given** un visitante en la sección de planes, **When** alterna entre ciclo mensual y
   anual, **Then** los precios mostrados se actualizan según el ciclo seleccionado.
5. **Given** un usuario con el sistema operativo configurado para reducir movimiento, **When**
   abre `/`, **Then** las animaciones se desactivan o reducen y el contenido es legible.

---

### User Story 3 - Redirección del usuario autenticado fuera de la landing (Priority: P2)

Un usuario que ya tiene sesión iniciada entra a `/` (por ejemplo desde un marcador antiguo o
escribiendo la URL raíz). El sistema reconoce que está autenticado y lo lleva directamente a
su área de trabajo (`/dashboard/default`) en lugar de mostrarle la página de marketing.

**Why this priority**: Mejora la experiencia y evita confusión, pero no es crítico para la
seguridad ni para el MVP: si fallara, el usuario simplemente vería la landing y podría navegar
al dashboard manualmente.

**Independent Test**: Con sesión iniciada, visitar `/` y confirmar la redirección automática a
`/dashboard/default`.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** navega a `/`, **Then** es redirigido a
   `/dashboard/default` sin ver la landing.
2. **Given** un usuario autenticado, **When** navega a `/auth/v1/login`, **Then** es redirigido
   a `/dashboard/default` (no necesita volver a iniciar sesión).

---

### Edge Cases

- **Rutas públicas siempre accesibles**: `/`, las páginas bajo `/auth/*` y los endpoints
  `/api/auth/*` DEBEN ser accesibles sin sesión; nunca deben redirigir a la landing en un bucle.
- **Sin bucles de redirección**: la redirección de no autenticados a `/` no debe volver a
  dispararse para `/`; la redirección de autenticados desde `/` no debe reactivarse en el destino.
- **Sesión expirada durante la navegación**: si la sesión caduca, el siguiente acceso a una ruta
  protegida redirige a `/`.
- **Recursos estáticos y assets**: las peticiones de assets de la aplicación no deben quedar
  bloqueadas ni redirigidas por la protección.
- **Rutas internas inexistentes**: una ruta interna que no existe, accedida sin sesión, redirige
  a `/` (la protección actúa antes que el 404). Con sesión, muestra el 404 normal.
- **Movimiento reducido**: con `prefers-reduced-motion`, las animaciones decorativas se reducen
  o desactivan sin perder contenido ni funcionalidad.

## Requirements *(mandatory)*

### Functional Requirements

#### Protección de acceso

- **FR-001**: El sistema DEBE exigir una sesión autenticada para acceder a todas las vistas
  internas (incluyendo, sin limitarse a, `/dashboard/*`, `/chat` y `/mail`).
- **FR-002**: El sistema DEBE redirigir a `/` cualquier intento de acceso no autenticado a una
  ruta protegida, sin renderizar contenido protegido.
- **FR-003**: El sistema DEBE tratar como públicas, accesibles sin sesión, las rutas `/`,
  `/auth/*` y `/api/auth/*`.
- **FR-004**: El sistema DEBE redirigir a `/dashboard/default` a un usuario autenticado que
  acceda a `/` o a las páginas de autenticación.
- **FR-005**: El sistema DEBE evitar bucles de redirección para rutas públicas y para los
  destinos de redirección.
- **FR-006**: El sistema NO DEBE bloquear ni redirigir las peticiones de recursos estáticos y
  assets internos de la aplicación.

#### Landing page

- **FR-007**: La ruta `/` DEBE mostrar a los visitantes no autenticados una landing page que
  presenta el producto MangoMorado.
- **FR-008**: La landing DEBE incluir una barra de navegación fija (sticky) con efecto de vidrio
  (glassmorphism) que contenga el logotipo, enlaces a "Características" y "Planes", un botón
  "Iniciar sesión" y una llamada a la acción "Crear cuenta".
- **FR-009**: La landing DEBE incluir una sección hero con un titular, texto descriptivo, dos
  llamadas a la acción y una representación visual del producto.
- **FR-010**: La landing DEBE incluir una sección de características que presente, como mínimo:
  Kanban, Gantt, Calendario, Dashboard ejecutivo, Gestión documental, Bitácora/Auditoría y
  Recordatorios.
- **FR-011**: La landing DEBE incluir una sección que explique la arquitectura multitenant
  (aislamiento por organización) y los roles `admin` y `mango`.
- **FR-012**: La landing DEBE incluir una sección de planes con Gratuito, Pro (30.000 COP/mes) y
  Pro+ (50.000 COP/mes), destacando el plan Pro y mencionando el pago mediante Wompi.
- **FR-013**: La sección de planes DEBE ofrecer un conmutador entre ciclo de facturación mensual
  y anual que actualice los precios mostrados.
- **FR-014**: La landing DEBE incluir una llamada a la acción final y un pie de página (footer).
- **FR-015**: Los enlaces "Iniciar sesión" y "Crear cuenta" DEBEN dirigir a las páginas de
  autenticación existentes (`/auth/v1/login` y `/auth/v1/register`).
- **FR-016**: El contenido de la landing DEBE basarse en las capacidades descritas en el
  roadmap del proyecto, asumiendo que la funcionalidad está desarrollada.

#### Experiencia y accesibilidad

- **FR-017**: La landing DEBE presentar una estética "dark premium" con acentos morados (glow) y
  guiños de marca mango+morado, coherente y legible.
- **FR-018**: Las animaciones de la landing DEBEN respetar la preferencia `prefers-reduced-motion`
  del usuario, reduciéndose o desactivándose cuando esté activa.
- **FR-019**: La landing DEBE ser navegable por teclado y cumplir contraste y etiquetado
  accesibles, conforme al Principio III de la constitución.
- **FR-020**: La landing DEBE ser responsiva y legible en tamaños de pantalla móviles y de
  escritorio.

### Key Entities *(include if feature involves data)*

- **Sesión de usuario**: representa el estado de autenticación del visitante (autenticado o no).
  Determina si una ruta protegida es accesible y a dónde se redirige. No introduce nuevos datos
  persistentes; reutiliza el mecanismo de autenticación existente del proyecto.
- **Plan de suscripción** (solo presentación): información mostrada en la landing (nombre,
  precio mensual/anual, características destacadas). Es contenido de marketing, no requiere
  persistencia para esta feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los intentos de acceso no autenticado a rutas protegidas terminan en
  la landing `/` sin exponer contenido protegido.
- **SC-002**: El 100 % de los accesos de usuarios autenticados a `/` terminan en
  `/dashboard/default`.
- **SC-003**: Las rutas públicas (`/`, `/auth/*`, `/api/auth/*`) son accesibles sin sesión en el
  100 % de los casos, sin bucles de redirección.
- **SC-004**: Un visitante nuevo puede identificar qué hace el producto y llegar al registro o al
  login en menos de 30 segundos desde que abre `/`.
- **SC-005**: La landing muestra correctamente todas las secciones requeridas (navbar, hero,
  características, multitenant/roles, planes, CTA final, footer) en móvil y escritorio.
- **SC-006**: Con `prefers-reduced-motion` activado, la landing no presenta animaciones que
  distraigan y todo el contenido sigue siendo accesible y legible.
- **SC-007**: La landing es completamente operable por teclado (foco visible y orden lógico) en
  todos sus elementos interactivos.

## Assumptions

- Se reutiliza el mecanismo de autenticación ya presente en el proyecto; esta feature no añade
  nuevos métodos de inicio de sesión ni cambia el modelo de usuarios.
- Las páginas de autenticación existen y funcionan en `/auth/v1/login` y `/auth/v1/register`.
- El destino del usuario autenticado es `/dashboard/default`, que ya existe en el proyecto.
- El contenido de planes (precios en COP, nombres Gratuito/Pro/Pro+) y la mención a Wompi son
  informativos en la landing; el cobro real se aborda en una fase posterior del roadmap.
- "Todas las vistas internas" abarca cualquier ruta de la aplicación que no sea explícitamente
  pública (`/`, `/auth/*`, `/api/auth/*`) ni un asset estático.
- La landing fuerza su propia estética oscura con independencia de la preferencia de tema del
  panel interno, por tratarse de una página de marketing autónoma.
- El idioma de todo el contenido visible y de la documentación es español, conforme al
  Principio V de la constitución.
