import { cancel, intro, isCancel, outro, password as passwordPrompt, text } from "@clack/prompts";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { mangoSchema } from "../src/lib/mango-schema";

// CLI interactivo para crear el super usuario `mango` (acceso global, sin
// tenant). Se ejecuta con `npm run mango`. Autónomo, como `prisma/seed.ts`.
loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL no está definida");
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(connectionString) });

function abort(message: string): never {
  cancel(message);
  process.exit(1);
}

async function ask(prompt: Promise<string | symbol>): Promise<string> {
  const value = await prompt;
  if (isCancel(value)) {
    abort("Operación cancelada.");
  }
  return value as string;
}

async function main() {
  intro("Crear super usuario mango");

  const name = await ask(text({ message: "Nombre completo", placeholder: "Tu nombre" }));
  const email = await ask(text({ message: "Correo electrónico", placeholder: "tu@ejemplo.com" }));
  const pwd = await ask(passwordPrompt({ message: "Contraseña (mín. 8 caracteres)" }));
  const passwordConfirm = await ask(passwordPrompt({ message: "Confirma la contraseña" }));

  const parsed = mangoSchema.safeParse({ name, email, password: pwd, passwordConfirm });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    abort(first?.message ?? "Datos inválidos.");
  }

  // Idempotencia: el email es único globalmente.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    abort("Ya existe un usuario con ese correo. No se creó nada.");
  }

  const hashedPassword = await bcrypt.hash(pwd, 10);
  await prisma.user.create({
    data: { name, email, password: hashedPassword, role: "MANGO", tenantId: null, status: "ACTIVE" },
  });

  outro(`Usuario mango creado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
