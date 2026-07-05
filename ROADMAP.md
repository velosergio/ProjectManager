# Project Manager — Roadmap de Desarrollo

## Stack Tecnológico

### Frontend

* Next.js (App Router)
* TypeScript
* TailwindCSS
* Shadcn
* Zustand (estado ligero)
* React Query / TanStack Query
* React Hook Form
* Zod

### Backend

* Next.js Server Actions + Route Handlers
* Prisma ORM
* MySQL

### Infraestructura

* Docker
* Docker Compose
* Nginx (producción)
* Redis (colas / caché / notificaciones)
* MinIO (archivos locales tipo S3)
* Cron Jobs

### Pagos y Suscripciones

* Wompi (pasarela de pagos — Colombia)
* Webhooks de Wompi (confirmación de transacciones)
* Cron Jobs para control de vigencia de suscripción

### Arquitectura

* Multitenant (aislamiento de datos por tenant/organización)
* Planes: Gratuito · Pro · Pro+
* Roles globales: `admin` · `mango` (super usuario)

### Componentes UI

* Dashboard
* Gantt
* Kanban
* Calendario
* Timeline / Bitácora
* Progress Bar

---

# FASE 0 — Instalación y Configuración Base

Objetivo: dejar el entorno completamente reproducible.

## Infraestructura inicial

### Entregables

* [x] Dockerizado
* [x] Base Next.js funcional
* [x] MySQL conectado
* [x] Prisma configurado
* [x] Variables de entorno
* [x] CI/CD básico
* [x] Spec Driven Development (Constitucion del proyecto y Spec inicial)

# FASE 1 — Core del Sistema + Arquitectura Multitenant

Objetivo: estructura base del Project Manager con aislamiento multitenant, planes y roles.

## Arquitectura Multitenant

Modelo de aislamiento: **un tenant (organización) por cliente**, con `tenantId` en todas
las entidades de negocio. Estrategia inicial: base de datos compartida con discriminador
por `tenantId` (shared DB, shared schema) + scoping obligatorio en cada query (Prisma
middleware / extensión que inyecta el `tenantId` del contexto).

### Entregables

* [x] Modelo `Tenant` (organización) y relación con `Usuario`
* [x] Resolución del tenant en cada request (subdominio o `tenantId` en sesión)
* [x] Prisma middleware que fuerza el filtro por `tenantId` en todas las consultas
* [x] Aislamiento de datos verificado (un tenant no puede leer datos de otro)
* [x] Bypass de aislamiento controlado para el rol `mango` (acceso global)

## Planes de Suscripción

Tres planes; el `tenant` queda asociado a un plan vigente.

```text
Gratuito   → funcionalidad base limitada
Pro        → 30.000 COP / mes  ·  precio anual con descuento
Pro+       → 50.000 COP / mes  ·  precio anual con descuento
```

### Entregables

* [x] Modelo `Plan` (gratuito / pro / pro+) con límites y features por plan
* [x] Asociación `Tenant → Plan` vigente
* [x] Gating de features según el plan del tenant (helpers / guards)
* [x] Plan Gratuito por defecto al crear un tenant
* [x] Definición de cuotas/límites por plan (proyectos, usuarios, almacenamiento)

> El cobro, la vigencia y la pasarela (Wompi) se implementan en la **FASE 11 — Pagos y Suscripciones**.

## Roles y permisos

Dos roles globales:

```text
admin  → administrador del tenant; gestiona su organización y datos
mango  → super usuario global; acceso transversal a cualquier dato de cualquier tenant,
         más herramientas de medición, seguimiento y analítica
```

### Usuarios y permisos

* [x] Login
* [x] Roles (`admin`, `mango`)
* [x] JWT / Session (con `tenantId` y `role` en el token/sesión)
* [x] Recuperación contraseña
* [x] Autorización por rol y por plan (middleware/guards)
* [x] El rol `mango` ignora el scoping por `tenantId` (acceso global de solo lectura/escritura según permisos)

