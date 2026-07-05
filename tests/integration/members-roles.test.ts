import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LastAdminError } from "@/lib/errors";
import type { MemberActor } from "@/lib/members/mutations";
import { changeMemberRole, deactivateMember, reactivateMember } from "@/lib/members/mutations";
import { listMembers } from "@/lib/members/queries";
import { prisma } from "@/lib/prisma";

import { ensurePlansSeeded } from "./helpers";

// Roles y revocación (US1): cambio de rol con guard de último admin, rechazo
// del propio rol, desactivar/reactivar con cuota y aislamiento entre tenants
// (FR-006..FR-010). El bloqueo de login de un INACTIVE se aplica en
// `authorize` (auth.ts) y en `getTenantDb()`; aquí se verifica el estado que
// esas guardas consultan.

const stamp = Date.now();

let tenantA: string;
let tenantB: string;
let adminA: MemberActor;
let admin2A: MemberActor;
let memberA: MemberActor;
let adminB: MemberActor;

async function createTenant(name: string, planCode: "GRATUITO" | "PRO_PLUS") {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: planCode } });
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
): Promise<MemberActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}-${stamp}@test.local`, role, tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role, tenantId };
}

beforeAll(async () => {
  await ensurePlansSeeded();
  tenantA = await createTenant(`ROL-A ${stamp}`, "PRO_PLUS");
  tenantB = await createTenant(`ROL-B ${stamp}`, "GRATUITO");
  adminA = await createUser(tenantA, "ADMIN", "rol-admin-a");
  admin2A = await createUser(tenantA, "ADMIN", "rol-admin2-a");
  memberA = await createUser(tenantA, "MEMBER", "rol-member-a");
  adminB = await createUser(tenantB, "ADMIN", "rol-admin-b");
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("changeMemberRole", () => {
  it("actualiza el rol de un miembro del tenant", async () => {
    await changeMemberRole(adminA, { userId: memberA.userId, role: "MANAGER" });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: memberA.userId } });
    expect(updated.role).toBe("MANAGER");
    await changeMemberRole(adminA, { userId: memberA.userId, role: "MEMBER" });
  });

  it("rechaza cambiar el propio rol", async () => {
    await expect(changeMemberRole(adminA, { userId: adminA.userId, role: "MEMBER" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });

  it("solo ADMIN gestiona roles", async () => {
    await expect(changeMemberRole(memberA, { userId: admin2A.userId, role: "VIEWER" })).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });

  it("impide degradar al último administrador activo", async () => {
    await expect(changeMemberRole(adminB, { userId: adminB.userId, role: "MEMBER" })).rejects.toMatchObject({
      name: "ForbiddenError", // el propio rol se rechaza antes
    });
    // Un segundo admin de otro tenant no cuenta: crea un member en B y hazlo
    // admin objetivo del guard usando un actor mango-like del mismo tenant.
    const memberB = await createUser(tenantB, "MEMBER", "rol-member-b");
    // adminB intenta degradarse a través de otro admin del tenant: primero lo
    // promueve y luego sí puede degradarse a sí mismo... el guard del último
    // admin se verifica degradando al único admin desde un actor MANGO.
    const mango: MemberActor = { userId: memberB.userId, role: "MANGO", tenantId: tenantB };
    await expect(changeMemberRole(mango, { userId: adminB.userId, role: "MEMBER" })).rejects.toBeInstanceOf(
      LastAdminError,
    );
  });

  it("permite degradar a un admin cuando queda otro activo", async () => {
    await changeMemberRole(adminA, { userId: admin2A.userId, role: "MANAGER" });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: admin2A.userId } });
    expect(updated.role).toBe("MANAGER");
    await changeMemberRole(adminA, { userId: admin2A.userId, role: "ADMIN" });
  });

  it("no cruza la frontera del tenant", async () => {
    await expect(changeMemberRole(adminB, { userId: memberA.userId, role: "VIEWER" })).rejects.toMatchObject({
      name: "NotFoundError",
    });
  });
});

describe("deactivateMember / reactivateMember", () => {
  it("desactiva a un miembro conservando su trabajo asignado (FR-010)", async () => {
    const worker = await createUser(tenantA, "MEMBER", "rol-worker-a");
    const project = await prisma.project.create({
      data: { tenantId: tenantA, name: `Proyecto de carga ${stamp}`, ownerId: worker.userId },
    });
    const process = await prisma.process.create({
      data: { tenantId: tenantA, projectId: project.id, name: "General" },
    });
    const task = await prisma.task.create({
      data: { tenantId: tenantA, processId: process.id, title: "Tarea asignada", assigneeId: worker.userId },
    });

    await deactivateMember(adminA, worker.userId);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: worker.userId } });
    expect(after.status).toBe("INACTIVE");
    // El trabajo asignado permanece intacto y a su nombre.
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).ownerId).toBe(worker.userId);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId).toBe(worker.userId);

    await reactivateMember(adminA, worker.userId);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: worker.userId } })).status).toBe("ACTIVE");
  });

  it("impide desactivar al último administrador activo", async () => {
    await expect(deactivateMember(adminB, adminB.userId)).rejects.toBeInstanceOf(LastAdminError);
  });

  it("la reactivación respeta la cuota del plan", async () => {
    // Tenant B (GRATUITO): desactiva un miembro, llena el cupo y reactívalo.
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "GRATUITO" } });
    const limit = Number(plan.maxUsers);

    const parked = await createUser(tenantB, "VIEWER", "rol-parked-b");
    await deactivateMember(adminB, parked.userId);

    const current = await prisma.user.count({
      where: { tenantId: tenantB, status: { in: ["ACTIVE", "INVITED"] } },
    });
    const filler: string[] = [];
    for (let i = 0; i < limit - current; i++) {
      const extra = await createUser(tenantB, "VIEWER", `rol-filler-${i}-b`);
      filler.push(extra.userId);
    }

    await expect(reactivateMember(adminB, parked.userId)).rejects.toMatchObject({ name: "QuotaExceededError" });

    // Liberar un cupo permite reactivar.
    if (filler[0]) {
      await deactivateMember(adminB, filler[0]);
      await expect(reactivateMember(adminB, parked.userId)).resolves.not.toThrow();
    }
  });

  it("no cruza la frontera del tenant", async () => {
    await expect(deactivateMember(adminB, memberA.userId)).rejects.toMatchObject({ name: "NotFoundError" });
  });
});

describe("listMembers", () => {
  it("solo lista miembros del tenant, con rol y estado", async () => {
    const members = await listMembers(tenantA);
    expect(members.length).toBeGreaterThan(0);
    expect(members.every((member) => member.email.includes(`-${stamp}@`))).toBe(true);
    const other = await listMembers(tenantB);
    const idsA = new Set(members.map((member) => member.id));
    expect(other.some((member) => idsA.has(member.id))).toBe(false);
  });
});
