#!/bin/sh
set -e

echo "Aplicando migraciones de Prisma..."
prisma migrate deploy

if [ "${AUTO_DB_SEED:-true}" = "true" ]; then
  echo "Comprobando seed inicial de planes..."
  tsx scripts/seed-if-needed.ts
else
  echo "Seed automático desactivado (AUTO_DB_SEED=false)."
fi

echo "Iniciando servidor Next.js..."
exec node server.js
