# =============================================================================
# Project Manager — Dockerfile
# Multi-stage build optimized for EasyPanel deployment.
# External services (MariaDB, Redis) are managed separately.
#
# Stages:
#   1. deps     — install production + dev dependencies
#   2. builder  — generate Prisma client + build Next.js
#   3. runner   — minimal production image (standalone output)
# =============================================================================

ARG NODE_VERSION=22-alpine

# -----------------------------------------------------------------------------
# Stage 1: deps — install all dependencies
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

# Install libc compat for Alpine (needed by some native modules)
RUN apk add --no-cache libc6-compat openssl

# Copy only lockfiles first to maximise layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install all deps (including devDeps needed for build)
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: builder — generate Prisma client + compile Next.js
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Build-time env vars — real values are injected at runtime via EasyPanel.
# These placeholders satisfy Next.js static analysis without baking in secrets.
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

# Generate Prisma client for the target platform
RUN npx prisma generate

# Build Next.js (produces .next/standalone)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: runner — minimal production image
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Required for Prisma binary compatibility on Alpine
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma 7: el cliente generado se empaqueta dentro de .next/standalone, así que
# ya NO existe node_modules/.prisma. Para poder ejecutar `prisma migrate deploy`
# en el arranque copiamos el schema + migraciones, el archivo de configuración
# (aporta la URL del datasource, que ya no vive en el schema) y el CLI de Prisma
# con sus dependencias (@prisma/*, prisma, dotenv).
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

# Copy the startup script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start the app
ENTRYPOINT ["./docker-entrypoint.sh"]
