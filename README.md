# Project Manager

Gestor de proyectos **multitenant** (SaaS) construido sobre Next.js. Permite a cada organización
(tenant) administrar sus proyectos, procesos, tareas, documentos y pagos de forma aislada, con
planes de suscripción (Gratuito / Pro / Pro+) y roles diferenciados.

> El proyecto parte de la plantilla `next-shadcn-admin-dashboard`. Varias rutas de demostración
> bajo `src/app/(main)/dashboard/` (crm, finance, ecommerce, etc.) son ejemplos heredados de la
> plantilla y se irán reemplazando por las funcionalidades reales descritas en [`ROADMAP.md`](./ROADMAP.md).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (modo estricto)
- **Tailwind CSS v4** · **shadcn/ui** (Radix) · **Sonner** (notificaciones)
- **Prisma** ORM · **MySQL** (MariaDB en producción)
- **NextAuth v5** (Credentials + adapter Prisma, sesión JWT)
- **Zustand** · **TanStack Query / Table** · **React Hook Form** + **Zod**
- **Biome** (lint + formato) · **React Doctor** (calidad) · **Husky** + **lint-staged**

## Requisitos previos

- Node.js 22+
- MySQL (o MariaDB) en ejecución
- npm

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local: DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32), etc.

# 3. Preparar la base de datos
npm run db:migrate     # aplica migraciones
npm run db:seed        # (opcional) datos de ejemplo

# 4. Levantar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en [http://localhost:3000](http://localhost:3000).

## Comandos

| Comando                   | Descripción                                         |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Servidor de desarrollo                              |
| `npm run build`           | Build de producción (`output: standalone`)          |
| `npm run start`           | Sirve el build de producción                        |
| `npm run check`           | Biome: lint + formato (verificación)                |
| `npm run check:fix`       | Biome: corrige lint + formato                       |
| `npm run doctor`          | React Doctor (diagnósticos de calidad React)        |
| `npm run db:migrate`      | Crea/aplica migraciones en desarrollo               |
| `npm run db:push`         | Sincroniza el schema sin generar migración          |
| `npm run db:studio`       | Abre Prisma Studio                                  |
| `npm run db:seed`         | Ejecuta `prisma/seed.ts`                            |
| `npm run generate:presets`| Regenera los presets de tema                        |

## Estructura del proyecto

Arquitectura de **colocación por feature**: cada ruta vive en `src/app/` y agrupa sus piezas
locales en carpetas `_components/`.

```
src/
├── app/
│   ├── (external)/        # Páginas públicas / landing
│   ├── (main)/
│   │   ├── auth/          # Login y registro
│   │   └── dashboard/     # App autenticada (sidebar + vistas)
│   └── api/               # Route handlers (auth, registro)
├── components/            # UI compartida (ui/ y calendar/ son generados)
├── config/               # Configuración de la app
├── lib/                  # auth, prisma, utils, preferencias/temas
├── navigation/           # Definición del sidebar
└── server/               # Server Actions
prisma/                   # schema.prisma + migraciones
```

## Calidad de código

Antes de fusionar a `main`, todo cambio debe cumplir las puertas de calidad definidas en la
[constitución del proyecto](./.specify/memory/constitution.md):

1. `npm run check` (Biome) pasa al 100 %, sin errores ni advertencias.
2. React Doctor sin diagnósticos pendientes.
3. TypeScript y `npm run build` sin errores.

Los hooks de pre-commit (Husky + lint-staged) ejecutan estas verificaciones automáticamente.

## Despliegue

Incluye un `Dockerfile` multi-stage con salida `standalone`, preparado para EasyPanel. MySQL/MariaDB
y Redis se gestionan como servicios externos; el contenedor aplica migraciones antes de arrancar.

## Documentación

- [`ROADMAP.md`](./ROADMAP.md) — fases y alcance funcional del producto.
- [`CLAUDE.md`](./CLAUDE.md) — guía de arquitectura y convenciones para trabajar en el repo.
- [`.specify/memory/constitution.md`](./.specify/memory/constitution.md) — principios y puertas de calidad.
