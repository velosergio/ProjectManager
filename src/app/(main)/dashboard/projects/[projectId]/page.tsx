import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canDeleteProject, canEditProject, canManageCatalogs, canManageTasks } from "@/lib/authz-projects";
import { getProjectDetail, listClients, listMembers, listProcessTypes, listTags } from "@/lib/projects/queries";
import { getTenantContext } from "@/lib/tenant-context";
import { getTenantDb } from "@/lib/tenant-db-session";

import { ProjectHeader } from "./_components/project-header";
import { TaskList } from "./_components/task-list";

export const metadata = {
  title: "Detalle del proyecto",
};

/// Vista de detalle de un proyecto (FR-008): campos, etiquetas, avance y
/// tareas. `notFound()` cubre proyectos inexistentes o de otro tenant.
export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    notFound();
  }

  const { projectId } = await params;
  const db = await getTenantDb();
  const detail = await getProjectDetail(db, projectId);
  if (!detail) {
    notFound();
  }

  const [clients, members, processTypes, tags] = await Promise.all([
    listClients(db),
    listMembers(db, ctx.tenantId),
    listProcessTypes(db),
    listTags(db),
  ]);

  const actor = { userId: ctx.userId, role: ctx.role };
  const canEdit = canEditProject(actor, { ownerId: detail.ownerId, taskAssigneeIds: detail.taskAssigneeIds });
  const canDelete = canDeleteProject(ctx.role);
  const canTasks = canManageTasks(ctx.role);
  const catalogs = { clients, members, processTypes, tags };

  const { tasks, taskAssigneeIds: _ids, ...project } = detail;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2">
          <Link href="/dashboard/projects">
            <ArrowLeft data-icon="inline-start" />
            Volver a proyectos
          </Link>
        </Button>
      </div>

      <ProjectHeader
        project={project}
        catalogs={catalogs}
        canEdit={canEdit}
        canDelete={canDelete}
        canManageCatalogs={canManageCatalogs(ctx.role)}
      />

      <TaskList projectId={project.id} tasks={tasks} members={members} canManage={canTasks} />
    </div>
  );
}
