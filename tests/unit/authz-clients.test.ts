import { describe, expect, it } from "vitest";

import type { UserRole } from "@/generated/prisma/client";
import { canManageClients } from "@/lib/authz-clients";

// Matriz de permisos de la gestión de clientes (FR-002/FR-004/FR-005,
// clarificación 2026-07-03): ADMIN y MANAGER gestionan (más MANGO,
// transversal); MEMBER y VIEWER solo consultan.

const ROLES: UserRole[] = ["ADMIN", "MANGO", "MANAGER", "MEMBER", "VIEWER"];

describe("canManageClients", () => {
  it("gestión de clientes: solo ADMIN, MANAGER y MANGO", () => {
    const expected: Record<UserRole, boolean> = {
      ADMIN: true,
      MANGO: true,
      MANAGER: true,
      MEMBER: false,
      VIEWER: false,
    };
    for (const role of ROLES) {
      expect(canManageClients(role), role).toBe(expected[role]);
    }
  });
});
