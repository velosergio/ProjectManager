import type { PlanCode, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { PLANS, seedPlans } from "../../prisma/seed-plans";

// Utilidades compartidas por las pruebas de integración de la FASE 4.

/// ¿El catálogo de planes de la base ya coincide con el seed? Evita upserts
/// innecesarios: si cada archivo de prueba sembrara en paralelo, los writes
/// sobre `plans` chocarían con las transacciones Serializable de otros tests
/// («Record has changed since last read»).
async function plansUpToDate(): Promise<boolean> {
  const rows = await prisma.plan.findMany({ select: { code: true, maxUsers: true, maxProjects: true } });
  const byCode = new Map(rows.map((row) => [row.code, row]));
  return PLANS.every((plan) => {
    const row = byCode.get(plan.code);
    return row !== undefined && row.maxUsers === plan.maxUsers && row.maxProjects === plan.maxProjects;
  });
}

/// Garantiza el catálogo de planes sembrado, tolerando la concurrencia entre
/// archivos de prueba (vitest los ejecuta en paralelo).
export async function ensurePlansSeeded(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      if (await plansUpToDate()) {
        return;
      }
      await seedPlans(prisma);
      return;
    } catch (error) {
      if (attempt >= 3) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
}

/// Tenant de prueba con suscripción activa al plan indicado.
export async function createTestTenant(name: string, planCode: PlanCode): Promise<string> {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: planCode } });
  const tenant = await prisma.tenant.create({ data: { name } });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" },
  });
  return tenant.id;
}

export interface TestActor {
  userId: string;
  role: UserRole;
  tenantId: string;
}

/// Usuario activo del tenant con el rol indicado; email único por etiqueta.
export async function createTestUser(tenantId: string, role: UserRole, label: string): Promise<TestActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}@test.local`, role, tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role, tenantId };
}
