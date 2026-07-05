import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createNote } from "@/lib/notes/mutations";
import { findRecentNotes, listNotes, listNotesForContext, NOTES_PAGE_SIZE } from "@/lib/notes/queries";
import { noteFiltersSchema } from "@/lib/notes/schemas";
import { prisma } from "@/lib/prisma";
import { createTeam } from "@/lib/teams/mutations";
import { type ScopedPrismaClient, scopedClientFor } from "@/lib/tenant-db";

import { createTestTenant, createTestUser, ensurePlansSeeded, type TestActor } from "./helpers";

// Consultas de notas (US3/US5): listado central paginado con filtro por
// alcance y búsqueda por título/contenido insensible a acentos y mayúsculas
// (FR-021), notas por contexto (FR-022) y recientes para el widget (FR-024).

const stamp = Date.now();

let tenantA: string;
let tenantB: string;
let dbA: ScopedPrismaClient;
let dbB: ScopedPrismaClient;
let adminA: TestActor;
let adminB: TestActor;
let projectA: string;
let teamA: string;

function filters(raw: Record<string, unknown> = {}) {
  return noteFiltersSchema.parse(raw);
}

beforeAll(async () => {
  await ensurePlansSeeded();
  tenantA = await createTestTenant(`NOQ-A ${stamp}`, "PRO_PLUS");
  tenantB = await createTestTenant(`NOQ-B ${stamp}`, "PRO_PLUS");
  dbA = scopedClientFor(tenantA);
  dbB = scopedClientFor(tenantB);
  adminA = await createTestUser(tenantA, "ADMIN", `noq-admin-a-${stamp}`);
  adminB = await createTestUser(tenantB, "ADMIN", `noq-admin-b-${stamp}`);

  const project = await prisma.project.create({ data: { tenantId: tenantA, name: `Proyecto NOQ ${stamp}` } });
  projectA = project.id;
  const team = await createTeam(dbA, adminA, { name: `Equipo NOQ ${stamp}` });
  teamA = team.id;

  await createNote(dbA, adminA, { scope: "GLOBAL", title: `Reunión de diseño ${stamp}`, content: "Acta corta" });
  await createNote(dbA, adminA, {
    scope: "PROJECT",
    projectId: projectA,
    title: `Alcance inicial ${stamp}`,
    content: "El presupuesto incluye la migración",
  });
  await createNote(dbA, adminA, { scope: "TEAM", teamId: teamA, title: `Retro del equipo ${stamp}`, content: "C" });
  await createNote(dbB, adminB, { scope: "GLOBAL", title: `Nota ajena ${stamp}`, content: "De otro tenant" });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("listNotes", () => {
  it("lista todas las notas del tenant ordenadas por updatedAt desc", async () => {
    const result = await listNotes(dbA, filters());
    expect(result.total).toBe(3);
    const times = result.notes.map((note) => note.updatedAt.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("filtra por alcance", async () => {
    const result = await listNotes(dbA, filters({ scope: "TEAM" }));
    expect(result.total).toBe(1);
    expect(result.notes[0]?.scope).toBe("TEAM");
  });

  it("busca por título sin distinguir acentos ni mayúsculas (FR-021)", async () => {
    const result = await listNotes(dbA, filters({ q: "reunion" }));
    expect(result.total).toBe(1);
    expect(result.notes[0]?.title).toContain("Reunión");
  });

  it("busca también dentro del contenido", async () => {
    const result = await listNotes(dbA, filters({ q: "presupuesto" }));
    expect(result.total).toBe(1);
    expect(result.notes[0]?.title).toContain("Alcance inicial");
  });

  it("combina búsqueda y alcance", async () => {
    const result = await listNotes(dbA, filters({ q: "retro", scope: "TEAM" }));
    expect(result.total).toBe(1);
    const empty = await listNotes(dbA, filters({ q: "retro", scope: "PROJECT" }));
    expect(empty.total).toBe(0);
  });

  it("incluye autor y contexto para el listado", async () => {
    const result = await listNotes(dbA, filters({ scope: "PROJECT" }));
    const note = result.notes[0];
    expect(note?.author?.name).toBeTruthy();
    expect(note?.project?.name).toContain("Proyecto NOQ");
  });

  it("pagina el listado", async () => {
    const bulkTenant = await createTestTenant(`NOQ-C ${stamp}`, "PRO_PLUS");
    const dbC = scopedClientFor(bulkTenant);
    const adminC = await createTestUser(bulkTenant, "ADMIN", `noq-admin-c-${stamp}`);
    for (let i = 0; i < NOTES_PAGE_SIZE + 2; i++) {
      await createNote(dbC, adminC, { scope: "GLOBAL", title: `Nota ${i}`, content: "C" });
    }
    const first = await listNotes(dbC, filters());
    expect(first.notes).toHaveLength(NOTES_PAGE_SIZE);
    expect(first.pageCount).toBe(2);
    const second = await listNotes(dbC, filters({ page: 2 }));
    expect(second.notes).toHaveLength(2);
    await prisma.tenant.delete({ where: { id: bulkTenant } });
  });

  it("no expone notas de otro tenant", async () => {
    const result = await listNotes(dbB, filters());
    expect(result.total).toBe(1);
    expect(result.notes[0]?.title).toContain("Nota ajena");
  });
});

describe("listNotesForContext", () => {
  it("devuelve solo las notas del contexto pedido (FR-022)", async () => {
    const ofProject = await listNotesForContext(dbA, { projectId: projectA });
    expect(ofProject).toHaveLength(1);
    expect(ofProject[0]?.title).toContain("Alcance inicial");
    const ofTeam = await listNotesForContext(dbA, { teamId: teamA });
    expect(ofTeam).toHaveLength(1);
    expect(ofTeam[0]?.title).toContain("Retro del equipo");
  });
});

describe("findRecentNotes", () => {
  it("devuelve como máximo 4 notas recientes del tenant (FR-024)", async () => {
    await createNote(dbA, adminA, { scope: "GLOBAL", title: `Extra 1 ${stamp}`, content: "C" });
    await createNote(dbA, adminA, { scope: "GLOBAL", title: `Extra 2 ${stamp}`, content: "C" });
    const recent = await findRecentNotes(dbA);
    expect(recent).toHaveLength(4);
    const times = recent.map((note) => note.updatedAt.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
