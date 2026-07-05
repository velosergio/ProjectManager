import { describe, expect, it } from "vitest";

import { acceptInvitationSchema, changeRoleSchema, inviteMemberSchema } from "@/lib/members/schemas";

// Validaciones de la gestión de miembros (US1): invitación (email + rol
// asignable), aceptación (nombre + contraseña con la política del registro)
// y cambio de rol (FR-002/FR-003/FR-006).

describe("inviteMemberSchema", () => {
  it("acepta email válido y rol asignable", () => {
    const parsed = inviteMemberSchema.parse({ email: "nuevo@test.local", role: "MEMBER" });
    expect(parsed.email).toBe("nuevo@test.local");
    expect(parsed.role).toBe("MEMBER");
  });

  it("normaliza el email (espacios y mayúsculas)", () => {
    const parsed = inviteMemberSchema.parse({ email: "  Nuevo@Test.LOCAL  ", role: "VIEWER" });
    expect(parsed.email).toBe("nuevo@test.local");
  });

  it("rechaza emails con formato inválido", () => {
    expect(() => inviteMemberSchema.parse({ email: "no-es-email", role: "MEMBER" })).toThrow();
  });

  it("rechaza el rol MANGO (solo se crea vía npm run mango)", () => {
    expect(() => inviteMemberSchema.parse({ email: "otro@test.local", role: "MANGO" })).toThrow();
  });

  it("rechaza roles desconocidos o ausentes", () => {
    expect(() => inviteMemberSchema.parse({ email: "otro@test.local", role: "SUPREMO" })).toThrow();
    expect(() => inviteMemberSchema.parse({ email: "otro@test.local" })).toThrow();
  });
});

describe("acceptInvitationSchema", () => {
  const base = { token: "tok", name: "Ana García", password: "secreta123", confirm: "secreta123" };

  it("acepta datos completos con contraseñas coincidentes", () => {
    const parsed = acceptInvitationSchema.parse(base);
    expect(parsed.name).toBe("Ana García");
  });

  it("aplica la política de contraseña del registro (mínimo 8 caracteres)", () => {
    expect(() => acceptInvitationSchema.parse({ ...base, password: "corta", confirm: "corta" })).toThrow();
  });

  it("rechaza contraseñas que no coinciden (error en `confirm`)", () => {
    const result = acceptInvitationSchema.safeParse({ ...base, confirm: "distinta123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("confirm"))).toBe(true);
    }
  });

  it("exige un nombre de al menos 2 caracteres", () => {
    expect(() => acceptInvitationSchema.parse({ ...base, name: " A " })).toThrow();
  });

  it("exige el token del enlace", () => {
    expect(() => acceptInvitationSchema.parse({ ...base, token: "" })).toThrow();
  });
});

describe("changeRoleSchema", () => {
  it("acepta un userId y un rol asignable", () => {
    expect(changeRoleSchema.parse({ userId: "u1", role: "ADMIN" })).toEqual({ userId: "u1", role: "ADMIN" });
  });

  it("rechaza MANGO como rol destino", () => {
    expect(() => changeRoleSchema.parse({ userId: "u1", role: "MANGO" })).toThrow();
  });
});
