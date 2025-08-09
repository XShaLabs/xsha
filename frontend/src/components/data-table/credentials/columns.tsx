import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Key, Shield, User } from "lucide-react";
import { QuickActions } from "@/components/ui/quick-actions";
import { Badge } from "@/components/ui/badge";
import type { GitCredential } from "@/types/credentials";
import { GitCredentialType } from "@/types/credentials";

interface GitCredentialColumnsProps {
  onEdit: (credential: GitCredential) => void;
  onDelete: (id: number) => void;
}

export const createGitCredentialColumns = ({
  onEdit,
  onDelete,
}: GitCredentialColumnsProps): ColumnDef<GitCredential>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as GitCredentialType;
      const getTypeIcon = () => {
        switch (type) {
          case GitCredentialType.PASSWORD:
            return <Key className="w-4 h-4" />;
          case GitCredentialType.TOKEN:
            return <Shield className="w-4 h-4" />;
          case GitCredentialType.SSH_KEY:
            return <User className="w-4 h-4" />;
          default:
            return <Key className="w-4 h-4" />;
        }
      };

      const getTypeName = () => {
        switch (type) {
          case GitCredentialType.PASSWORD:
            return "Password";
          case GitCredentialType.TOKEN:
            return "Token";
          case GitCredentialType.SSH_KEY:
            return "SSH Key";
          default:
            return "Unknown";
        }
      };

      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          {getTypeIcon()}
          {getTypeName()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => {
      const username = row.getValue("username") as string;
      return (
        <div className="text-sm text-muted-foreground">{username || "N/A"}</div>
      );
    },
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
      const credential = row.original;

      const actions = [
        {
          id: "edit",
          label: "Edit",
          icon: Edit,
          onClick: () => onEdit(credential),
        },
      ];

      const deleteAction = {
        title: credential.name,
        confirmationValue: credential.name,
        submitAction: async () => {
          await onDelete(credential.id);
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
