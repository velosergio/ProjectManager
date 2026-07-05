import { canCreateNotes } from "@/lib/authz-notes";
import { listNotesForContext } from "@/lib/notes/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { toNoteListItem } from "../../../notes/_components/mappers";
import { NotesSection } from "../../../notes/_components/notes-section";

interface TeamNotesSectionProps {
  teamId: string;
  teamName: string;
}

/// Notas del equipo (FR-022): sección embebida en el detalle, de la más
/// reciente a la más antigua. Legibles por toda la organización
/// (clarificación 2026-07-03).
export async function TeamNotesSection({ teamId, teamName }: TeamNotesSectionProps) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    return null;
  }
  const db = await getTenantDb();
  const notes = await listNotesForContext(db, { teamId });
  const items = notes.map((note) => toNoteListItem(note, { userId: ctx.userId, role: ctx.role }));

  return (
    <NotesSection
      title="Notas del equipo"
      notes={items}
      canCreate={canCreateNotes(ctx.role)}
      fixedContext={{ scope: "TEAM", referenceId: teamId, label: `el equipo «${teamName}»` }}
      emptyText="Este equipo aún no tiene notas."
    />
  );
}
