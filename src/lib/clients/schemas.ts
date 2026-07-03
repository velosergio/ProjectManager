import { z } from "zod";

// Esquemas Zod de la feature de clientes (FASE 3). Puros y sin acceso a
// datos: se reutilizan desde las Server Actions, los formularios (RHF) y las
// pruebas unitarias.

/// Texto opcional de formulario: "" o ausencia significan «sin valor» (null).
function emptyToNull(value: unknown): unknown {
  if (value == null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

const optionalEmail = z.preprocess(
  emptyToNull,
  z.email({ message: "El email no tiene un formato válido." }).max(254, "El email es demasiado largo.").nullable(),
);

const optionalPhone = z.preprocess(
  emptyToNull,
  z.string().trim().max(30, "El teléfono no puede superar los 30 caracteres.").nullable(),
);

export const clientInputSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  email: optionalEmail.default(null),
  phone: optionalPhone.default(null),
  tagIds: z.array(z.string().min(1)).max(20, "Demasiadas etiquetas.").default([]),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

/// Filtros del listado de clientes (leídos de `searchParams`). Valores no
/// reconocidos se descartan en vez de romper la página (patrón FASE 2).
export const clientFiltersSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  tagId: z.string().optional().catch(undefined),
  /// «Con proyectos activos»: solo se acepta la marca explícita en la URL.
  active: z
    .union([z.literal("true"), z.literal(true)])
    .transform(() => true as const)
    .optional()
    .catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export type ClientFilters = z.infer<typeof clientFiltersSchema>;
