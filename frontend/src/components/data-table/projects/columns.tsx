import type { ColumnDef } from "@tanstack/react-table";
import { Edit, FolderOpen } from "lucide-react";
import type { TFunction } from "i18next";
import { QuickActions } from "@/components/ui/quick-actions";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import type { Project } from "@/types/project";

interface ProjectColumnsProps {
  t: TFunction;
  onEdit: (project: Project) => void;
  onDelete: (id: number) => void;
  onManageTasks: (project: Project) => void;
}

export const createProjectColumns = ({
  t,
  onEdit,
  onDelete,
  onManageTasks,
}: ProjectColumnsProps): ColumnDef<Project>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("projects.name")} />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "description",
    header: t("projects.description"),
    cell: ({ row }) => {
      const description = row.getValue("description") as string;
      return (
        <div className="max-w-[300px] truncate text-muted-foreground">
          {description || t("common.noDescription")}
        </div>
      );
    },
  },
  {
    accessorKey: "repo_url",
    header: t("projects.repoUrl"),
    cell: ({ row }) => {
      const repoUrl = row.getValue("repo_url") as string;
      return (
        <div className="max-w-[200px] truncate font-mono text-sm">
          {repoUrl}
        </div>
      );
    },
  },
  {
    id: "hasCredential",
    accessorFn: (row) => row.credential_id ? "true" : "false",
    header: t("projects.credential"),
    cell: ({ row }) => {
      const hasCredential = row.getValue("hasCredential") === "true";
      return (
        <Badge variant={hasCredential ? "default" : "secondary"}>
          {hasCredential ? t("common.yes") : t("common.no")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "task_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("projects.taskCount")} />
    ),
    cell: ({ row }) => {
      const count = row.getValue("task_count") as number;
      return (
        <Badge variant="secondary" className="font-mono">
          {count || 0}
        </Badge>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t("common.created")} />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString()}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const project = row.original;

      const actions = [
        {
          id: "manage-tasks",
          label: t("projects.tasksManagement"),
          icon: FolderOpen,
          onClick: () => onManageTasks(project),
        },
        {
          id: "edit",
          label: t("common.edit"),
          icon: Edit,
          onClick: () => onEdit(project),
        },
      ];

      const deleteAction = {
        title: project.name,
        confirmationValue: project.name,
        submitAction: async () => {
          await onDelete(project.id);
        },
      };

      return (
        <QuickActions 
          actions={actions} 
          deleteAction={deleteAction}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