### Comando `npm run mango`

Comando CLI personalizado para registrar un usuario con rol `mango` (super usuario).

* [x] Script `mango` en `package.json` (`tsx`/`ts-node` sobre `tsconfig.scripts.json`)
* [x] Formulario dinámico interactivo en terminal (prompts): nombre, email, contraseña, confirmación
* [x] Validación de datos con Zod (email único, fuerza de contraseña)
* [x] Hash de contraseña antes de persistir
* [x] Creación del usuario `mango` directamente vía Prisma (sin tenant asociado / acceso global)
* [x] Idempotencia / aviso si el email ya existe

```jsonc
// package.json
"scripts": {
  "mango": "tsx scripts/create-mango.ts"
}
```

### Navegación

* [x] Sidebar (adaptado a rol y plan)
* [x] Layout principal
* [x] Perfil
* [x] Indicador de plan vigente y estado de suscripción
* [x] Vista/consola exclusiva para rol `mango` (selector de tenant)

### Modelo inicial

```text
Tenant          (organización)
Plan            (gratuito / pro / pro+)
Subscription    (vigencia, ciclo: mensual/anual, estado)
Usuarios        (role: admin | mango, tenantId)
Clientes
Proyectos
Procesos
Tareas
Archivos
Eventos
```

---

# FASE 2 — Gestión de Proyectos

Objetivo: núcleo funcional.

## Proyectos y tareas

Campos:

* Cliente (opcional, relación con `Client`)
* Prioridad
* Tipo proceso
* Estado
* Fecha inicio
* Fecha cierre
* Responsable
* Tareas

---

## Funciones

* [x] CRUD proyectos
* [x] Vista detalle
* [x] Seguimiento
* [x] Búsqueda
* [x] Filtros
* [x] Etiquetas
* [x] Tareas

---

# FASE 3 — Gestión de Clientes

Objetivo: administrar el catálogo de contactos y empresas de la organización.

> El modelo `Client` y el scoping multitenant existen desde la FASE 1. Los proyectos (FASE 2)
> ya referencian `clientId` de forma opcional; esta fase aporta el CRUD y la UI que hoy falta
> (el selector de cliente en proyectos solo lista registros ya existentes).

## Clientes

Campos:

* Nombre
* Email
* Teléfono

---

## Funciones

* [x] CRUD clientes
* [x] Vista detalle
* [x] Seguimiento (resumen en detalle: proyectos asociados por estado, última actividad)
* [x] Búsqueda
* [x] Filtros
* [x] Etiquetas *(catálogo único compartido con proyectos: relación `Client ↔ Tag`)*
* [x] Proyectos asociados (listado enlazado desde el detalle del cliente)
* [x] Creación al vuelo desde el formulario de proyecto

---

# Convención transversal — TanStack Query (aplica de la FASE 4 en adelante)

Todo fetching y toda mutación de datos en componentes cliente se implementa con
**TanStack Query** (ya presente en el stack): query keys con scoping por tenant,
invalidación de caché tras cada mutación y estados de carga/error unificados.
Las fases ya completadas (0–3) se migran de forma oportunista cuando se toque su
código; las fases nuevas lo adoptan desde el inicio.

---

# FASE 4 — Equipo de trabajo y Notas

Objetivo: gestionar los miembros y equipos de la organización, y centralizar notas con alcance
contextual (global, proyecto, tarea o equipo).

> Los roles `MANAGER`, `MEMBER` y `VIEWER` existen en el esquema desde la FASE 1, pero hoy solo
> `admin` y `mango` tienen flujos de gestión. El widget «Notas recientes» del panel y la acción
> «Nueva nota» son placeholders de demo (spec 004).

## Equipo de trabajo

### Miembros

Campos:

* Nombre
* Email
* Rol (`admin` · `manager` · `member` · `viewer`)
* Estado (activo · invitado · inactivo)

### Equipos

Campos:

* Nombre
* Descripción
* Miembros

