import { z } from "zod";

// Esquemas Zod de los equipos de trabajo (FASE 4, US2). Puros y sin acceso a
// datos: se reutilizan desde las Server Actions, los formularios (RHF) y las
// pruebas.

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

const optionalDescription = z.preprocess(
  emptyToNull,
  z.string().trim().max(500, "La descripción no puede superar los 500 caracteres.").nullable(),
);

/// Alta y edición de un equipo (FR-012): nombre obligatorio, descripción
/// opcional y composición inicial de miembros (FR-013).
export const teamInputSchema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre no puede superar los 120 caracteres."),
  description: optionalDescription.default(null),
  memberIds: z.array(z.string().min(1)).max(200, "Demasiados miembros.").default([]),
});

export type TeamInput = z.infer<typeof teamInputSchema>;

/// Reemplazo completo de la composición de un equipo (FR-013).
export const teamMembersSchema = z.object({
  teamId: z.string().min(1, "El equipo es obligatorio."),
  memberIds: z.array(z.string().min(1)).max(200, "Demasiados miembros."),
});

export type TeamMembersInput = z.infer<typeof teamMembersSchema>;
