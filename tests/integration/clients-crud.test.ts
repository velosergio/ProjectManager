import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ClientMutationActor } from "@/lib/clients/mutations";
import { createClient, deleteClient, getDeletionImpact, updateClient } from "@/lib/clients/mutations";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { scopedClientFor } from "@/lib/tenant-db";

// CRUD de clientes (US1): permisos por rol, aislamiento entre tenants y
// eliminación con desvinculación de proyectos (FR-002..FR-005, FR-014).

const stamp = Date.now();
let tenantA: string;
let tenantB: string;
let adminA: ClientMutationActor;
let managerA: ClientMutationActor;
let memberA: ClientMutationActor;
let viewerA: ClientMutationActor;
let adminB: ClientMutationActor;

async function createTenant(name: string) {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "PRO" } });
  const tenant = await prisma.tenant.create({ data: { name } });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" },
  });
  return tenant.id;
}

async function createUser(
  tenantId: string,
  role: "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER",
  label: string,
): Promise<ClientMutationActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}-${stamp}@test.local`, role, tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role, tenantId };
}

beforeAll(async () => {
  tenantA = await createTenant(`CLI-A ${stamp}`);
  tenantB = await createTenant(`CLI-B ${stamp}`);
  adminA = await createUser(tenantA, "ADMIN", "cli-admin-a");
  managerA = await createUser(tenantA, "MANAGER", "cli-manager-a");
  memberA = await createUser(tenantA, "MEMBER", "cli-member-a");
  viewerA = await createUser(tenantA, "VIEWER", "cli-viewer-a");
  adminB = await createUser(tenantB, "ADMIN", "cli-admin-b");
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("createClient", () => {
  it("crea el cliente con solo el nombre y normaliza los opcionales", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "  Acme S.A.  ", email: "", phone: "" });
    expect(client.name).toBe("Acme S.A.");
    expect(client.email).toBeNull();
    expect(client.phone).toBeNull();
    expect(client.tenantId).toBe(tenantA);
  });

  it("MANAGER también gestiona clientes (clarificación 2026-07-03)", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, managerA, { name: "Cliente de manager" });
    expect(client.id).toBeTruthy();
  });

  it("MEMBER y VIEWER no pueden crear clientes", async () => {
    const db = scopedClientFor(tenantA);
    await expect(createClient(db, memberA, { name: "No debería" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createClient(db, viewerA, { name: "Tampoco" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rechaza emails con formato inválido", async () => {
    const db = scopedClientFor(tenantA);
    await expect(createClient(db, adminA, { name: "Mal email", email: "no-es-email" })).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  it("permite nombres duplicados dentro del tenant (edge case del spec)", async () => {
    const db = scopedClientFor(tenantA);
    await createClient(db, adminA, { name: `Homónimo ${stamp}`, email: "uno@test.local" });
    await expect(
      createClient(db, adminA, { name: `Homónimo ${stamp}`, email: "dos@test.local" }),
    ).resolves.toBeTruthy();
  });
});

describe("updateClient", () => {
  it("actualiza los datos del cliente", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Para editar" });
    const updated = await updateClient(db, adminA, client.id, {
      name: "Editado",
      email: "editado@test.local",
      phone: "+57 300 000 0000",
    });
    expect(updated.name).toBe("Editado");
    expect(updated.email).toBe("editado@test.local");
    expect(updated.phone).toBe("+57 300 000 0000");
  });

  it("MEMBER no edita clientes", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Intocable" });
    await expect(updateClient(db, memberA, client.id, { name: "Tocado" })).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("aislamiento entre tenants (FR-014)", () => {
  it("un tenant no ve, edita ni elimina clientes de otro", async () => {
    const dbA = scopedClientFor(tenantA);
    const dbB = scopedClientFor(tenantB);
    const client = await createClient(dbA, adminA, { name: "Solo de A" });

    const visibleDesdeB = await dbB.client.findFirst({ where: { id: client.id } });
    expect(visibleDesdeB).toBeNull();

    await expect(updateClient(dbB, adminB, client.id, { name: "Hackeado" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteClient(dbB, adminB, client.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(getDeletionImpact(dbB, client.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("deleteClient (FR-005)", () => {
  it("informa el impacto y al eliminar desvincula los proyectos sin borrarlos", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Con proyectos" });
    const p1 = await prisma.project.create({ data: { tenantId: tenantA, clientId: client.id, name: "P1" } });
    const p2 = await prisma.project.create({ data: { tenantId: tenantA, clientId: client.id, name: "P2" } });

    const impact = await getDeletionImpact(db, client.id);
    expect(impact.projectCount).toBe(2);

    await deleteClient(db, adminA, client.id);

    expect(await prisma.client.findUnique({ where: { id: client.id } })).toBeNull();
    const after1 = await prisma.project.findUniqueOrThrow({ where: { id: p1.id } });
    const after2 = await prisma.project.findUniqueOrThrow({ where: { id: p2.id } });
    expect(after1.clientId).toBeNull();
    expect(after2.clientId).toBeNull();
  });

  it("VIEWER no elimina clientes", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Protegido" });
    await expect(deleteClient(db, viewerA, client.id)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
