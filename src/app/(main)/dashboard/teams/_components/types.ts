import type { UserRole, UserStatus } from "@/generated/prisma/client";

// Tipos compartidos por los componentes del listado, el detalle y los
// formularios de equipos (datos ya serializados desde los RSC).

/// Usuario elegible para la composición de un equipo (miembros del tenant).
export interface MemberOption {
  id: string;
  name: string;
  email: string;
}

/// Fila del listado de equipos (salida de `listTeams`).
export interface TeamListRow {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  noteCount: number;
}

/// Miembro de un equipo en el detalle (salida de `getTeamDetail`).
export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
