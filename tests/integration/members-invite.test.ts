import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DuplicateNameError, QuotaExceededError } from "@/lib/errors";
import type { MemberActor } from "@/lib/members/mutations";
import { acceptInvitation, cancelInvitation, inviteMember, resendInvitation } from "@/lib/members/mutations";
import { listMembers } from "@/lib/members/queries";
import { prisma } from "@/lib/prisma";

import { ensurePlansSeeded } from "./helpers";

// Invitaciones de miembros (US1): alta como INVITED con token de un solo uso,
// cuota activos + invitados, email único sin revelar organizaciones, aceptación,
// reenvío y cancelación (FR-002..FR-005, FR-009).

const stamp = Date.now();
const ORIGIN = "http://test.local";

let tenantA: string;
let tenantB: string;
let adminA: MemberActor;
let memberA: MemberActor;
let adminB: MemberActor;

function tokenFrom(inviteUrl: string): string {
  const token = new URL(inviteUrl).searchParams.get("token");
  if (!token) throw new Error("La URL de invitación no incluye token.");
  return token;
}

async function createTenant(name: string, planCode: "GRATUITO" | "PRO_PLUS") {
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: planCode } });
  const tenant = await prisma.tenant.create({ data: { name } });
  await prisma.subscription.create({
    data: { tenantId: tenant.id, planId: plan.id, status: "ACTIVE", cycle: "MONTHLY" },
  });
  return tenant.id;
}

async function createUser(tenantId: string, role: "ADMIN" | "MEMBER", label: string): Promise<MemberActor> {
  const user = await prisma.user.create({
    data: { name: label, email: `${label}-${stamp}@test.local`, role, tenantId, status: "ACTIVE" },
  });
  return { userId: user.id, role, tenantId };
}

beforeAll(async () => {
  // Los planes con las cuotas vigentes de la FASE 4 (Gratuito limitado).
  await ensurePlansSeeded();
  tenantA = await createTenant(`INV-A ${stamp}`, "PRO_PLUS");
  tenantB = await createTenant(`INV-B ${stamp}`, "GRATUITO");
  adminA = await createUser(tenantA, "ADMIN", "inv-admin-a");
  memberA = await createUser(tenantA, "MEMBER", "inv-member-a");
  adminB = await createUser(tenantB, "ADMIN", "inv-admin-b");
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
  await prisma.$disconnect();
});

describe("inviteMember", () => {
  it("crea el miembro en estado INVITED, con token hasheado y URL de invitación", async () => {
    const email = `invitado-1-${stamp}@test.local`;
    const { memberId, inviteUrl } = await inviteMember(adminA, { email, role: "MEMBER" }, ORIGIN);

    const created = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(created.status).toBe("INVITED");
    expect(created.tenantId).toBe(tenantA);
    expect(created.password).toBeNull();

    const token = tokenFrom(inviteUrl);
    expect(inviteUrl.startsWith(`${ORIGIN}/invite?token=`)).toBe(true);
    const stored = await prisma.invitationToken.findFirst({ where: { userId: memberId } });
    expect(stored?.tokenHash).toBeTruthy();
    // Nunca se persiste el token en claro.
    expect(stored?.tokenHash).not.toBe(token);
  });

  it("aparece en el listado como invitado con su caducidad", async () => {
    const members = await listMembers(tenantA);
    const invited = members.find((member) => member.status === "INVITED");
    expect(invited).toBeTruthy();
    expect(invited?.invitation?.expired).toBe(false);
    expect(invited?.invitation?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("solo ADMIN puede invitar", async () => {
    await expect(
      inviteMember(memberA, { email: `no-${stamp}@test.local`, role: "MEMBER" }, ORIGIN),
    ).rejects.toMatchObject({ name: "ForbiddenError" });
  });

  it("rechaza un email ya registrado sin revelar a qué organización pertenece", async () => {
    // El email del admin del tenant B ya existe en la plataforma.
    const email = `inv-admin-b-${stamp}@test.local`;
    const attempt = inviteMember(adminA, { email, role: "MEMBER" }, ORIGIN);
    await expect(attempt).rejects.toBeInstanceOf(DuplicateNameError);
    await expect(attempt).rejects.not.toThrow(/INV-B/);
  });

  it("bloquea la invitación al alcanzar la cuota del plan (activos + invitados cuentan)", async () => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "GRATUITO" } });
    const limit = plan.maxUsers;
    expect(limit).not.toBeNull();

    // Rellena el cupo restante del tenant B (ya tiene 1 admin activo).
    const current = await prisma.user.count({
      where: { tenantId: tenantB, status: { in: ["ACTIVE", "INVITED"] } },
    });
    for (let i = 0; i < Number(limit) - current; i++) {
      await inviteMember(adminB, { email: `cupo-${i}-${stamp}@test.local`, role: "VIEWER" }, ORIGIN);
    }

    await expect(
      inviteMember(adminB, { email: `desborde-${stamp}@test.local`, role: "VIEWER" }, ORIGIN),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it("dos invitaciones simultáneas nunca superan la cuota (carrera en el límite)", async () => {
    // El tenant B quedó exactamente en el límite por la prueba anterior; libera
    // un cupo y dispara dos invitaciones a la vez contra ese único hueco.
    const invited = await prisma.user.findFirstOrThrow({ where: { tenantId: tenantB, status: "INVITED" } });
    await cancelInvitation(adminB, invited.id);

    const results = await Promise.allSettled([
      inviteMember(adminB, { email: `carrera-1-${stamp}@test.local`, role: "VIEWER" }, ORIGIN),
      inviteMember(adminB, { email: `carrera-2-${stamp}@test.local`, role: "VIEWER" }, ORIGIN),
    ]);

    const successes = results.filter((result) => result.status === "fulfilled");
    expect(successes.length).toBeLessThanOrEqual(1);

    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "GRATUITO" } });
    const total = await prisma.user.count({
      where: { tenantId: tenantB, status: { in: ["ACTIVE", "INVITED"] } },
    });
    expect(total).toBeLessThanOrEqual(Number(plan.maxUsers));
  });
});

