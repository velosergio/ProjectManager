import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ClientMutationActor } from "@/lib/clients/mutations";
import { createClient } from "@/lib/clients/mutations";
import { getClientDetail, listClients } from "@/lib/clients/queries";
import type { ClientFilters } from "@/lib/clients/schemas";
import { prisma } from "@/lib/prisma";
import { scopedClientFor } from "@/lib/tenant-db";

// Consultas de clientes: detalle con seguimiento (US2, FR-006..FR-008) y
// búsqueda/filtros del listado (US3, FR-009/FR-010).

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

beforeAll(async () => {
  tenantA = await createTenant(`CLQ-A ${stamp}`);
  tenantB = await createTenant(`CLQ-B ${stamp}`);
  const user = await prisma.user.create({
    data: {
      name: "clq-admin-a",
      email: `clq-admin-a-${stamp}@test.local`,
      role: "ADMIN",
      tenantId: tenantA,
      status: "ACTIVE",
    },
  });
  adminA = { userId: user.id, role: "ADMIN", tenantId: tenantA };
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("getClientDetail (US2)", () => {
  it("devuelve datos, proyectos asociados y conteos por estado", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Detalle S.A.", email: "detalle@test.local" });
    await prisma.project.create({
      data: { tenantId: tenantA, clientId: client.id, name: "En curso 1", status: "IN_PROGRESS" },
    });
    await prisma.project.create({
      data: { tenantId: tenantA, clientId: client.id, name: "En curso 2", status: "IN_PROGRESS" },
    });
    await prisma.project.create({
      data: { tenantId: tenantA, clientId: client.id, name: "Terminado", status: "COMPLETED" },
    });

    const detail = await getClientDetail(db, client.id);
    expect(detail).not.toBeNull();
    expect(detail?.name).toBe("Detalle S.A.");
    expect(detail?.email).toBe("detalle@test.local");
    expect(detail?.projects).toHaveLength(3);
    expect(detail?.projects.map((p) => p.name)).toEqual(
      expect.arrayContaining(["En curso 1", "En curso 2", "Terminado"]),
    );
    for (const project of detail?.projects ?? []) {
      expect(project.id).toBeTruthy();
      expect(project.status).toBeTruthy();
    }
    expect(detail?.statusCounts.IN_PROGRESS).toBe(2);
    expect(detail?.statusCounts.COMPLETED).toBe(1);
    expect(detail?.statusCounts.PENDING).toBe(0);
    expect(detail?.statusCounts.IN_REVIEW).toBe(0);
    expect(detail?.statusCounts.ARCHIVED).toBe(0);
  });

  it("la última actividad es el máximo entre el cliente y sus proyectos", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Actividad" });
    const project = await prisma.project.create({
      data: { tenantId: tenantA, clientId: client.id, name: "Reciente", status: "PENDING" },
    });
    // El proyecto se toca DESPUÉS de crear el cliente: debe dominar el máximo.
    const touched = await prisma.project.update({ where: { id: project.id }, data: { name: "Reciente v2" } });

    const detail = await getClientDetail(db, client.id);
    expect(detail?.lastActivityAt.getTime()).toBe(touched.updatedAt.getTime());
  });

  it("sin proyectos, la última actividad es la del propio cliente", async () => {
    const db = scopedClientFor(tenantA);
    const client = await createClient(db, adminA, { name: "Sin proyectos" });

    const detail = await getClientDetail(db, client.id);
    expect(detail?.projects).toHaveLength(0);
    expect(detail?.lastActivityAt.getTime()).toBe(client.updatedAt.getTime());
  });

  it("devuelve null para clientes de otro tenant o inexistentes (FR-014)", async () => {
    const dbA = scopedClientFor(tenantA);
    const dbB = scopedClientFor(tenantB);
    const client = await createClient(dbA, adminA, { name: "Solo de A" });

    expect(await getClientDetail(dbB, client.id)).toBeNull();
    expect(await getClientDetail(dbA, "id-inexistente")).toBeNull();
  });
});

