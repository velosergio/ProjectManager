import { describe, expect, it } from "vitest";

import { projectFiltersSchema, projectInputSchema, taskInputSchema } from "@/lib/projects/schemas";

describe("projectInputSchema", () => {
  it("exige el nombre", () => {
    const result = projectInputSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("El nombre es obligatorio.");
    }
  });

  it("aplica defaults con solo el nombre", () => {
    const result = projectInputSchema.parse({ name: "Proyecto X" });
    expect(result).toMatchObject({ name: "Proyecto X", status: "PENDING", priority: "MEDIUM", tagIds: [] });
  });

  it("rechaza fecha de cierre anterior a la de inicio con mensaje en español", () => {
    const result = projectInputSchema.safeParse({
      name: "Proyecto X",
      startDate: "2026-07-10",
      endDate: "2026-07-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("La fecha de cierre no puede ser anterior a la fecha de inicio.");
      expect(result.error.issues[0]?.path).toEqual(["endDate"]);
    }
  });

  it("acepta fechas iguales y coacciona ISO a Date", () => {
    const result = projectInputSchema.parse({ name: "P", startDate: "2026-07-10", endDate: "2026-07-10" });
    expect(result.startDate).toBeInstanceOf(Date);
    expect(result.endDate).toBeInstanceOf(Date);
  });

  it("normaliza ids vacíos de formulario a null", () => {
    const result = projectInputSchema.parse({ name: "P", clientId: "", ownerId: "  ", processTypeId: "" });
    expect(result.clientId).toBeNull();
    expect(result.ownerId).toBeNull();
    expect(result.processTypeId).toBeNull();
  });
});

describe("taskInputSchema", () => {
  it("exige el título", () => {
    const result = taskInputSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("El título es obligatorio.");
    }
  });

  it("aplica estado Pendiente por defecto y fecha nula desde ''", () => {
    const result = taskInputSchema.parse({ title: "Tarea", dueDate: "" });
    expect(result.status).toBe("TODO");
    expect(result.dueDate).toBeNull();
  });
});

describe("projectFiltersSchema", () => {
  it("descarta valores no reconocidos sin romper", () => {
    const result = projectFiltersSchema.parse({ status: "NOPE", priority: "ALTÍSIMA", page: "abc" });
    expect(result.status).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.page).toBe(1);
  });

  it("parsea filtros válidos combinados", () => {
    const result = projectFiltersSchema.parse({ q: "acme", status: "IN_PROGRESS", priority: "HIGH", page: "3" });
    expect(result).toMatchObject({ q: "acme", status: "IN_PROGRESS", priority: "HIGH", page: 3 });
  });
});
