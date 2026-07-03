import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ClientMutationActor } from "@/lib/clients/mutations";
import { createClient, updateClient } from "@/lib/clients/mutations";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createTag } from "@/lib/projects/mutations";
import { scopedClientFor } from "@/lib/tenant-db";

// Etiquetas de clientes (US4): catálogo único del tenant compartido con
// proyectos (clarificación 2026-07-03), asignación con `set` y aislamiento
// entre tenants (FR-011/FR-012/FR-014).

const stamp = Date.now();
let tenantA: string;
let tenantB: string;
let adminA: ClientMutationActor;

async function createTenant(name: string) {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "PRO" } });
  const tenant = await prisma.tenant.create({ data: { name } });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" },
  });
  return tenant.id;
}

async function createAdmin(tenantId: string, label: string): Promise<ClientMutationActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}-${stamp}@test.local`, role: "ADMIN", tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role: "ADMIN", tenantId };
}

beforeAll(async () => {
  tenantA = await createTenant(`CLT-A ${stamp}`);
  tenantB = await createTenant(`CLT-B ${stamp}`);
  adminA = await createAdmin(tenantA, "clt-admin-a");
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("etiquetas de clientes (US4)", () => {
  it("asigna una etiqueta del catálogo compartida con proyectos (FR-011)", async () => {
    const db = scopedClientFor(tenantA);
    const tag = await prisma.tag.create({ data: { tenantId: tenantA, name: `compartida-${stamp}` } });
    // La misma etiqueta clasifica un proyecto: catálogo único.
    const project = await prisma.project.create({
      data: { tenantId: tenantA, name: "Con etiqueta", tags: { connect: { id: tag.id } } },
    });

    const client = await createClient(db, adminA, { name: "Etiquetado", tagIds: [tag.id] });
    const withTags = await db.client.findFirstOrThrow({
      where: { id: client.id },
      select: { tags: { select: { id: true } } },
    });
    expect(withTags.tags.map((t) => t.id)).toEqual([tag.id]);

    const projectTags = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { tags: { select: { id: true } } },
    });
    expect(projectTags.tags.map((t) => t.id)).toEqual([tag.id]);
  });

  it("al editar, el conjunto de etiquetas se reemplaza con `set` (FR-012)", async () => {
    const db = scopedClientFor(tenantA);
    const tagUno = await prisma.tag.create({ data: { tenantId: tenantA, name: `uno-${stamp}` } });
    const tagDos = await prisma.tag.create({ data: { tenantId: tenantA, name: `dos-${stamp}` } });
    const client = await createClient(db, adminA, { name: "Reemplazo", tagIds: [tagUno.id] });

    await updateClient(db, adminA, client.id, { name: "Reemplazo", tagIds: [tagDos.id] });

    const after = await db.client.findFirstOrThrow({
      where: { id: client.id },
      select: { tags: { select: { id: true } } },
    });
    expect(after.tags.map((t) => t.id)).toEqual([tagDos.id]);
  });

  it("quitar una etiqueta no la borra del catálogo ni de los proyectos (FR-012)", async () => {
    const db = scopedClientFor(tenantA);
    const tag = await prisma.tag.create({ data: { tenantId: tenantA, name: `persistente-${stamp}` } });
    const project = await prisma.project.create({
      data: { tenantId: tenantA, name: "Sigue etiquetado", tags: { connect: { id: tag.id } } },
    });
    const client = await createClient(db, adminA, { name: "Sin etiquetas luego", tagIds: [tag.id] });

    await updateClient(db, adminA, client.id, { name: "Sin etiquetas luego", tagIds: [] });

    expect(await db.tag.findFirst({ where: { id: tag.id } })).not.toBeNull();
    const projectTags = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      select: { tags: { select: { id: true } } },
    });
    expect(projectTags.tags.map((t) => t.id)).toEqual([tag.id]);
  });

  it("rechaza etiquetas de otro tenant (FR-014)", async () => {
    const dbA = scopedClientFor(tenantA);
    const ajena = await prisma.tag.create({ data: { tenantId: tenantB, name: `ajena-${stamp}` } });

    await expect(createClient(dbA, adminA, { name: "Con ajena", tagIds: [ajena.id] })).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const client = await createClient(dbA, adminA, { name: "Luego con ajena" });
    await expect(
      updateClient(dbA, adminA, client.id, { name: "Luego con ajena", tagIds: [ajena.id] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("la creación al vuelo deja la etiqueta en el catálogo del tenant (FR-011)", async () => {
    const db = scopedClientFor(tenantA);
    const tag = await createTag(db, adminA, { name: `al-vuelo-${stamp}` });
    expect(tag.tenantId).toBe(tenantA);

    await createClient(db, adminA, { name: "Con nueva", tagIds: [tag.id] });
    const enCatalogo = await db.tag.findFirst({ where: { id: tag.id } });
    expect(enCatalogo).not.toBeNull();
    // Y no es visible desde otro tenant.
    const dbB = scopedClientFor(tenantB);
    expect(await dbB.tag.findFirst({ where: { id: tag.id } })).toBeNull();
  });
});
