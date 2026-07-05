import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import type { TeamMutationActor } from "@/lib/teams/mutations";
import { createTeam, deleteTeam, getTeamDeletionImpact, setTeamMembers, updateTeam } from "@/lib/teams/mutations";
import { getTeamDetail, listTeams } from "@/lib/teams/queries";
import { type ScopedPrismaClient, scopedClientFor } from "@/lib/tenant-db";

import { createTestTenant, createTestUser, ensurePlansSeeded, type TestActor } from "./helpers";

// Equipos de trabajo (US2): CRUD con validaciones, membresía M:N, permisos por
// rol y aislamiento entre tenants (FR-012..FR-015). La cascada de notas al
// eliminar un equipo se re-verifica en US3 (notes-crud).

const stamp = Date.now();

let tenantA: string;
let tenantB: string;
let dbA: ScopedPrismaClient;
let dbB: ScopedPrismaClient;
let adminA: TestActor;
let managerA: TestActor;
let memberA: TestActor;
let member2A: TestActor;
let viewerA: TestActor;
let adminB: TestActor;

/// Los helpers de prueba devuelven la misma forma que exige la mutación.
function asActor(actor: TestActor): TeamMutationActor {
  return actor;
}

beforeAll(async () => {
  await ensurePlansSeeded();
  tenantA = await createTestTenant(`EQU-A ${stamp}`, "PRO_PLUS");
  tenantB = await createTestTenant(`EQU-B ${stamp}`, "PRO_PLUS");
  dbA = scopedClientFor(tenantA);
  dbB = scopedClientFor(tenantB);
  adminA = await createTestUser(tenantA, "ADMIN", `equ-admin-a-${stamp}`);
  managerA = await createTestUser(tenantA, "MANAGER", `equ-manager-a-${stamp}`);
  memberA = await createTestUser(tenantA, "MEMBER", `equ-member-a-${stamp}`);
  member2A = await createTestUser(tenantA, "MEMBER", `equ-member2-a-${stamp}`);
  viewerA = await createTestUser(tenantA, "VIEWER", `equ-viewer-a-${stamp}`);
  adminB = await createTestUser(tenantB, "ADMIN", `equ-admin-b-${stamp}`);
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("createTeam", () => {
  it("crea un equipo con nombre, descripción y miembros iniciales", async () => {
    const team = await createTeam(dbA, asActor(adminA), {
      name: `Diseño ${stamp}`,
      description: "Equipo de diseño de producto",
      memberIds: [memberA.userId, member2A.userId],
    });
    expect(team.tenantId).toBe(tenantA);
    const detail = await getTeamDetail(dbA, team.id);
    expect(detail?.members.map((member) => member.id).sort()).toEqual([memberA.userId, member2A.userId].sort());
  });

  it("MANAGER también puede crear equipos", async () => {
    const team = await createTeam(dbA, asActor(managerA), { name: `Marketing ${stamp}` });
    expect(team.name).toBe(`Marketing ${stamp}`);
  });

  it("rechaza un equipo sin nombre", async () => {
    await expect(createTeam(dbA, asActor(adminA), { name: "   " })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("MEMBER y VIEWER no pueden crear equipos", async () => {
    await expect(createTeam(dbA, asActor(memberA), { name: "No permitido" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
    await expect(createTeam(dbA, asActor(viewerA), { name: "No permitido" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });

  it("rechaza miembros de otro tenant sin filtrar su existencia", async () => {
    await expect(
      createTeam(dbA, asActor(adminA), { name: `Intruso ${stamp}`, memberIds: [adminB.userId] }),
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });
});

describe("membresía M:N", () => {
  it("un miembro puede pertenecer a varios equipos a la vez (FR-013)", async () => {
    const alpha = await createTeam(dbA, asActor(adminA), { name: `Alfa ${stamp}`, memberIds: [memberA.userId] });
    const beta = await createTeam(dbA, asActor(adminA), { name: `Beta ${stamp}`, memberIds: [memberA.userId] });
    const memberships = await prisma.user.findUniqueOrThrow({
      where: { id: memberA.userId },
      select: { teams: { select: { id: true } } },
    });
    const teamIds = new Set(memberships.teams.map((team) => team.id));
    expect(teamIds.has(alpha.id)).toBe(true);
    expect(teamIds.has(beta.id)).toBe(true);
  });

  it("setTeamMembers reemplaza la composición completa", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Rotación ${stamp}`, memberIds: [memberA.userId] });
    await setTeamMembers(dbA, asActor(adminA), { teamId: team.id, memberIds: [member2A.userId, viewerA.userId] });
    const detail = await getTeamDetail(dbA, team.id);
    expect(detail?.members.map((member) => member.id).sort()).toEqual([member2A.userId, viewerA.userId].sort());
  });

  it("setTeamMembers rechaza usuarios de otro tenant", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Frontera ${stamp}` });
    await expect(
      setTeamMembers(dbA, asActor(adminA), { teamId: team.id, memberIds: [adminB.userId] }),
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("setTeamMembers con lista vacía deja el equipo sin miembros", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Vaciado ${stamp}`, memberIds: [memberA.userId] });
    await setTeamMembers(dbA, asActor(adminA), { teamId: team.id, memberIds: [] });
    const detail = await getTeamDetail(dbA, team.id);
    expect(detail?.members).toHaveLength(0);
  });
});

describe("updateTeam", () => {
  it("actualiza nombre y descripción sin tocar la membresía", async () => {
    const team = await createTeam(dbA, asActor(adminA), {
      name: `Original ${stamp}`,
      memberIds: [memberA.userId],
    });
    const updated = await updateTeam(dbA, asActor(managerA), team.id, {
      name: `Renombrado ${stamp}`,
      description: "Nueva descripción",
    });
    expect(updated.name).toBe(`Renombrado ${stamp}`);
    expect(updated.description).toBe("Nueva descripción");
    const detail = await getTeamDetail(dbA, team.id);
    expect(detail?.members.map((member) => member.id)).toEqual([memberA.userId]);
  });

  it("MEMBER no puede editar equipos", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Protegido ${stamp}` });
    await expect(updateTeam(dbA, asActor(memberA), team.id, { name: "Cambiado" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });

  it("no cruza la frontera del tenant", async () => {
    const foreign = await createTeam(dbB, asActor(adminB), { name: `Ajeno ${stamp}` });
    await expect(updateTeam(dbA, asActor(adminA), foreign.id, { name: "Robado" })).rejects.toMatchObject({
      name: "NotFoundError",
    });
  });
});

describe("deleteTeam", () => {
  it("elimina el equipo sin borrar a sus miembros", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Efímero ${stamp}`, memberIds: [memberA.userId] });
    await deleteTeam(dbA, asActor(adminA), team.id);
    expect(await prisma.team.findUnique({ where: { id: team.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: memberA.userId } })).not.toBeNull();
  });

  it("getTeamDeletionImpact informa el conteo de notas del equipo (FR-015)", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Con notas ${stamp}` });
    await prisma.note.create({
      data: { tenantId: tenantA, scope: "TEAM", teamId: team.id, title: "Acta", content: "Contenido" },
    });
    const impact = await getTeamDeletionImpact(dbA, team.id);
    expect(impact.noteCount).toBe(1);
    await deleteTeam(dbA, asActor(adminA), team.id);
    expect(await prisma.note.count({ where: { teamId: team.id } })).toBe(0);
  });

  it("VIEWER no puede eliminar equipos", async () => {
    const team = await createTeam(dbA, asActor(adminA), { name: `Blindado ${stamp}` });
    await expect(deleteTeam(dbA, asActor(viewerA), team.id)).rejects.toMatchObject({ name: "ForbiddenError" });
  });

  it("no cruza la frontera del tenant", async () => {
    const foreign = await createTeam(dbB, asActor(adminB), { name: `Ajeno-del ${stamp}` });
    await expect(deleteTeam(dbA, asActor(adminA), foreign.id)).rejects.toMatchObject({ name: "NotFoundError" });
  });
});

describe("listTeams / getTeamDetail", () => {
  it("lista solo los equipos del tenant con su conteo de miembros", async () => {
    const team = await createTeam(dbA, asActor(adminA), {
      name: `Conteo ${stamp}`,
      memberIds: [memberA.userId, member2A.userId],
    });
    const teams = await listTeams(dbA);
    const row = teams.find((item) => item.id === team.id);
    expect(row?.memberCount).toBe(2);

    const foreign = await listTeams(dbB);
    expect(foreign.some((item) => item.id === team.id)).toBe(false);
  });

  it("el detalle devuelve null para un equipo de otro tenant", async () => {
    const foreign = await createTeam(dbB, asActor(adminB), { name: `Oculto ${stamp}` });
    expect(await getTeamDetail(dbA, foreign.id)).toBeNull();
  });
});
