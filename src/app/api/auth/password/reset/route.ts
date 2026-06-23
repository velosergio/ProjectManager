import { NextResponse } from "next/server";

import { z } from "zod";

import { resetPassword } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) {
    return NextResponse.json({ error: "El enlace no es válido o ha caducado. Solicita uno nuevo." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
