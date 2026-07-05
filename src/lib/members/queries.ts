import type { UserRole, UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Consultas de la gestión de miembros (FASE 4). `User` no es un modelo
// escopado por la extensión de tenant, así que el filtro por `tenantId` es
// explícito en cada consulta.

/// Carga de trabajo de un miembro (FR-011): tareas activas asignadas y
/// proyectos activos de los que es propietario.
export interface MemberWorkload {
  activeTasks: number;
  activeProjects: number;
}

/// Vista de un miembro para el listado de la pestaña «Miembros» (FR-001).
export interface MemberView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  /// Invitación pendiente (solo si status = INVITED): caducidad del enlace.
  invitation: { expiresAt: Date; expired: boolean } | null;
  workload: MemberWorkload;
}

/// Miembros del tenant con rol, estado, invitación pendiente (si aplica) y
/// carga de trabajo. La carga se agrega en dos `groupBy` (research D12):
/// tareas con `status ≠ DONE` por asignado y proyectos con
/// `status ∉ {COMPLETED, ARCHIVED}` por propietario — sin N+1.
export async function listMembers(tenantId: string): Promise<MemberView[]> {
  const [users, taskGroups, projectGroups] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        invitationTokens: {
          where: { usedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { expiresAt: true },
        },
      },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { tenantId, status: { not: "DONE" }, assigneeId: { not: null } },
      _count: { _all: true },
    }),
    prisma.project.groupBy({
      by: ["ownerId"],
      where: { tenantId, status: { notIn: ["COMPLETED", "ARCHIVED"] }, ownerId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const tasksByMember = new Map(taskGroups.map((group) => [group.assigneeId, group._count._all]));
  const projectsByMember = new Map(projectGroups.map((group) => [group.ownerId, group._count._all]));

  const now = Date.now();
  return users.map((user) => {
    const pending = user.status === "INVITED" ? (user.invitationTokens[0] ?? null) : null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      invitation: pending ? { expiresAt: pending.expiresAt, expired: pending.expiresAt.getTime() <= now } : null,
      workload: {
        activeTasks: tasksByMember.get(user.id) ?? 0,
        activeProjects: projectsByMember.get(user.id) ?? 0,
      },
    };
  });
}
