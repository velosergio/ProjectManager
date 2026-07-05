import type { PlanCode, PrismaClient, ProjectPriority, ProjectStatus } from "@/generated/prisma/client";
import { FeatureNotInPlanError, QuotaExceededError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

import { PLAN_FEATURES, type PlanFeature } from "./definitions";

export type QuotaResource = "projects" | "users" | "storage";

/// Subconjunto del cliente Prisma necesario para comprobar cuotas. Lo satisfacen
/// tanto el cliente base como el cliente de transacción.
type QuotaDb = Pick<PrismaClient, "subscription" | "project" | "user" | "fileAsset">;

/// Lanza si el plan vigente no incluye la función solicitada (FR-012).
export function assertFeature(planCode: PlanCode, feature: PlanFeature): void {
  if (!PLAN_FEATURES[planCode]?.[feature]) {
    throw new FeatureNotInPlanError(feature);
  }
}

/// Comprueba que el tenant no supere la cuota del recurso indicado al añadir
/// `delta` unidades. `null` en la cuota = ilimitado. Lanza `QuotaExceededError`
/// si se superaría (FR-011/FR-011a).
export async function assertWithinQuota(
  db: QuotaDb,
  tenantId: string,
  resource: QuotaResource,
  delta = 1,
): Promise<void> {
  const subscription = await db.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
  const plan = subscription?.plan;
  if (!plan) {
    // Sin plan vigente no hay cupo disponible.
    throw new QuotaExceededError(resource, 0, 0);
  }

  const limit =
    resource === "projects" ? plan.maxProjects : resource === "users" ? plan.maxUsers : plan.maxStorageBytes;
  if (limit === null) {
    return; // ilimitado
  }

  let current: number;
  if (resource === "projects") {
    current = await db.project.count({ where: { tenantId } });
  } else if (resource === "users") {
    // Activos e invitados consumen cupo; los inactivos lo liberan (FASE 4,
    // FR-009 / Clarifications).
    current = await db.user.count({ where: { tenantId, status: { in: ["ACTIVE", "INVITED"] } } });
  } else {
    const aggregate = await db.fileAsset.aggregate({ _sum: { sizeBytes: true }, where: { tenantId } });
    current = Number(aggregate._sum.sizeBytes ?? BigInt(0));
  }

  const max = Number(limit);
  if (current + delta > max) {
    throw new QuotaExceededError(resource, max, current);
  }
}

/// Datos de creación de un proyecto (FASE 2). Los ids referenciados DEBEN
/// venir ya verificados contra el tenant por la capa de mutaciones.
export interface CreateProjectData {
  name: string;
  description?: string | null;
  clientId?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date | null;
  endDate?: Date | null;
  ownerId?: string | null;
  processTypeId?: string | null;
  tagIds?: string[];
}

/// Crea un proyecto respetando la cuota del plan, de forma atómica frente a
/// concurrencia: la comprobación y la creación corren en una única transacción
/// serializable (edge "Concurrencia en el límite de cuota"). Crea además el
/// proceso por defecto «General» del proyecto (FASE 2, research D2).
export async function createProjectWithQuota(tenantId: string, data: CreateProjectData) {
  return prisma.$transaction(
    async (tx) => {
      await assertWithinQuota(tx, tenantId, "projects");
      const project = await tx.project.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description ?? null,
          clientId: data.clientId ?? null,
          status: data.status ?? "PENDING",
          priority: data.priority ?? "MEDIUM",
          startDate: data.startDate ?? null,
          endDate: data.endDate ?? null,
          ownerId: data.ownerId ?? null,
          processTypeId: data.processTypeId ?? null,
          ...(data.tagIds && data.tagIds.length > 0 ? { tags: { connect: data.tagIds.map((id) => ({ id })) } } : {}),
        },
      });
      await tx.process.create({ data: { tenantId, projectId: project.id, name: "General", order: 0 } });
      return project;
    },
    { isolationLevel: "Serializable" },
  );
}
