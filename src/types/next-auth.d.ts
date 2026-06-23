import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/generated/prisma/client";

// Augmentación de los tipos de NextAuth para transportar `tenantId` y `role`
// en la sesión y el JWT (FR-016). El middleware edge solo lee el JWT.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      tenantId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    tenantId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    tenantId?: string | null;
  }
}