describe("listClients con búsqueda y filtros (US3)", () => {
  // Tenant dedicado para que los conteos no dependan de otros tests.
  let tenantC: string;
  let adminC: ClientMutationActor;
  let vipTagId: string;

  const filters = (overrides: Partial<ClientFilters> = {}): ClientFilters => ({ page: 1, ...overrides });

  beforeAll(async () => {
    tenantC = await createTenant(`CLQ-C ${stamp}`);
    const user = await prisma.user.create({
      data: {
        name: "clq-admin-c",
        email: `clq-admin-c-${stamp}@test.local`,
        role: "ADMIN",
        tenantId: tenantC,
        status: "ACTIVE",
      },
    });
    adminC = { userId: user.id, role: "ADMIN", tenantId: tenantC };

    const db = scopedClientFor(tenantC);
    const vip = await prisma.tag.create({ data: { tenantId: tenantC, name: `vip-${stamp}` } });
    vipTagId = vip.id;

    const perez = await createClient(db, adminC, { name: "Pérez Asociados", email: "contacto@perez.test" });
    const acme = await createClient(db, adminC, {
      name: "ACME Corp",
      email: "hola@acme.test",
      phone: "+57 300 222 0000",
      tagIds: [vipTagId],
    });
    await createClient(db, adminC, { name: "Búho Digital", phone: "+57 555 000 1111" });

    // Pérez tiene un proyecto activo; ACME solo uno finalizado; Búho ninguno.
    await prisma.project.create({
      data: { tenantId: tenantC, clientId: perez.id, name: "Activo de Pérez", status: "IN_PROGRESS" },
    });
    await prisma.project.create({
      data: { tenantId: tenantC, clientId: acme.id, name: "Cerrado de ACME", status: "COMPLETED" },
    });
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: tenantC } });
  });

  it("busca por nombre ignorando mayúsculas y acentos (FR-009)", async () => {
    const db = scopedClientFor(tenantC);
    const result = await listClients(db, filters({ q: "PEREZ" }));
    expect(result.total).toBe(1);
    expect(result.clients[0]?.name).toBe("Pérez Asociados");
  });

  it("busca también por email y por teléfono", async () => {
    const db = scopedClientFor(tenantC);
    const porEmail = await listClients(db, filters({ q: "hola@acme" }));
    expect(porEmail.total).toBe(1);
    expect(porEmail.clients[0]?.name).toBe("ACME Corp");

    const porTelefono = await listClients(db, filters({ q: "555 000" }));
    expect(porTelefono.total).toBe(1);
    expect(porTelefono.clients[0]?.name).toBe("Búho Digital");
  });

  it("filtra por etiqueta (FR-010)", async () => {
    const db = scopedClientFor(tenantC);
    const result = await listClients(db, filters({ tagId: vipTagId }));
    expect(result.total).toBe(1);
    expect(result.clients[0]?.name).toBe("ACME Corp");
  });

  it("filtra por «con proyectos activos» excluyendo COMPLETED/ARCHIVED (FR-010)", async () => {
    const db = scopedClientFor(tenantC);
    const result = await listClients(db, filters({ active: true }));
    expect(result.total).toBe(1);
    expect(result.clients[0]?.name).toBe("Pérez Asociados");
  });

  it("combina criterios con intersección (búsqueda + filtros)", async () => {
    const db = scopedClientFor(tenantC);
    // ACME tiene la etiqueta pero ningún proyecto activo → intersección vacía.
    const vacia = await listClients(db, filters({ tagId: vipTagId, active: true }));
    expect(vacia.total).toBe(0);

    const conBusqueda = await listClients(db, filters({ q: "acme", tagId: vipTagId }));
    expect(conBusqueda.total).toBe(1);
  });

  it("mantiene la paginación coherente con el total filtrado (FR-015)", async () => {
    const db = scopedClientFor(tenantC);
    const todos = await listClients(db, filters());
    expect(todos.total).toBe(3);
    expect(todos.page).toBe(1);
    expect(todos.pageCount).toBe(1);
    expect(todos.clients.map((c) => c.name)).toEqual(["ACME Corp", "Búho Digital", "Pérez Asociados"]);
  });
});
