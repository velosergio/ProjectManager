import { NextResponse } from "next/server";

import { z } from "zod";

import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({ email: z.email() });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(body);

  if (parsed.success) {
    const origin = new URL(request.url).origin;
    await requestPasswordReset(parsed.data.email, origin);
  }

  // Respuesta neutra siempre: no revela si el email existe ni el rate-limit.
  return NextResponse.json({ ok: true });
}
