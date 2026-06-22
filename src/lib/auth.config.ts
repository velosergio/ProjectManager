import type { NextAuthConfig } from "next-auth";

/**
 * Configuración base de NextAuth segura para el runtime edge (middleware).
 *
 * No incluye el `PrismaAdapter` ni `bcryptjs` porque no funcionan en edge; esos se añaden en
 * `auth.ts` (instancia completa con acceso a base de datos). El middleware solo necesita leer el
 * JWT de sesión, por lo que esta configuración es suficiente y portable a edge.
 */
export const authConfig = {
  // Las credenciales (usuario/contraseña) requieren estrategia JWT.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/v1/login",
  },
  // Los providers se declaran en la instancia completa (`auth.ts`); el middleware no autentica,
  // solo verifica la sesión existente.
  providers: [],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
