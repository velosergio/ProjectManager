import { describe, expect, it } from "vitest";

import { mangoSchema } from "@/lib/mango-schema";

const base = { name: "Mango", email: "mango@example.com", password: "supersecret", passwordConfirm: "supersecret" };

describe("mangoSchema", () => {
  it("acepta datos válidos", () => {
    expect(mangoSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza email inválido", () => {
    expect(mangoSchema.safeParse({ ...base, email: "no-es-email" }).success).toBe(false);
  });

  it("rechaza contraseña corta", () => {
    expect(mangoSchema.safeParse({ ...base, password: "corta", passwordConfirm: "corta" }).success).toBe(false);
  });

  it("rechaza confirmación que no coincide", () => {
    const result = mangoSchema.safeParse({ ...base, passwordConfirm: "otra-distinta" });
    expect(result.success).toBe(false);
  });
});
