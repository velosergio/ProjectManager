import { config as loadEnv } from "dotenv";

// Carga las variables de entorno locales para las pruebas (DATABASE_URL, etc.),
// con la misma prioridad que el resto del proyecto: `.env.local` y luego `.env`.
loadEnv({ path: ".env.local" });
loadEnv();
