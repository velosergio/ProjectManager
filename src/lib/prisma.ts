import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";

// Reutiliza una única instancia de PrismaClient en desarrollo para evitar
// agotar las conexiones por el hot-reload de Next.js.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }

  // Prisma 7 usa el cliente sin engine de Rust: la conexión la gestiona un
  // driver adapter. Para MySQL/MariaDB usamos `@prisma/adapter-mariadb`.
  return new PrismaClient({
    adapter: new PrismaMariaDb(connectionString),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
