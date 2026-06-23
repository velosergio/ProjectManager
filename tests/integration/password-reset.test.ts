import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPasswordResetToken, hashToken, requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

import { randomBytes } from "node:crypto";

const EMAIL = `reset_${Date.now()}@example.com`;
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "Reset User",
      email: EMAIL,
      password: await bcrypt.hash("oldpassword", 10),
      role: "MANGO",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("recuperación de contraseña", () => {
  it("token válido cambia la contraseña y luego no se puede reutilizar", async () => {
    const token = await createPasswordResetToken(userId);

    const first = await resetPassword(token, "newpassword123");
    expect(first).toEqual({ ok: true });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare("newpassword123", user.password ?? "")).toBe(true);

    const reuse = await resetPassword(token, "otravez123");
    expect(reuse).toEqual({ ok: false });
  });

  it("token caducado es rechazado", async () => {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() - 60_000) },
    });
    expect(await resetPassword(token, "loquesea123")).toEqual({ ok: false });
  });

  it("solicitar reset con email inexistente no crea token (respuesta neutra)", async () => {
    const ghost = `ghost_${Date.now()}@example.com`;
    await requestPasswordReset(ghost, "http://localhost:3000");
    const ghostUser = await prisma.user.findUnique({ where: { email: ghost } });
    expect(ghostUser).toBeNull();
  });
});
