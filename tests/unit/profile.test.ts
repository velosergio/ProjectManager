import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { updateUserProfile } from "@/lib/profile";

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { name: "Nombre Inicial", email: `prof_${Date.now()}@example.com`, role: "MANGO" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("updateUserProfile", () => {
  it("actualiza el nombre del usuario", async () => {
    await updateUserProfile(userId, { name: "Nombre Nuevo" });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.name).toBe("Nombre Nuevo");
  });

  it("rechaza un nombre inválido", async () => {
    await expect(updateUserProfile(userId, { name: "x" })).rejects.toThrow();
  });
});
