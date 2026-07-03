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
# Migraciones: NO se ejecutan en el arranque. El CLI de Prisma queda incluido
# en la imagen para poder aplicarlas manualmente desde la consola del
# contenedor en EasyPanel:  npx prisma migrate deploy
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

# Compila Next.js (produce .next/standalone)
RUN npm run build

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
# CLI de Prisma con sus dependencias, SOLO para poder ejecutar migraciones a
# demanda desde la consola del contenedor (npx prisma migrate deploy).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Solo levanta la app — sin entrypoint ni migraciones en el arranque
CMD ["node", "server.js"]
