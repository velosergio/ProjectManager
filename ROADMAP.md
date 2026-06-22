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

# Roadmap General

Duración estimada:

---

# FASE 0 — Instalación y Configuración Base

Objetivo: dejar el entorno completamente reproducible.

## Infraestructura inicial

### Entregables

* Dockerizado
* Base Next.js funcional
* MySQL conectado
* Prisma configurado
* Variables de entorno
* CI/CD básico
* Spec Driven Development (Constitucion del proyecto y Spec inicial)

# FASE 1 — Core del Sistema + Arquitectura Multitenant

Objetivo: estructura base del Project Manager con aislamiento multitenant, planes y roles.

## Arquitectura Multitenant

Modelo de aislamiento: **un tenant (organización) por cliente**, con `tenantId` en todas
las entidades de negocio. Estrategia inicial: base de datos compartida con discriminador
por `tenantId` (shared DB, shared schema) + scoping obligatorio en cada query (Prisma
middleware / extensión que inyecta el `tenantId` del contexto).

### Entregables

* [ ] Modelo `Tenant` (organización) y relación con `Usuario`
* [ ] Resolución del tenant en cada request (subdominio o `tenantId` en sesión)
* [ ] Prisma middleware que fuerza el filtro por `tenantId` en todas las consultas
* [ ] Aislamiento de datos verificado (un tenant no puede leer datos de otro)
* [ ] Bypass de aislamiento controlado para el rol `mango` (acceso global)

## Planes de Suscripción

Tres planes; el `tenant` queda asociado a un plan vigente.

```text
Gratuito   → funcionalidad base limitada
Pro        → 30.000 COP / mes  ·  precio anual con descuento
Pro+       → 50.000 COP / mes  ·  precio anual con descuento
```

### Entregables

* [ ] Modelo `Plan` (gratuito / pro / pro+) con límites y features por plan
* [ ] Asociación `Tenant → Plan` vigente
* [ ] Gating de features según el plan del tenant (helpers / guards)
* [ ] Plan Gratuito por defecto al crear un tenant
* [ ] Definición de cuotas/límites por plan (proyectos, usuarios, almacenamiento)

> El cobro, la vigencia y la pasarela (Wompi) se implementan en la **FASE 9 — Pagos y Suscripciones**.

## Roles y permisos

Dos roles globales:

```text
admin  → administrador del tenant; gestiona su organización y datos
mango  → super usuario global; acceso transversal a cualquier dato de cualquier tenant,
         más herramientas de medición, seguimiento y analítica
```

### Usuarios y permisos

* [ ] Login
* [ ] Roles (`admin`, `mango`)
* [ ] JWT / Session (con `tenantId` y `role` en el token/sesión)
* [ ] Recuperación contraseña
* [ ] Autorización por rol y por plan (middleware/guards)
* [ ] El rol `mango` ignora el scoping por `tenantId` (acceso global de solo lectura/escritura según permisos)

### Comando `npm run mango`

Comando CLI personalizado para registrar un usuario con rol `mango` (super usuario).

* [ ] Script `mango` en `package.json` (`tsx`/`ts-node` sobre `tsconfig.scripts.json`)
* [ ] Formulario dinámico interactivo en terminal (prompts): nombre, email, contraseña, confirmación
* [ ] Validación de datos con Zod (email único, fuerza de contraseña)
* [ ] Hash de contraseña antes de persistir
* [ ] Creación del usuario `mango` directamente vía Prisma (sin tenant asociado / acceso global)
* [ ] Idempotencia / aviso si el email ya existe

```jsonc
// package.json
"scripts": {
  "mango": "tsx scripts/create-mango.ts"
}
```

### Navegación

* [ ] Sidebar (adaptado a rol y plan)
* [ ] Layout principal
* [ ] Perfil
* [ ] Indicador de plan vigente y estado de suscripción
* [ ] Vista/consola exclusiva para rol `mango` (selector de tenant)

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

## Proyecto

Campos:

* Nombre cliente
* Prioridad
* Tipo proceso
* Estado
* Fecha inicio
* Fecha cierre
* Responsable

---

## Funciones

* [ ] CRUD proyectos
* [ ] Vista detalle
* [ ] Seguimiento
* [ ] Búsqueda
* [ ] Filtros
* [ ] Etiquetas

---

# FASE 3 — Kanban

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

# FASE 4 — Gantt

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

# FASE 5 — Dashboard Ejecutivo

Objetivo: analítica.

## Widgets

### Operación

* [ ] Procesos activos
* [ ] Tareas vencidas
* [ ] Próximos vencimientos
* [ ] Carga por usuario

### Gestión

* [ ] Proyectos por prioridad
* [ ] Tiempo promedio
* [ ] Pagos pendientes
* [ ] Alertas

### Visualizaciones

* [ ] Barras
* [ ] Líneas
* [ ] Donut
* [ ] Heatmap

### Consola Mango (medición, seguimiento y analítica global)

Herramientas exclusivas del rol `mango`, con visibilidad transversal a todos los tenants.

* [ ] Vista cross-tenant (métricas agregadas de toda la plataforma)
* [ ] Selector / switch de tenant para inspeccionar datos de cualquier organización
* [ ] Métricas de adopción y uso por tenant (usuarios activos, proyectos, eventos)
* [ ] Distribución de tenants por plan (gratuito / pro / pro+)
* [ ] MRR / ingresos por suscripción y proyección (mensual vs anual)
* [ ] Tasa de conversión Gratuito → Pro / Pro+ y churn
* [ ] Seguimiento de suscripciones por vencer y vencidas
* [ ] Exportación de reportes (CSV / Excel)

---

# FASE 6 — Gestión Documental

Objetivo: centralizar archivos.

## Funciones

* [ ] Subida archivos
* [ ] Versionado
* [ ] Adjuntos
* [ ] Historial

Campos:

```text
Nombre
Tipo
Recepción
Proyecto
Usuario
```

Incluye:

✔ Poder (fecha recepción)

---

# FASE 7 — Calendario y Recordatorios

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

# FASE 8 — Bitácora y Auditoría

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

# FASE 9 — Pagos y Suscripciones (Wompi)

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

* [ ] Modelo `Subscription` (plan, ciclo mensual/anual, fechaInicio, fechaFin, estado)
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

# FASE 10 — Producción

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
