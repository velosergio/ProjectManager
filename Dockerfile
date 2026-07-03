# =============================================================================
# Project Manager — Dockerfile
# Build multi-stage optimizado para despliegue en EasyPanel.
# El contenedor SOLO levanta la app Next.js (standalone); MariaDB y Redis son
# servicios externos gestionados por EasyPanel.
#
# Etapas:
#   1. deps     — instala dependencias (prod + dev, necesarias para el build)
#   2. builder  — genera el cliente Prisma + compila Next.js
#   3. runner   — imagen mínima de producción (output standalone)
#
# Arranque: migraciones + seed condicional vía `scripts/docker-entrypoint.sh`.
# `AUTO_DB_SEED=true` (por defecto) ejecuta el seed solo si la tabla Plan está
# vacía. Desactívalo con `AUTO_DB_SEED=false` en EasyPanel si hace falta.
#
# Super usuario: `npm run mango` también funciona desde la consola del
# contenedor (tsx global + script + cliente Prisma generado incluidos).
# =============================================================================

ARG NODE_VERSION=24-alpine

# -----------------------------------------------------------------------------
# Etapa 1: deps — instala todas las dependencias
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

# Compatibilidad libc en Alpine (requerida por algunos módulos nativos)
RUN apk add --no-cache libc6-compat openssl

# Copiar solo los manifiestos primero para maximizar la caché de capas
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Instala todas las deps (incluye devDeps necesarias para el build)
RUN npm ci

# -----------------------------------------------------------------------------
# Etapa 2: builder — genera cliente Prisma + compila Next.js
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Variables de build — los valores reales se inyectan en runtime vía EasyPanel.
# Estos placeholders satisfacen el análisis estático de Next.js sin hornear
# secretos en la imagen. NO pasar secretos reales como build args.
ARG DATABASE_URL="mysql://placeholder:placeholder@placeholder:3306/project_manager"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG NEXTAUTH_SECRET="build-time-placeholder-replace-at-runtime"
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"

ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Genera el cliente Prisma para la plataforma destino
RUN npx prisma generate

# Compila Next.js (produce .next/standalone) con webpack en lugar de
# Turbopack: el pico de RAM medido baja de ~4,7 GB a ~1,8 GB, imprescindible
# para que el VPS no mate el contenedor durante el build del deploy.
RUN npm run build:docker

# -----------------------------------------------------------------------------
# Etapa 3: runner — imagen mínima de producción
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Compatibilidad de binarios de Prisma en Alpine
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Output standalone de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma 7: el cliente generado ya viaja dentro de .next/standalone. Copiamos
# además el schema + migraciones, la config (aporta la URL del datasource) y el
# CLI de Prisma con sus dependencias para `migrate deploy` en el arranque.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

# Soporte para `npm run mango` desde la consola del contenedor (crear el super
# usuario). El CLI es TypeScript, así que necesita: tsx (global, es devDep y no
# viaja en standalone), el script, el schema Zod compartido, el cliente Prisma
# generado (fuentes TS en src/generated) y @clack/prompts (solo lo usa el CLI,
# el trace de Next no lo incluye). bcryptjs, zod y mariadb ya vienen en el
# node_modules trazado del standalone porque la app los usa en runtime.
RUN npm install -g tsx@4.23.0
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/mango-schema.ts ./src/lib/mango-schema.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@clack ./node_modules/@clack

# Entrypoint: migraciones automáticas antes de levantar la app
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV AUTO_DB_SEED=true

CMD ["./docker-entrypoint.sh"]
