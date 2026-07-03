import type { Prisma, ProjectStatus } from "@/generated/prisma/client";
import { PROJECT_STATUS_ORDER } from "@/lib/projects/labels";
import type { ScopedPrismaClient } from "@/lib/tenant-db";

import type { ClientFilters } from "./schemas";

// Consultas de la feature de clientes (FASE 3). Reciben el cliente escopado;
// son la única fuente de datos del listado y el detalle. El seguimiento se
// deriva en lectura con agregaciones (sin N+1, research §3).

const CLIENTS_PAGE_SIZE = 20;

// ── Listado ──────────────────────────────────────────────────────────────────

/// Estados que cuentan como «proyecto activo» para el filtro (FR-010).
const INACTIVE_PROJECT_STATUSES: ProjectStatus[] = ["COMPLETED", "ARCHIVED"];

/// Listado paginado en servidor (FR-001/FR-015) con etiquetas y conteo de
/// proyectos por cliente. Búsqueda y filtros combinables (FR-009/FR-010):
/// `q` es insensible a mayúsculas y acentos vía la colación `*_ai_ci` de MySQL.
export async function listClients(db: ScopedPrismaClient, filters: ClientFilters) {
  const where: Prisma.ClientWhereInput = {};
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { email: { contains: filters.q } },
      { phone: { contains: filters.q } },
    ];
  }
  if (filters.tagId) {
    where.tags = { some: { id: filters.tagId } };
  }
  if (filters.active) {
    where.projects = { some: { status: { notIn: INACTIVE_PROJECT_STATUSES } } };
  }
  const [total, clients] = await Promise.all([
    db.client.count({ where }),
    db.client.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (filters.page - 1) * CLIENTS_PAGE_SIZE,
      take: CLIENTS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        _count: { select: { projects: true } },
      },
    }),
  ]);

  return { clients, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE)) };
}

/// Fila del listado (salida de `listClients`).
export type ClientRow = Awaited<ReturnType<typeof listClients>>["clients"][number];

// ── Detalle ──────────────────────────────────────────────────────────────────

/// Detalle de un cliente con seguimiento (FR-006..FR-008): datos de contacto,
/// etiquetas, proyectos asociados, conteos por estado y última actividad
/// (máximo entre `updatedAt` del cliente y de sus proyectos). Una sola pasada
/// paralela — findFirst + groupBy + aggregate — sin N+1 (research §3).
/// Devuelve `null` si el cliente no existe en el tenant (la página hace 404).
export async function getClientDetail(db: ScopedPrismaClient, clientId: string) {
  const [client, grouped, latest] = await Promise.all([
    db.client.findFirst({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        projects: {
          select: { id: true, name: true, status: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    db.project.groupBy({ by: ["status"], where: { clientId }, _count: { _all: true } }),
    db.project.aggregate({ where: { clientId }, _max: { updatedAt: true } }),
  ]);

  if (!client) {
    return null;
  }

  const statusCounts = Object.fromEntries(PROJECT_STATUS_ORDER.map((status) => [status, 0])) as Record<
    ProjectStatus,
    number
  >;
  for (const group of grouped) {
    statusCounts[group.status] = group._count._all;
  }

  const lastProjectActivity = latest._max.updatedAt;
  const lastActivityAt =
    lastProjectActivity && lastProjectActivity > client.updatedAt ? lastProjectActivity : client.updatedAt;

  return { ...client, statusCounts, lastActivityAt };
}

/// Detalle completo (salida no nula de `getClientDetail`).
export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClientDetail>>>;
