import { canCreateNotes } from "@/lib/authz-notes";
import { listNotesForContext } from "@/lib/notes/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { toNoteListItem } from "../../../notes/_components/mappers";
import { NotesSection } from "../../../notes/_components/notes-section";

interface ProjectNotesSectionProps {
  projectId: string;
  projectName: string;
}

/// Notas del proyecto (FR-022): sección embebida en el detalle. RSC: obtiene
/// solo las notas de este contexto y las sirve ya serializadas.
export async function ProjectNotesSection({ projectId, projectName }: ProjectNotesSectionProps) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    return null;
  }
  const db = await getTenantDb();
  const notes = await listNotesForContext(db, { projectId });
  const items = notes.map((note) => toNoteListItem(note, { userId: ctx.userId, role: ctx.role }));

  return (
    <NotesSection
      title="Notas del proyecto"
      notes={items}
      canCreate={canCreateNotes(ctx.role)}
      fixedContext={{ scope: "PROJECT", referenceId: projectId, label: `el proyecto «${projectName}»` }}
      emptyText="Este proyecto aún no tiene notas."
    />
  );
}
