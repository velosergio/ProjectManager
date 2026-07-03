/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    // Limita los workers de "collecting page data" / generación estática
    // (por defecto: CPUs del host - 1). Sin este tope, en el deploy cada
    // worker suma cientos de MB y el VPS mata el contenedor por OOM.
    cpus: 2,
  },
};

export default nextConfig;
