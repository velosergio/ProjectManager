import { describe, expect, it } from "vitest";

import type { UserRole } from "@/generated/prisma/client";
import {
  canDeleteProject,
  canEditProject,
  canManageCatalogs,
  canManageProjects,
  canManageTasks,
} from "@/lib/authz-projects";

const ROLES: UserRole[] = ["ADMIN", "MANGO", "MANAGER", "MEMBER", "VIEWER"];

describe("matriz de permisos FR-018", () => {
  it("gestión de proyectos: ADMIN, MANAGER y MANGO", () => {
    const expected: Record<UserRole, boolean> = {
      ADMIN: true,
      MANGO: true,
      MANAGER: true,
      MEMBER: false,
      VIEWER: false,
    };
    for (const role of ROLES) {
      expect(canManageProjects(role), role).toBe(expected[role]);
      expect(canDeleteProject(role), role).toBe(expected[role]);
      expect(canManageCatalogs(role), role).toBe(expected[role]);
    }
  });

  it("gestión de tareas: todos salvo VIEWER", () => {
    const expected: Record<UserRole, boolean> = {
      ADMIN: true,
      MANGO: true,
      MANAGER: true,
      MEMBER: true,
      VIEWER: false,
    };
    for (const role of ROLES) {
      expect(canManageTasks(role), role).toBe(expected[role]);
    }
  });
});

describe("canEditProject", () => {
  const project = { ownerId: "user_owner", taskAssigneeIds: ["user_assignee"] as const };

  it("los roles de gestión editan cualquier proyecto", () => {
    for (const role of ["ADMIN", "MANAGER", "MANGO"] as UserRole[]) {
      expect(canEditProject({ userId: "ajeno", role }, project)).toBe(true);
    }
  });

  it("MEMBER edita si es responsable del proyecto", () => {
    expect(canEditProject({ userId: "user_owner", role: "MEMBER" }, project)).toBe(true);
  });

  it("MEMBER edita si es responsable de alguna tarea", () => {
    expect(canEditProject({ userId: "user_assignee", role: "MEMBER" }, project)).toBe(true);
  });

  it("MEMBER ajeno no edita", () => {
    expect(canEditProject({ userId: "ajeno", role: "MEMBER" }, project)).toBe(false);
  });

  it("VIEWER nunca edita, aunque sea responsable", () => {
    expect(canEditProject({ userId: "user_owner", role: "VIEWER" }, project)).toBe(false);
  });
});