### Funciones — equipo

* [x] Invitar y dar de alta miembros del tenant *(invitación por enlace, 7 días, un solo uso — spec 007)*
* [x] Asignar y cambiar roles *(con guard de último admin)*
* [x] CRUD equipos de trabajo *(membresía M:N, detalle con composición)*
* [x] Listar miembros y equipos *(pestaña «Miembros» en ajustes; sección «Equipos» en el sidebar)*
* [x] Desactivar o revocar acceso *(revocación efectiva en login, datos y layout)*
* [x] Respetar cuota de usuarios por plan *(activos + invitados, transacción serializable)*
* [x] Carga por usuario (tareas/proyectos asignados) — alimenta FASE 7

## Notas

Cada nota tiene **un único alcance** (mutuamente excluyente):

```text
Global     → visible en toda la organización
Proyecto   → vinculada a un proyecto
Tarea      → vinculada a una tarea
Equipo     → vinculada a un equipo de trabajo
```

Campos:

* Título
* Contenido
* Alcance (global · proyecto · tarea · equipo)
* Referencia según alcance (`projectId`, `taskId`, `teamId` o ninguna si es global)
* Autor
* Fecha de creación / última edición

### Funciones — notas

* [x] CRUD notas *(alcance único validado en servidor; el alcance no se reasigna al editar)*
* [x] Filtro y listado por alcance *(listado central paginado en `/dashboard/notes`)*
* [x] Búsqueda por título y contenido *(insensible a acentos y mayúsculas)*
* [x] Notas en vista detalle de proyecto, tarea (Sheet lateral) y equipo
* [x] Widget «Notas recientes» del panel con datos reales
* [x] Acción rápida «Nueva nota» operativa
* [x] Permisos por rol (crear: todos salvo viewer; editar/eliminar: autor o admin/manager)

---

# FASE 5 — Kanban

Objetivo: operación visual.

## Tableros

Estados:

```text
Pendiente
En proceso
En revisión
Finalizado
Archivado
```

Funciones:

* [ ] Drag & Drop
* [ ] Swimlanes
* [ ] Filtros
* [ ] Asignación

---

# FASE 6 — Gantt

Objetivo: planeación temporal.

## Funciones

* [ ] Timeline
* [ ] Dependencias
* [ ] Duración
* [ ] Hitos
* [ ] Reprogramación

Vistas:

```text
Día
Semana
Mes
Trimestre
```

---

# FASE 7 — Dashboard Ejecutivo

Objetivo: analítica operativa con datos reales del tenant; sustituir los widgets demo heredados de la plantilla.

## Estado actual del panel (`/dashboard`)

Integrados con datos reales (FASE 2 / spec 004):

* [x] Tarjetas de resumen — tareas de hoy, progreso semanal personal, proyectos en curso
* [x] Sección de tareas — asignadas al usuario o sin responsable; filtro hoy/mañana/semana; vencidas destacadas
* [x] Sección de proyectos — todos los del tenant; filtro por estado; avance y fechas reales

Aún con datos estáticos o sin acción (pendiente de esta fase o de fases posteriores):

* [ ] Acciones rápidas — botones sin enlace (tarea, proyecto, meta, archivo) *(«Nueva nota» conectada en FASE 4)*
* [ ] Calendario lateral — selector de fecha sin eventos del sistema
* [ ] Concentración — temporizador Pomodoro placeholder
* [x] Notas recientes — sustituido por datos reales del tenant en FASE 4
* [ ] Resumen semanal lateral — metas fijas de demo (duplica parcialmente las tarjetas de resumen)
* [ ] Bloques Negocio / Finanzas / Analítica / Academia — widgets demo de plantilla (CRM, finance, analytics, academy)

## Widgets objetivo

### Operación

* [ ] Procesos activos
* [ ] Tareas vencidas *(parcial: destacadas en la sección de tareas; falta widget dedicado)*
* [ ] Próximos vencimientos
* [ ] Carga por usuario *(depende de FASE 4)*

