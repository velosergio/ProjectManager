import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

// Instancia edge-safe: solo lee el JWT de sesión (sin adapter ni bcrypt).
const { auth } = NextAuth(authConfig);

/** Rutas accesibles sin sesión. `/api/auth/*` se excluye vía `config.matcher`. */
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/forgot", "/reset"]);

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);
  const publicRoute = isPublicRoute(nextUrl.pathname);

  // Usuario autenticado en una ruta pública (landing o auth) → llevarlo a su área de trabajo.
  if (isLoggedIn && publicRoute) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  // Acceso no autenticado a una ruta protegida → redirigir a la landing.
  if (!isLoggedIn && !publicRoute) {
    return Response.redirect(new URL("/", nextUrl));
  }

  return undefined;
});

export const config = {
  // Excluye API, assets internos de Next y archivos con extensión (estáticos).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
