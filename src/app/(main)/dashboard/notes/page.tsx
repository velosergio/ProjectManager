import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { canCreateNotes } from "@/lib/authz-notes";
import { listNotes } from "@/lib/notes/queries";
import { noteFiltersSchema } from "@/lib/notes/schemas";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { toNoteListItem } from "./_components/mappers";
import { NoteFormDialog } from "./_components/note-form-dialog";
import { NotesFilters } from "./_components/notes-filters";
import { NotesList } from "./_components/notes-list";
import type { NoteRefOptions } from "./_components/types";

export const metadata = {
  title: "Notas",
};

const EMPTY_OPTIONS: NoteRefOptions = { projects: [], tasks: [], teams: [] };

/// Listado central de notas (FR-020/FR-021): paginado en servidor, con
/// búsqueda por título/contenido y filtro por alcance vía `searchParams`.
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getTenantContext();
  if (!ctx) {
    return null;
  }
  if (!ctx.tenantId) {
    // `mango` sin organización seleccionada (mismo edge case que proyectos).
    return (
      <div className="p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Selecciona una organización</EmptyTitle>
            <EmptyDescription>Para ver notas, primero elige una organización desde la consola mango.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/dashboard/mango">Ir a la consola mango</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const raw = await searchParams;
  const filters = noteFiltersSchema.parse(raw);
  const db = await getTenantDb();
  const canCreate = canCreateNotes(ctx.role);

  // Las referencias solo hacen falta para el diálogo de creación.
  const [result, refOptions] = await Promise.all([
    listNotes(db, filters),
    canCreate
      ? (async (): Promise<NoteRefOptions> => {
          const [projects, tasks, teams] = await Promise.all([
            db.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
            db.task.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
            db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
          ]);
          return { projects, tasks, teams };
        })()
      : Promise.resolve(EMPTY_OPTIONS),
  ]);

  const notes = result.notes.map((note) => toNoteListItem(note, { userId: ctx.userId, role: ctx.role }));
  const hasFilters = Boolean(filters.q ?? filters.scope);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Notas</h1>
          <p className="text-muted-foreground text-sm">
            {result.total === 0 ? "Sin notas todavía." : `${result.total} nota(s) en tu organización.`}
          </p>
        </div>
        {canCreate && <NoteFormDialog mode="create" refOptions={refOptions} />}
      </div>

      {(result.total > 0 || hasFilters) && <NotesFilters />}

      {result.total === 0 && !hasFilters ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Aún no hay notas</EmptyTitle>
            <EmptyDescription>
              {canCreate
                ? "Crea la primera nota para compartir información con tu organización."
                : "Cuando tu organización tenga notas, aparecerán aquí."}
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <NoteFormDialog mode="create" refOptions={refOptions} triggerLabel="Crear la primera nota" />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <NotesList
          notes={notes}
          page={result.page}
          pageCount={result.pageCount}
          hasFilters={hasFilters}
          searchTerm={filters.q}
        />
      )}
    </div>
  );
}