### Gestión

* [ ] Proyectos por prioridad
* [ ] Proyectos por cliente *(depende de FASE 3)*
* [ ] Tiempo promedio
* [ ] Pagos pendientes *(depende de FASE 11)*
* [ ] Alertas

### Visualizaciones

* [ ] Barras
* [ ] Líneas
* [ ] Donut
* [ ] Heatmap

### Limpieza del panel

* [ ] Retirar o reemplazar los bloques demo (Negocio, Finanzas, Analítica, Academia) tras validación humana (spec 004, US3)
* [ ] Conectar acciones rápidas a flujos reales (nueva nota ✅ FASE 4; falta nuevo proyecto, nueva tarea, subir archivo)

### Consola Mango (medición, seguimiento y analítica global)

Herramientas exclusivas del rol `mango`, con visibilidad transversal a todos los tenants.

* [ ] Vista cross-tenant (métricas agregadas de toda la plataforma)
* [x] Selector / switch de tenant para inspeccionar datos de cualquier organización
* [ ] Métricas de adopción y uso por tenant (usuarios activos, proyectos, eventos)
* [ ] Distribución de tenants por plan (gratuito / pro / pro+)
* [ ] MRR / ingresos por suscripción y proyección (mensual vs anual)
* [ ] Tasa de conversión Gratuito → Pro / Pro+ y churn
* [ ] Seguimiento de suscripciones por vencer y vencidas
* [ ] Exportación de reportes (CSV / Excel)

---

# FASE 8 — Gestión Documental

Objetivo: centralizar archivos y documentos, con inteligencia sobre su contenido
(OCR, fechas de vencimiento, plazos y resúmenes).

## Archivos

* [ ] Subida archivos (MinIO)
* [ ] Versionado
* [ ] Adjuntos (proyecto, tarea, cliente)
* [ ] Historial

## Documentos (CRUD)

* [ ] CRUD documentos (crear, ver, editar metadatos, eliminar) respetando cuota de almacenamiento por plan
* [ ] Vista detalle con previsualización
* [ ] Búsqueda y filtros (tipo, proyecto, cliente, fechas)
* [ ] Asociación a proyecto, cliente o tarea

## OCR y análisis de contenido

* [ ] Pipeline OCR para PDF e imágenes (procesamiento asíncrono vía colas con Redis)
* [ ] Identificación de fechas de vencimiento en el documento
* [ ] Identificación de plazos y términos
* [ ] Resumen automático del documento
* [ ] Revisión/corrección humana de los datos extraídos antes de confirmarlos
* [ ] Las fechas de vencimiento confirmadas generan eventos y recordatorios (se conecta con FASE 9)

Campos:

```text
Nombre
Tipo
Recepción
Proyecto
Usuario
Fechas detectadas (vencimientos, plazos)
Resumen
Estado OCR (pendiente · procesado · revisado · error)
```

Incluye:

✔ Poder (fecha recepción)

---

# FASE 9 — Calendario y Recordatorios

Objetivo: automatización.

## Calendario

* [ ] Vista mensual
* [ ] Agenda

## Recordatorios

* [ ] Push
* [ ] Email
* [ ] Alarmas

Eventos:

```text
Inicio
Cierre
Pago
Actuación
```

---

# FASE 10 — Bitácora y Auditoría

Objetivo: trazabilidad.

Registrar:

* [ ] Usuario
* [ ] Acción
* [ ] Fecha
* [ ] Entidad

Timeline:

```text
Creado
Editado
Subido
Cerrado
```

---

# FASE 11 — Pagos y Suscripciones (Wompi)

Objetivo: control financiero, cobro de planes y control de vigencia de la suscripción.

## Integración con Wompi

* [ ] Cliente/SDK de Wompi configurado (llaves pública/privada, sandbox y producción)
* [ ] Generación de transacciones de pago (checkout / link de pago)
* [ ] Webhook de confirmación de transacción (verificación de firma/eventos)
* [ ] Conciliación: transacción Wompi → `Subscription` del tenant
* [ ] Manejo de estados de transacción (APPROVED / DECLINED / VOIDED / ERROR)

