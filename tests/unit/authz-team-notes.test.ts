import { describe, expect, it } from "vitest";

import type { UserRole } from "@/generated/prisma/client";
import { ASSIGNABLE_ROLES, canManageMembers } from "@/lib/authz-members";
import { canCreateNotes, canModifyNote } from "@/lib/authz-notes";
import { canManageTeams } from "@/lib/authz-teams";

// Matrices de permisos de la FASE 4 (clarificaciones 2026-07-03):
// - Miembros: solo ADMIN gestiona (más MANGO, transversal).
// - Equipos: ADMIN y MANAGER gestionan (más MANGO).
// - Notas: crean todos salvo VIEWER; edita/elimina el autor o ADMIN/MANAGER.

const ROLES: UserRole[] = ["ADMIN", "MANGO", "MANAGER", "MEMBER", "VIEWER"];

describe("canManageMembers", () => {
  it("gestión de miembros: solo ADMIN y MANGO", () => {
    const expected: Record<UserRole, boolean> = {
      ADMIN: true,
      MANGO: true,
      MANAGER: false,
      MEMBER: false,
      VIEWER: false,
    };
    for (const role of ROLES) {
      expect(canManageMembers(role), role).toBe(expected[role]);
    }
  });

  it("los roles asignables por invitación excluyen a MANGO", () => {
    expect(ASSIGNABLE_ROLES).toEqual(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);
    expect(ASSIGNABLE_ROLES).not.toContain("MANGO");
  });
});

describe("canManageTeams", () => {
  it("gestión de equipos: ADMIN, MANAGER y MANGO", () => {
    const expected: Record<UserRole, boolean> = {
      ADMIN: true,
      MANGO: true,
      MANAGER: true,
      MEMBER: false,
      VIEWER: false,
    };
    for (const role of ROLES) {
      expect(canManageTeams(role), role).toBe(expected[role]);
    }
  });
});

describe("canCreateNotes", () => {
  it("crear notas: todos los roles salvo VIEWER", () => {
    const expected: Record<UserRole, boolean> = {
      ADMIN: true,
      MANGO: true,
      MANAGER: true,
      MEMBER: true,
      VIEWER: false,
    };
    for (const role of ROLES) {
      expect(canCreateNotes(role), role).toBe(expected[role]);
    }
  });
});

describe("canModifyNote", () => {
  const AUTHOR = "user-autor";
  const OTHER = "user-otro";

  it("el autor edita y elimina sus propias notas", () => {
    expect(canModifyNote("MEMBER", AUTHOR, AUTHOR)).toBe(true);
    expect(canModifyNote("MANAGER", AUTHOR, AUTHOR)).toBe(true);
  });

  it("MEMBER no modifica notas ajenas; ADMIN/MANAGER/MANGO sí", () => {
    expect(canModifyNote("MEMBER", OTHER, AUTHOR)).toBe(false);
    expect(canModifyNote("ADMIN", OTHER, AUTHOR)).toBe(true);
    expect(canModifyNote("MANAGER", OTHER, AUTHOR)).toBe(true);
    expect(canModifyNote("MANGO", OTHER, AUTHOR)).toBe(true);
  });

  it("VIEWER nunca modifica, ni siquiera sus propias notas", () => {
    expect(canModifyNote("VIEWER", AUTHOR, AUTHOR)).toBe(false);
  });

  it("una nota sin autor (autor eliminado) solo la modifican los roles de gestión", () => {
    expect(canModifyNote("MEMBER", OTHER, null)).toBe(false);
    expect(canModifyNote("ADMIN", OTHER, null)).toBe(true);
  });
});
