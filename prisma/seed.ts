import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config as loadEnv } from "dotenv";

import { type PlanCode, PrismaClient } from "../src/generated/prisma/client";

// El seed se ejecuta con `tsx` (fuera del bundler de Next), así que cargamos las
// variables y construimos el cliente con el driver adapter, igual que en runtime.
loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });

const GIB = BigInt(1024 ** 3);

// Catálogo de planes. Las cuotas son parametrizables (null = ilimitado); estos
// valores son los predeterminados de arranque y pueden ajustarse según negocio.
const PLANS: Array<{
  code: PlanCode;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxProjects: number | null;
  maxUsers: number | null;
  maxStorageBytes: bigint | null;
}> = [
  {
    code: "GRATUITO",
    name: "Gratuito",
    priceMonthly: 0,
    priceYearly: 0,
    maxProjects: 3,
    maxUsers: 1,
    maxStorageBytes: GIB,
  },
  {
    code: "PRO",
    name: "Pro",
    priceMonthly: 30000,
    // Precio anual con descuento (~20 %).
    priceYearly: 288000,
    maxProjects: null,
    maxUsers: 1,
    maxStorageBytes: null,
  },
  {
    code: "PRO_PLUS",
    name: "Pro+",
    priceMonthly: 50000,
    // Precio anual con descuento (~20 %).
    priceYearly: 480000,
    maxProjects: null,
    maxUsers: 1,
    maxStorageBytes: null,
  },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxProjects: plan.maxProjects,
        maxUsers: plan.maxUsers,
        maxStorageBytes: plan.maxStorageBytes,
      },
      create: plan,
    });
    console.log(`✔ Plan listo: ${plan.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
