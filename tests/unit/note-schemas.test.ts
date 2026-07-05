import { describe, expect, it } from "vitest";

import { noteFiltersSchema, noteInputSchema, noteUpdateSchema } from "@/lib/notes/schemas";

// Schemas de notas (US3): XOR alcance ↔ referencia mediante unión
// discriminada (FR-016/FR-017) y filtros del listado central (FR-021).

describe("noteInputSchema — XOR alcance ↔ referencia", () => {
  it("acepta una nota GLOBAL sin referencias", () => {
    const parsed = noteInputSchema.parse({ scope: "GLOBAL", title: "Nota general", content: "Contenido" });
    expect(parsed.scope).toBe("GLOBAL");
  });

  it("rechaza una nota GLOBAL con referencia de proyecto", () => {
    expect(() =>
      noteInputSchema.parse({ scope: "GLOBAL", title: "Nota", content: "Contenido", projectId: "p1" }),
    ).toThrow();
  });

  it("acepta PROJECT con exactamente su referencia", () => {
    const parsed = noteInputSchema.parse({
      scope: "PROJECT",
      projectId: "p1",
      title: "Nota de proyecto",
      content: "Contenido",
    });
    expect(parsed).toMatchObject({ scope: "PROJECT", projectId: "p1" });
  });

  it("rechaza PROJECT sin projectId", () => {
    expect(() => noteInputSchema.parse({ scope: "PROJECT", title: "Nota", content: "Contenido" })).toThrow();
  });

  it("rechaza PROJECT con una referencia ajena a su alcance", () => {
    expect(() =>
      noteInputSchema.parse({
        scope: "PROJECT",
        projectId: "p1",
        teamId: "t1",
        title: "Nota",
        content: "Contenido",
      }),
    ).toThrow();
  });

  it("acepta TASK con taskId y TEAM con teamId", () => {
    expect(noteInputSchema.parse({ scope: "TASK", taskId: "t1", title: "Nota", content: "C" }).scope).toBe("TASK");
    expect(noteInputSchema.parse({ scope: "TEAM", teamId: "e1", title: "Nota", content: "C" }).scope).toBe("TEAM");
  });

  it("rechaza TASK sin taskId y TEAM sin teamId", () => {
    expect(() => noteInputSchema.parse({ scope: "TASK", title: "Nota", content: "C" })).toThrow();
    expect(() => noteInputSchema.parse({ scope: "TEAM", title: "Nota", content: "C" })).toThrow();
  });

  it("rechaza un alcance desconocido", () => {
    expect(() => noteInputSchema.parse({ scope: "OTRO", title: "Nota", content: "C" })).toThrow();
  });

  it("exige título de 1 a 200 caracteres", () => {
    expect(() => noteInputSchema.parse({ scope: "GLOBAL", title: "   ", content: "C" })).toThrow();
    expect(() => noteInputSchema.parse({ scope: "GLOBAL", title: "x".repeat(201), content: "C" })).toThrow();
    expect(noteInputSchema.parse({ scope: "GLOBAL", title: "x".repeat(200), content: "C" }).title).toHaveLength(200);
  });

  it("exige contenido no vacío", () => {
    expect(() => noteInputSchema.parse({ scope: "GLOBAL", title: "Nota", content: "" })).toThrow();
    expect(() => noteInputSchema.parse({ scope: "GLOBAL", title: "Nota" })).toThrow();
  });
});

describe("noteUpdateSchema", () => {
  it("acepta noteId con título y contenido nuevos", () => {
    const parsed = noteUpdateSchema.parse({ noteId: "n1", title: "Título", content: "Contenido" });
    expect(parsed.noteId).toBe("n1");
  });

  it("no admite reasignar el alcance ni las referencias", () => {
    const parsed = noteUpdateSchema.parse({
      noteId: "n1",
      title: "Título",
      content: "Contenido",
      scope: "PROJECT",
      projectId: "p1",
    });
    expect(parsed).not.toHaveProperty("scope");
    expect(parsed).not.toHaveProperty("projectId");
  });

  it("valida título y contenido igual que la creación", () => {
    expect(() => noteUpdateSchema.parse({ noteId: "n1", title: "", content: "C" })).toThrow();
    expect(() => noteUpdateSchema.parse({ noteId: "n1", title: "Nota", content: "" })).toThrow();
  });
});

describe("noteFiltersSchema", () => {
  it("aplica valores por defecto", () => {
    const parsed = noteFiltersSchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.q).toBeUndefined();
    expect(parsed.scope).toBeUndefined();
  });

  it("descarta valores no reconocidos en vez de romper", () => {
    const parsed = noteFiltersSchema.parse({ scope: "INVALIDO", page: "abc", q: "búsqueda" });
    expect(parsed.scope).toBeUndefined();
    expect(parsed.page).toBe(1);
    expect(parsed.q).toBe("búsqueda");
  });

  it("acepta un alcance válido y una página numérica", () => {
    const parsed = noteFiltersSchema.parse({ scope: "TEAM", page: "3" });
    expect(parsed.scope).toBe("TEAM");
    expect(parsed.page).toBe(3);
  });
});
