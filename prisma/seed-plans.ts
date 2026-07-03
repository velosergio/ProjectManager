import type { PlanCode, PrismaClient } from "../src/generated/prisma/client";

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

export async function seedPlans(client: PrismaClient) {
  for (const plan of PLANS) {
    await client.plan.upsert({
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
