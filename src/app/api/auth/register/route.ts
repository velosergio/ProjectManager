import { NextResponse } from "next/server";

import { z } from "zod";

import { registerOrganization } from "@/lib/register";

const registerSchema = z.object({
  organizationName: z.string().min(2, "El nombre de la organización debe tener al menos 2 caracteres."),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Ingresa un correo electrónico válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await registerOrganization(parsed.data);

  if (!result.ok) {
    if (result.code === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "Ya existe una cuenta con este correo electrónico." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "No hay planes configurados. Ejecuta el seed de la base de datos." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
