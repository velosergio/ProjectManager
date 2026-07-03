import { describe, expect, it } from "vitest";

import { clientFiltersSchema, clientInputSchema } from "@/lib/clients/schemas";

// Validaciones Zod de la feature de clientes (FR-002/FR-003) y de los filtros
// del listado (FR-009/FR-010/FR-015).

describe("clientInputSchema", () => {
  it("acepta un cliente solo con nombre y normaliza los opcionales vacíos a null", () => {
    const parsed = clientInputSchema.parse({ name: "  Acme S.A.  ", email: "", phone: "" });
    expect(parsed.name).toBe("Acme S.A.");
    expect(parsed.email).toBeNull();
    expect(parsed.phone).toBeNull();
    expect(parsed.tagIds).toEqual([]);
  });

  it("rechaza el nombre vacío o solo espacios", () => {
    expect(() => clientInputSchema.parse({ name: "" })).toThrowError(/obligatorio/);
    expect(() => clientInputSchema.parse({ name: "   " })).toThrowError(/obligatorio/);
  });

  it("rechaza nombres de más de 120 caracteres", () => {
    expect(() => clientInputSchema.parse({ name: "a".repeat(121) })).toThrowError(/120/);
  });

  it("valida el formato del email cuando se proporciona", () => {
    expect(() => clientInputSchema.parse({ name: "Acme", email: "no-es-email" })).toThrowError(/email/i);
    const parsed = clientInputSchema.parse({ name: "Acme", email: "hola@acme.co" });
    expect(parsed.email).toBe("hola@acme.co");
  });

  it("recorta el teléfono y rechaza más de 30 caracteres", () => {
    const parsed = clientInputSchema.parse({ name: "Acme", phone: " +57 300 123 4567 " });
    expect(parsed.phone).toBe("+57 300 123 4567");
    expect(() => clientInputSchema.parse({ name: "Acme", phone: "1".repeat(31) })).toThrowError(/30/);
  });

  it("acepta etiquetas y limita su cantidad", () => {
    const parsed = clientInputSchema.parse({ name: "Acme", tagIds: ["t1", "t2"] });
    expect(parsed.tagIds).toEqual(["t1", "t2"]);
    expect(() =>
      clientInputSchema.parse({ name: "Acme", tagIds: Array.from({ length: 21 }, (_, i) => `t${i}`) }),
    ).toThrowError(/etiquetas/i);
  });
});

describe("clientFiltersSchema", () => {
  it("aplica valores por defecto con searchParams vacíos", () => {
    const filters = clientFiltersSchema.parse({});
    expect(filters.page).toBe(1);
    expect(filters.q).toBeUndefined();
    expect(filters.tagId).toBeUndefined();
    expect(filters.active).toBeUndefined();
  });

  it("descarta valores inválidos en vez de romper la página", () => {
    const filters = clientFiltersSchema.parse({ page: "abc", active: "quizás", q: 42 });
    expect(filters.page).toBe(1);
    expect(filters.active).toBeUndefined();
    expect(filters.q).toBeUndefined();
  });

  it("interpreta el filtro de activos y la página desde la URL", () => {
    const filters = clientFiltersSchema.parse({ q: " acme ", tagId: "tag_1", active: "true", page: "3" });
    expect(filters.q).toBe("acme");
    expect(filters.tagId).toBe("tag_1");
    expect(filters.active).toBe(true);
    expect(filters.page).toBe(3);
  });
});
