import { defineConfig } from "vitest/config";

import { resolve } from "node:path";

// Configuración de Vitest. Las pruebas que tocan la base de datos usan la misma
// conexión que el runtime (DATABASE_URL en `.env.local`), cargada en el setup.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
