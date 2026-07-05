import type { ScopedPrismaClient } from "@/lib/tenant-db";

// Consultas de los equipos de trabajo (FASE 4, US2). Reciben el cliente
// escopado al tenant; alimentan el listado y el detalle (FR-014). La lectura
// está permitida a todos los roles del tenant.

/// Listado de equipos con conteo de miembros y de notas asociadas, ordenado
/// alfabéticamente (FR-014).
export async function listTeams(db: ScopedPrismaClient) {
  const teams = await db.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      _count: { select: { members: true, notes: true } },
    },
  });
  return teams.map(({ _count, ...team }) => ({ ...team, memberCount: _count.members, noteCount: _count.notes }));
}

/// Fila del listado (salida de `listTeams`).
export type TeamRow = Awaited<ReturnType<typeof listTeams>>[number];

/// Detalle de un equipo con su composición (FR-014). Devuelve `null` si el
/// equipo no existe en el tenant (la página hace 404).
export async function getTeamDetail(db: ScopedPrismaClient, teamId: string) {
  return db.team.findFirst({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      members: {
        select: { id: true, name: true, email: true, role: true, status: true },
        orderBy: { name: "asc" },
      },
    },
  });
}

/// Detalle completo (salida no nula de `getTeamDetail`).
export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamDetail>>>;
