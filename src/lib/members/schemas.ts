import { z } from "zod";

import { ASSIGNABLE_ROLES } from "@/lib/authz-members";

// Esquemas Zod de la gestión de miembros (FASE 4). Puros y sin acceso a
// datos: se reutilizan desde las Server Actions, los formularios (RHF) y las
// pruebas unitarias.

/// Email normalizado (sin espacios, en minúsculas) antes de validar.
const normalizedEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .email({ message: "El correo electrónico no tiene un formato válido." })
    .max(254, "El correo electrónico es demasiado largo."),
);

/// Rol asignable por invitación o cambio de rol; MANGO queda excluido
/// (solo se crea vía `npm run mango`).
const assignableRole = z.enum(ASSIGNABLE_ROLES, { message: "El rol seleccionado no es válido." });

export const inviteMemberSchema = z.object({
  email: normalizedEmail,
  role: assignableRole,
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/// Política de contraseña alineada con el registro (mínimo 8 caracteres).
const passwordSchema = z
  .string({ message: "La contraseña es obligatoria." })
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(100, "La contraseña es demasiado larga.");

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, "El enlace de invitación no es válido."),
    name: z
      .string({ message: "El nombre es obligatorio." })
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(120, "El nombre no puede superar los 120 caracteres."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const changeRoleSchema = z.object({
  userId: z.string().min(1),
  role: assignableRole,
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