## Planes y precios

```text
Gratuito   → 0 COP
Pro        → 30.000 COP / mes   ·  anual (con descuento)
Pro+       → 50.000 COP / mes   ·  anual (con descuento)
```

Ciclos de cobro:

```text
Mensual
Anual
```

## Control de suscripción por vigencia

* [x] Modelo `Subscription` (plan, ciclo mensual/anual, fechaInicio, fechaFin, estado) — creado en FASE 1; falta la lógica de vigencia
* [ ] Cálculo de fecha de vencimiento según ciclo (mensual / anual)
* [ ] Cron Job diario que revisa suscripciones vencidas
* [ ] Al vencer la suscripción: degradar el tenant a plan Gratuito o bloquear features Pro/Pro+
* [ ] Recordatorios de vencimiento (próximo a vencer / vencido) — email / push
* [ ] Renovación (manual y/o automática vía Wompi)
* [ ] Historial de pagos por tenant

Estados de suscripción:

```text
Activa
Por vencer
Vencida
Cancelada
```

## Gestión de pagos (negocio del tenant)

* [ ] Registrar pagos
* [ ] Estados
* [ ] Facturación
* [ ] Recordatorios

Estados de pago:

```text
Pendiente
Parcial
Pagado
```

---

# FASE 12 — Rebranding a Project Manager

Objetivo: eliminar el branding heredado de la plantilla «Studio Admin» y consolidar
la identidad **Project Manager** antes del lanzamiento.

## Funciones

* [ ] Actualizar `src/config/app-config.ts` (nombre, descripción, metadatos de la app)
* [ ] Metadatos y SEO (títulos, descripciones, Open Graph)
* [ ] Logos, favicon y manifest
* [ ] Textos de UI: páginas de autenticación, landing y emails transaccionales
* [ ] Retirar o aislar las rutas demo heredadas de la plantilla (crm, finance, ecommerce, logistics, etc.)
* [ ] Actualizar README y documentación del proyecto
* [ ] Actualizar todas las vistas con el nuevo branding
* [ ] Metadatos y logo actualizados
* [ ] Logo personalizado subido

---

# FASE 13 — Producción

## Infraestructura

* [ ] Deploy
* [ ] HTTPS
* [ ] Backups
* [ ] Logs
* [ ] Monitoreo

Herramientas:

* Docker
* Nginx
* PM2
* Sentry

---

# FASE 14 — Plugins y Módulos por Tenant

Objetivo: extensibilidad post-lanzamiento — módulos activables que adaptan la
aplicación a las necesidades de cada tenant.

## Sistema de módulos

* [ ] Registro/catálogo de módulos disponibles (manifest: nombre, rutas, permisos, widgets)
* [ ] Activación y desactivación de módulos por tenant
* [ ] Gating por plan: qué módulos están disponibles en Gratuito / Pro / Pro+
* [ ] Navegación dinámica: el sidebar refleja los módulos activos del tenant
* [ ] Widgets de dashboard aportados por módulos activos

## Adaptaciones por tenant

* [ ] Configuración propia de cada módulo por tenant
* [ ] Aislamiento: un módulo solo accede a datos del tenant (vía `getTenantDb()`)
* [ ] Administración de módulos desde el panel del `admin` del tenant
* [ ] Gestión global de módulos desde la consola `mango` (habilitar/deshabilitar por tenant o plan)

# Minor Fix
- En el panel de bsuqueda no mostrar Consola Mango a usuarios que no tengan rol Mango
- Agregar CRUDs uno de palabras de bienvenida y otros de motivacionales, habilitar la funcion de activar o desactivar

# New Features
- diseñar onboarding
- nuevo sistema de temas (personalizacion avanzada)
- incluir test e2e con playwright
- incluir feature de test con covertura del 100%