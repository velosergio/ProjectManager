import { z } from "zod";

// Schema puro (sin acceso a datos) para validar la creación de un super usuario
// `mango`. Vive aparte para poder reutilizarlo desde el CLI (`tsx`) y probarlo.
export const mangoSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    email: z.string().email("Ingresa un correo electrónico válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirm"],
  });

export type MangoInput = z.infer<typeof mangoSchema>;
