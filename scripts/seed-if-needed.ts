import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config as loadEnv } from "dotenv";

import { seedPlans } from "../prisma/seed-plans";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });

async function main() {
  const planCount = await prisma.plan.count();
  if (planCount > 0) {
    console.log(`Seed omitido: ya hay ${planCount} plan(es) en la base de datos.`);
    return;
  }

  console.log("Ejecutando seed inicial de planes...");
  await seedPlans(prisma);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
