import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/// Modelos de negocio sujetos al scoping automático por `tenantId`.
/// `User`, `Plan`, `PasswordResetToken`, `InvitationToken` y los modelos del
/// adapter de NextAuth quedan FUERA (se acceden con el cliente base).
export const SCOPED_MODELS = new Set<string>([
  "Client",
  "Project",
  "Process",
  "Task",
  "FileAsset",
  "Event",
  "Subscription",
  "Tag",
  "ProcessType",
  "Team",
  "Note",
]);

type AnyArgs = Record<string, unknown>;

/// Inyecta el `tenantId` en los argumentos de una operación de un modelo
/// escopado. Función pura: facilita las pruebas unitarias (FR-002/FR-003).
export function applyTenantScope(operation: string, args: AnyArgs | undefined, tenantId: string): AnyArgs {
  const next: AnyArgs = { ...(args ?? {}) };

  switch (operation) {
    case "findUnique":
    case "findUniqueOrThrow":
    case "findFirst":
    case "findFirstOrThrow":
    case "findMany":
    case "count":
    case "aggregate":
    case "groupBy":
    case "update":
    case "updateMany":
    case "delete":
    case "deleteMany": {
      next.where = { ...((next.where as AnyArgs | undefined) ?? {}), tenantId };
      break;
    }
    case "create": {
      next.data = { ...((next.data as AnyArgs | undefined) ?? {}), tenantId };
      break;
    }
    case "createMany": {
      const data = next.data;
      next.data = Array.isArray(data)
        ? data.map((row) => ({ ...(row as AnyArgs), tenantId }))
        : { ...((data as AnyArgs | undefined) ?? {}), tenantId };
      break;
    }
    case "upsert": {
      next.where = { ...((next.where as AnyArgs | undefined) ?? {}), tenantId };
      next.create = { ...((next.create as AnyArgs | undefined) ?? {}), tenantId };
      break;
    }
    default:
      break;
  }

  return next;
}

/// Extensión de Prisma que fuerza el filtrado por `tenantId` en los modelos
/// escopados. Aprovecha `extendedWhereUnique` (GA en Prisma 5+/7) para poder
/// añadir `tenantId` también en `findUnique`/`update`/`delete`.
function tenantScoping(tenantId: string) {
  return Prisma.defineExtension({
    name: "tenant-scoping",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!model || !SCOPED_MODELS.has(model)) {
            return query(args);
          }
          const scoped = applyTenantScope(operation, args as AnyArgs, tenantId);
          return query(scoped);
        },
      },
    },
  });
}

/// Cliente Prisma escopado a un `tenantId` concreto. Útil en pruebas y donde el
/// tenant ya se conoce sin pasar por la sesión.
export function scopedClientFor(tenantId: string) {
  return prisma.$extends(tenantScoping(tenantId));
}

export type ScopedPrismaClient = ReturnType<typeof scopedClientFor>;
