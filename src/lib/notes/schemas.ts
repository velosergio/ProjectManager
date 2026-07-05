import { z } from "zod";

// Esquemas Zod de las notas (FASE 4, US3). Puros y sin acceso a datos: se
// reutilizan desde las Server Actions, los formularios (RHF) y las pruebas.
// El XOR alcance ↔ referencia se expresa como unión discriminada con objetos
// estrictos: cada alcance admite exactamente su referencia (FR-016/FR-017).

const noteTitle = z
  .string({ message: "El título es obligatorio." })
  .trim()
  .min(1, "El título es obligatorio.")
  .max(200, "El título no puede superar los 200 caracteres.");

const noteContent = z.string({ message: "El contenido es obligatorio." }).trim().min(1, "El contenido es obligatorio.");

const referenceId = (message: string) => z.string({ message }).min(1, message);

/// Alta de una nota: unión discriminada por `scope`. Los objetos son
/// estrictos para que una referencia ajena al alcance sea un error, no un
/// campo ignorado (mantiene el XOR verificable en el borde).
export const noteInputSchema = z.discriminatedUnion("scope", [
  z.strictObject({ scope: z.literal("GLOBAL"), title: noteTitle, content: noteContent }),
  z.strictObject({
    scope: z.literal("PROJECT"),
    projectId: referenceId("El proyecto de la nota es obligatorio."),
    title: noteTitle,
    content: noteContent,
  }),
  z.strictObject({
    scope: z.literal("TASK"),
    taskId: referenceId("La tarea de la nota es obligatoria."),
    title: noteTitle,
    content: noteContent,
  }),
  z.strictObject({
    scope: z.literal("TEAM"),
    teamId: referenceId("El equipo de la nota es obligatorio."),
    title: noteTitle,
    content: noteContent,
  }),
]);

export type NoteInput = z.infer<typeof noteInputSchema>;

/// Edición de una nota: solo título y contenido. El alcance no se reasigna
/// (decisión de contrato); cualquier campo extra se descarta.
export const noteUpdateSchema = z.object({
  noteId: z.string().min(1, "La nota es obligatoria."),
  title: noteTitle,
  content: noteContent,
});

export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;

/// Alcances válidos para el filtro del listado central.
export const NOTE_SCOPES = ["GLOBAL", "PROJECT", "TASK", "TEAM"] as const;

/// Filtros del listado central (leídos de `searchParams`, FR-021). Valores no
/// reconocidos se descartan en vez de romper la página (patrón FASE 2).
export const noteFiltersSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  scope: z.enum(NOTE_SCOPES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export type NoteFilters = z.infer<typeof noteFiltersSchema>;