describe("acceptInvitation", () => {
  it("activa la cuenta: nombre, contraseña y estado ACTIVE; el token queda usado", async () => {
    const email = `invitado-acepta-${stamp}@test.local`;
    const { memberId, inviteUrl } = await inviteMember(adminA, { email, role: "MANAGER" }, ORIGIN);
    const token = tokenFrom(inviteUrl);

    const result = await acceptInvitation({
      token,
      name: "Invitada Aceptante",
      password: "secreta123",
      confirm: "secreta123",
    });
    expect(result.ok).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(user.status).toBe("ACTIVE");
    expect(user.name).toBe("Invitada Aceptante");
    expect(user.password).toBeTruthy();

    // Un solo uso: el mismo enlace ya no sirve.
    const reuse = await acceptInvitation({
      token,
      name: "Otra Persona",
      password: "secreta123",
      confirm: "secreta123",
    });
    expect(reuse.ok).toBe(false);
  });

  it("rechaza un token caducado", async () => {
    const email = `invitado-caduca-${stamp}@test.local`;
    const { memberId, inviteUrl } = await inviteMember(adminA, { email, role: "MEMBER" }, ORIGIN);
    await prisma.invitationToken.updateMany({
      where: { userId: memberId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await acceptInvitation({
      token: tokenFrom(inviteUrl),
      name: "Llega Tarde",
      password: "secreta123",
      confirm: "secreta123",
    });
    expect(result.ok).toBe(false);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: memberId } });
    expect(user.status).toBe("INVITED");
  });

  it("rechaza un token inexistente", async () => {
    const result = await acceptInvitation({
      token: "token-inventado",
      name: "Nadie",
      password: "secreta123",
      confirm: "secreta123",
    });
    expect(result.ok).toBe(false);
  });
});

describe("resendInvitation", () => {
  it("genera un enlace nuevo e invalida el anterior", async () => {
    const email = `invitado-reenvio-${stamp}@test.local`;
    const { memberId, inviteUrl } = await inviteMember(adminA, { email, role: "MEMBER" }, ORIGIN);
    const oldToken = tokenFrom(inviteUrl);

    const { inviteUrl: newUrl } = await resendInvitation(adminA, memberId, ORIGIN);
    const newToken = tokenFrom(newUrl);
    expect(newToken).not.toBe(oldToken);

    const oldAttempt = await acceptInvitation({
      token: oldToken,
      name: "Con Enlace Viejo",
      password: "secreta123",
      confirm: "secreta123",
    });
    expect(oldAttempt.ok).toBe(false);

    const newAttempt = await acceptInvitation({
      token: newToken,
      name: "Con Enlace Nuevo",
      password: "secreta123",
      confirm: "secreta123",
    });
    expect(newAttempt.ok).toBe(true);
  });

  it("solo se reenvían invitaciones pendientes", async () => {
    await expect(resendInvitation(adminA, memberA.userId, ORIGIN)).rejects.toMatchObject({
      name: "ForbiddenError",
    });
  });
});

describe("cancelInvitation", () => {
  it("elimina al miembro invitado y libera el cupo", async () => {
    const email = `invitado-cancela-${stamp}@test.local`;
    const { memberId } = await inviteMember(adminA, { email, role: "VIEWER" }, ORIGIN);

    await cancelInvitation(adminA, memberId);
    expect(await prisma.user.findUnique({ where: { id: memberId } })).toBeNull();
    expect(await prisma.invitationToken.count({ where: { userId: memberId } })).toBe(0);
  });

  it("no cancela miembros ya activos", async () => {
    await expect(cancelInvitation(adminA, memberA.userId)).rejects.toMatchObject({ name: "ForbiddenError" });
  });

  it("no cruza la frontera del tenant", async () => {
    const email = `invitado-ajeno-${stamp}@test.local`;
    const { memberId } = await inviteMember(adminA, { email, role: "VIEWER" }, ORIGIN);
    await expect(cancelInvitation(adminB, memberId)).rejects.toMatchObject({ name: "NotFoundError" });
  });
});
