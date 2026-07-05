import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createNote, deleteNote, updateNote } from "@/lib/notes/mutations";
import { prisma } from "@/lib/prisma";
import { createTeam } from "@/lib/teams/mutations";
import { type ScopedPrismaClient, scopedClientFor } from "@/lib/tenant-db";

import { createTestTenant, createTestUser, ensurePlansSeeded, type TestActor } from "./helpers";

// CRUD de notas (US3): alcance único con referencia verificada contra el
// tenant, permisos por rol aplicados en servidor (SC-008), cascadas al borrar
// contextos (FR-023), autor `SetNull` y aislamiento entre tenants.

const stamp = Date.now();

let tenantA: string;
let tenantB: string;
let dbA: ScopedPrismaClient;
let dbB: ScopedPrismaClient;
let adminA: TestActor;
let managerA: TestActor;
let memberA: TestActor;
let viewerA: TestActor;
let adminB: TestActor;
let projectA: string;
let taskA: string;
let teamA: string;

beforeAll(async () => {
  await ensurePlansSeeded();
  tenantA = await createTestTenant(`NOT-A ${stamp}`, "PRO_PLUS");
  tenantB = await createTestTenant(`NOT-B ${stamp}`, "PRO_PLUS");
  dbA = scopedClientFor(tenantA);
  dbB = scopedClientFor(tenantB);
  adminA = await createTestUser(tenantA, "ADMIN", `not-admin-a-${stamp}`);
  managerA = await createTestUser(tenantA, "MANAGER", `not-manager-a-${stamp}`);
  memberA = await createTestUser(tenantA, "MEMBER", `not-member-a-${stamp}`);
  viewerA = await createTestUser(tenantA, "VIEWER", `not-viewer-a-${stamp}`);
  adminB = await createTestUser(tenantB, "ADMIN", `not-admin-b-${stamp}`);

  const project = await prisma.project.create({
    data: { tenantId: tenantA, name: `Proyecto notas ${stamp}`, ownerId: adminA.userId },
  });
  projectA = project.id;
  const process = await prisma.process.create({ data: { tenantId: tenantA, projectId: projectA, name: "General" } });
  const task = await prisma.task.create({
    data: { tenantId: tenantA, processId: process.id, title: "Tarea con notas" },
  });
  taskA = task.id;
  const team = await createTeam(dbA, adminA, { name: `Equipo notas ${stamp}` });
  teamA = team.id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("createNote", () => {
  it("crea una nota GLOBAL con autor de la sesión (FR-018)", async () => {
    const note = await createNote(dbA, memberA, { scope: "GLOBAL", title: "General", content: "Contenido" });
    expect(note.tenantId).toBe(tenantA);
    expect(note.authorId).toBe(memberA.userId);
    expect(note.scope).toBe("GLOBAL");
  });

  it("crea notas de proyecto, tarea y equipo con referencia del tenant", async () => {
    const ofProject = await createNote(dbA, adminA, {
      scope: "PROJECT",
      projectId: projectA,
      title: "De proyecto",
      content: "C",
    });
    expect(ofProject.projectId).toBe(projectA);
    const ofTask = await createNote(dbA, adminA, { scope: "TASK", taskId: taskA, title: "De tarea", content: "C" });
    expect(ofTask.taskId).toBe(taskA);
    const ofTeam = await createNote(dbA, adminA, { scope: "TEAM", teamId: teamA, title: "De equipo", content: "C" });
    expect(ofTeam.teamId).toBe(teamA);
  });

  it("rechaza referencias de otro tenant sin filtrar su existencia (FR-017)", async () => {
    await expect(
      createNote(dbB, adminB, { scope: "PROJECT", projectId: projectA, title: "Robo", content: "C" }),
    ).rejects.toMatchObject({ name: "NotFoundError" });
    await expect(
      createNote(dbB, adminB, { scope: "TASK", taskId: taskA, title: "Robo", content: "C" }),
    ).rejects.toMatchObject({ name: "NotFoundError" });
    await expect(
      createNote(dbB, adminB, { scope: "TEAM", teamId: teamA, title: "Robo", content: "C" }),
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("VIEWER no puede crear notas (SC-008)", async () => {
    await expect(createNote(dbA, viewerA, { scope: "GLOBAL", title: "Prohibida", content: "C" })).rejects.toMatchObject(
      { name: "ForbiddenError" },
    );
  });
});

describe("updateNote / deleteNote — permisos (FR-019, SC-008)", () => {
  it("el autor edita y elimina su propia nota", async () => {
    const note = await createNote(dbA, memberA, { scope: "GLOBAL", title: "Mía", content: "Original" });
    const updated = await updateNote(dbA, memberA, { noteId: note.id, title: "Mía v2", content: "Editada" });
    expect(updated.title).toBe("Mía v2");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(note.updatedAt.getTime());
    await deleteNote(dbA, memberA, note.id);
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
  });

  it("MEMBER no edita ni elimina notas ajenas", async () => {
    const note = await createNote(dbA, adminA, { scope: "GLOBAL", title: "Ajena", content: "C" });
    await expect(updateNote(dbA, memberA, { noteId: note.id, title: "Hackeada", content: "C" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
    await expect(deleteNote(dbA, memberA, note.id)).rejects.toMatchObject({ name: "ForbiddenError" });
  });

  it("ADMIN y MANAGER editan y eliminan notas de otros (SC-008)", async () => {
    const note = await createNote(dbA, memberA, { scope: "GLOBAL", title: "De member", content: "C" });
    const byManager = await updateNote(dbA, managerA, { noteId: note.id, title: "Moderada", content: "C" });
    expect(byManager.title).toBe("Moderada");
    await deleteNote(dbA, adminA, note.id);
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
  });

  it("VIEWER no puede editar ni eliminar", async () => {
    const note = await createNote(dbA, adminA, { scope: "GLOBAL", title: "Solo lectura", content: "C" });
    await expect(updateNote(dbA, viewerA, { noteId: note.id, title: "No", content: "C" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
    await expect(deleteNote(dbA, viewerA, note.id)).rejects.toMatchObject({ name: "ForbiddenError" });
    await deleteNote(dbA, adminA, note.id);
  });

  it("no cruza la frontera del tenant", async () => {
    const note = await createNote(dbA, adminA, { scope: "GLOBAL", title: "Frontera", content: "C" });
    await expect(updateNote(dbB, adminB, { noteId: note.id, title: "Robo", content: "C" })).rejects.toMatchObject({
      name: "NotFoundError",
    });
    await expect(deleteNote(dbB, adminB, note.id)).rejects.toMatchObject({ name: "NotFoundError" });
    await deleteNote(dbA, adminA, note.id);
  });
});

describe("cascadas y autor (FR-023)", () => {
  it("al borrar un proyecto caen sus notas y las de sus tareas", async () => {
    const project = await prisma.project.create({
      data: { tenantId: tenantA, name: `Proyecto efímero ${stamp}` },
    });
    const process = await prisma.process.create({
      data: { tenantId: tenantA, projectId: project.id, name: "General" },
    });
    const task = await prisma.task.create({
      data: { tenantId: tenantA, processId: process.id, title: "Tarea efímera" },
    });
    const noteOfProject = await createNote(dbA, adminA, {
      scope: "PROJECT",
      projectId: project.id,
      title: "Del proyecto",
      content: "C",
    });
    const noteOfTask = await createNote(dbA, adminA, {
      scope: "TASK",
      taskId: task.id,
      title: "De la tarea",
      content: "C",
    });

    await prisma.project.delete({ where: { id: project.id } });

    expect(await prisma.note.findUnique({ where: { id: noteOfProject.id } })).toBeNull();
    expect(await prisma.note.findUnique({ where: { id: noteOfTask.id } })).toBeNull();
  });

  it("al borrar un equipo caen sus notas", async () => {
    const team = await createTeam(dbA, adminA, { name: `Equipo efímero ${stamp}` });
    const note = await createNote(dbA, adminA, { scope: "TEAM", teamId: team.id, title: "Acta", content: "C" });
    await prisma.team.delete({ where: { id: team.id } });
    expect(await prisma.note.findUnique({ where: { id: note.id } })).toBeNull();
  });

  it("al eliminar al autor la nota se conserva sin autor (SetNull)", async () => {
    const ephemeral = await createTestUser(tenantA, "MEMBER", `not-efimero-${stamp}`);
    const note = await createNote(dbA, ephemeral, { scope: "GLOBAL", title: "Huérfana", content: "C" });
    await prisma.user.delete({ where: { id: ephemeral.userId } });
    const survivor = await prisma.note.findUniqueOrThrow({ where: { id: note.id } });
    expect(survivor.authorId).toBeNull();
  });
});
