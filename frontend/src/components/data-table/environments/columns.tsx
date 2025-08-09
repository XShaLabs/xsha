import type { ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import { QuickActions } from "@/components/ui/quick-actions";
import { Badge } from "@/components/ui/badge";
import type { DevEnvironmentDisplay } from "@/types/dev-environment";

interface DevEnvironmentColumnsProps {
  onEdit: (environment: DevEnvironmentDisplay) => void;
  onDelete: (id: number) => void;
}

export const createDevEnvironmentColumns = ({
  onEdit,
  onDelete,
}: DevEnvironmentColumnsProps): ColumnDef<DevEnvironmentDisplay>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string;
      return (
        <div className="max-w-[300px] truncate text-muted-foreground">
          {description || "No description"}
        </div>
      );
    },
  },
  {
    accessorKey: "cpu_limit",
    header: "CPU",
    cell: ({ row }) => {
      const cores = row.getValue("cpu_limit") as number;
      const coreCount = cores || 0;
      return (
        <Badge variant="secondary">
          {coreCount} {coreCount === 1 ? "core" : "cores"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "memory_limit",
    header: "Memory",
    cell: ({ row }) => {
      const memoryMb = row.getValue("memory_limit") as number;
      const memory = memoryMb || 0;
      const formatMemory = (mb: number) => {
        if (mb >= 1024) {
          return `${(mb / 1024).toFixed(1)} GB`;
        }
        return `${mb} MB`;
      };
      return (
        <Badge variant="secondary">
          {formatMemory(memory)}
        </Badge>
      );
    },
  },
  {
    id: "env_vars_count",
    header: "Env Vars",
    cell: ({ row }) => {
      const envVarsMap = row.original.env_vars_map || {};
      const count = Object.keys(envVarsMap).length;
      return (
        <Badge variant="outline">
          {count}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString()}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const environment = row.original;

      const actions = [
        {
          id: "edit",
          label: "Edit",
          icon: Edit,
          onClick: () => onEdit(environment),
        },
      ];

      const deleteAction = {
        title: environment.name,
        confirmationValue: environment.name,
        submitAction: async () => {
          await onDelete(environment.id);
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
