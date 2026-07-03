import { z } from "zod";

// Esquemas Zod de la feature de proyectos (FASE 2). Puros y sin acceso a
// datos: se reutilizan desde las Server Actions, los formularios (RHF) y las
// pruebas unitarias.

export const projectStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "ARCHIVED"]);
export const projectPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

/// Id opcional: los formularios envían "" cuando no hay selección.
const optionalId = z
  .string()
  .transform((value) => (value.trim() === "" ? null : value))
  .nullish();

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/// Fecha opcional aceptando `Date` o cadenas de formularios; "" = sin fecha.
/// Las fechas «solo día» (yyyy-MM-dd de <input type="date">) se interpretan
/// como medianoche LOCAL: coaccionarlas como ISO las movería al día anterior
/// en zonas horarias con offset negativo.
const optionalDate = z.preprocess((value) => {
  if (value === "" || value === undefined) {
    return null;
  }
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  }
  return value;
}, z.coerce.date({ message: "Fecha inválida." }).nullable());

export const projectInputSchema = z
  .object({
    name: z
      .string({ message: "El nombre es obligatorio." })
      .trim()
      .min(1, "El nombre es obligatorio.")
      .max(200, "El nombre no puede superar los 200 caracteres."),
    description: z.string().trim().max(5000, "La descripción es demasiado larga.").nullish(),
    clientId: optionalId,
    priority: projectPrioritySchema.default("MEDIUM"),
    status: projectStatusSchema.default("PENDING"),
    startDate: optionalDate,
    endDate: optionalDate,
    ownerId: optionalId,
    processTypeId: optionalId,
    tagIds: z.array(z.string().min(1)).max(20, "Demasiadas etiquetas.").default([]),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "La fecha de cierre no puede ser anterior a la fecha de inicio.",
    path: ["endDate"],
  });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const taskInputSchema = z.object({
  title: z
    .string({ message: "El título es obligatorio." })
    .trim()
    .min(1, "El título es obligatorio.")
    .max(200, "El título no puede superar los 200 caracteres."),
  description: z.string().trim().max(5000, "La descripción es demasiado larga.").nullish(),
  status: taskStatusSchema.default("TODO"),
  assigneeId: optionalId,
  dueDate: optionalDate,
});

export type TaskInput = z.infer<typeof taskInputSchema>;

export const tagInputSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(50, "El nombre no puede superar los 50 caracteres."),
});

export const processTypeInputSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(80, "El nombre no puede superar los 80 caracteres."),
});

/// Filtros del listado de proyectos (leídos de `searchParams`). Valores no
/// reconocidos se descartan en vez de romper la página.
export const projectFiltersSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  status: projectStatusSchema.optional().catch(undefined),
  priority: projectPrioritySchema.optional().catch(undefined),
  ownerId: z.string().optional().catch(undefined),
  clientId: z.string().optional().catch(undefined),
  processTypeId: z.string().optional().catch(undefined),
  tagId: z.string().optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;
