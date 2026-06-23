import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma 7 ya no carga los archivos .env automáticamente cuando existe este
// archivo de configuración. Cargamos primero `.env.local` (mayor prioridad,
// uso local) y luego `.env`; dotenv no sobreescribe variables ya definidas.
loadEnv({ path: ".env.local" });
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
