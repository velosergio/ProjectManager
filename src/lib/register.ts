import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export interface RegisterInput {
  organizationName: string;
  name: string;
  email: string;
  password: string;
}

export type RegisterResult = { ok: true } | { ok: false; code: "EMAIL_TAKEN" | "NO_PLAN" };

/// Alta atómica de una organización en autoservicio: crea Tenant + usuario
/// `admin` + suscripción al plan Gratuito en una transacción (FR-007/FR-008).
export async function registerOrganization(input: RegisterInput): Promise<RegisterResult> {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    return { ok: false, code: "EMAIL_TAKEN" };
  }

  const freePlan = await prisma.plan.findUnique({ where: { code: "GRATUITO" } });
  if (!freePlan) {
    return { ok: false, code: "NO_PLAN" };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { name: input.organizationName } });
    await tx.user.create({
      data: { name: input.name, email: input.email, password: hashedPassword, role: "ADMIN", tenantId: tenant.id },
    });
    await tx.subscription.create({
      data: { tenantId: tenant.id, planId: freePlan.id, status: "ACTIVE", cycle: "MONTHLY" },
    });
  });

  return { ok: true };
}
