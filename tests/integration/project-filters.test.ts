import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DuplicateNameError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { MutationActor } from "@/lib/projects/mutations";
import { createProject, createTag, deleteTag, renameTag, updateProject } from "@/lib/projects/mutations";
import { listProjects, PROJECTS_PAGE_SIZE } from "@/lib/projects/queries";
import { projectFiltersSchema } from "@/lib/projects/schemas";
import { scopedClientFor } from "@/lib/tenant-db";

// Búsqueda, filtros combinados, paginación y etiquetas (US4, FR-012/FR-013).

const stamp = Date.now();
let tenantId: string;
let admin: MutationActor;
let member: MutationActor;
let clientAcmeId: string;
let tagUrgenteId: string;

const baseFilters = projectFiltersSchema.parse({});

async function setup() {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "PRO" } });
  const tenant = await prisma.tenant.create({ data: { name: `FILTROS ${stamp}` } });
  tenantId = tenant.id;
  await prisma.subscription.create({ data: { tenantId, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" } });

  const adminUser = await prisma.user.create({
    data: {
      name: "filtros-admin",
      email: `filtros-admin-${stamp}@test.local`,
      role: "ADMIN",
      tenantId,
      status: "ACTIVE",
    },
  });
  admin = { userId: adminUser.id, role: "ADMIN", tenantId };
  const memberUser = await prisma.user.create({
    data: {
      name: "filtros-member",
      email: `filtros-member-${stamp}@test.local`,
      role: "MEMBER",
      tenantId,
      status: "ACTIVE",
    },
  });
  member = { userId: memberUser.id, role: "MEMBER", tenantId };

  const acme = await prisma.client.create({ data: { tenantId, name: "Acme Corp" } });
  clientAcmeId = acme.id;

  const db = scopedClientFor(tenantId);
  const urgente = await createTag(db, admin, { name: "Urgente" });
  tagUrgenteId = urgente.id;

  await createProject(db, admin, {
    name: "Portal Acme",
    clientId: clientAcmeId,
    status: "IN_PROGRESS",
    priority: "HIGH",
    ownerId: member.userId,
    tagIds: [tagUrgenteId],
  });
  await createProject(db, admin, { name: "Intranet interna", status: "IN_PROGRESS", priority: "LOW" });
  await createProject(db, admin, { name: "Migración legado", status: "PENDING", priority: "HIGH" });
}

beforeAll(setup);

afterAll(async () => {
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("búsqueda por texto (FR-012)", () => {
  it("encuentra por nombre de proyecto", async () => {
    const db = scopedClientFor(tenantId);
    const result = await listProjects(db, { ...baseFilters, q: "intranet" });
    expect(result.projects.map((p) => p.name)).toEqual(["Intranet interna"]);
  });

  it("encuentra por nombre de cliente", async () => {
    const db = scopedClientFor(tenantId);
    const result = await listProjects(db, { ...baseFilters, q: "acme" });
    expect(result.projects.map((p) => p.name)).toEqual(["Portal Acme"]);
  });

  it("sin coincidencias devuelve vacío con total 0", async () => {
    const db = scopedClientFor(tenantId);
    const result = await listProjects(db, { ...baseFilters, q: "no-existe-xyz" });
    expect(result.total).toBe(0);
    expect(result.projects).toEqual([]);
  });
});

describe("filtros combinados (FR-012)", () => {
  it("estado + prioridad reduce a la intersección", async () => {
    const db = scopedClientFor(tenantId);
    const result = await listProjects(db, { ...baseFilters, status: "IN_PROGRESS", priority: "HIGH" });
    expect(result.projects.map((p) => p.name)).toEqual(["Portal Acme"]);
  });

  it("filtra por responsable, cliente y etiqueta", async () => {
    const db = scopedClientFor(tenantId);
    const porOwner = await listProjects(db, { ...baseFilters, ownerId: member.userId });
    expect(porOwner.projects.map((p) => p.name)).toEqual(["Portal Acme"]);

    const porCliente = await listProjects(db, { ...baseFilters, clientId: clientAcmeId });
    expect(porCliente.projects.map((p) => p.name)).toEqual(["Portal Acme"]);

    const porTag = await listProjects(db, { ...baseFilters, tagId: tagUrgenteId });
    expect(porTag.projects.map((p) => p.name)).toEqual(["Portal Acme"]);
  });
});

describe("paginación", () => {
  it("pagina de a PROJECTS_PAGE_SIZE con total consistente", async () => {
    const db = scopedClientFor(tenantId);
    // Rellenar por encima de una página.
    const extra = PROJECTS_PAGE_SIZE + 2 - 3;
    await prisma.project.createMany({
      data: Array.from({ length: extra }, (_, i) => ({ tenantId, name: `Relleno ${String(i + 1).padStart(2, "0")}` })),
    });

    const page1 = await listProjects(db, { ...baseFilters, page: 1 });
    const page2 = await listProjects(db, { ...baseFilters, page: 2 });
    expect(page1.total).toBe(PROJECTS_PAGE_SIZE + 2);
    expect(page1.projects).toHaveLength(PROJECTS_PAGE_SIZE);
    expect(page2.projects).toHaveLength(2);
    expect(page1.pageCount).toBe(2);

    const ids1 = new Set(page1.projects.map((p) => p.id));
    expect(page2.projects.every((p) => !ids1.has(p.id))).toBe(true);
  });
});

describe("etiquetas (FR-013)", () => {
  it("nombre único por tenant", async () => {
    const db = scopedClientFor(tenantId);
    await expect(createTag(db, admin, { name: "Urgente" })).rejects.toBeInstanceOf(DuplicateNameError);
  });

  it("renombrar se refleja en los proyectos que la usan", async () => {
    const db = scopedClientFor(tenantId);
    await renameTag(db, admin, tagUrgenteId, { name: "Prioritario" });
    const result = await listProjects(db, { ...baseFilters, q: "portal" });
    expect(result.projects[0]?.tags.map((t) => t.name)).toContain("Prioritario");
  });

  it("eliminar la desasocia sin borrar los proyectos", async () => {
    const db = scopedClientFor(tenantId);
    await deleteTag(db, admin, tagUrgenteId);
    const result = await listProjects(db, { ...baseFilters, q: "portal" });
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]?.tags).toEqual([]);
  });

  it("updateProject sincroniza el set de etiquetas", async () => {
    const db = scopedClientFor(tenantId);
    const nueva = await createTag(db, admin, { name: "Fase dos" });
    const portal = (await listProjects(db, { ...baseFilters, q: "portal" })).projects[0];
    expect(portal).toBeDefined();
    if (!portal) {
      return;
    }
    await updateProject(db, admin, portal.id, {
      name: portal.name,
      status: portal.status,
      priority: portal.priority,
      ownerId: portal.ownerId,
      tagIds: [nueva.id],
    });
    const after = (await listProjects(db, { ...baseFilters, tagId: nueva.id })).projects;
    expect(after.map((p) => p.id)).toEqual([portal.id]);
  });
});
