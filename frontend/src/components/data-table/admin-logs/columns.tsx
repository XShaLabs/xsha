import type { ColumnDef } from "@tanstack/react-table";
import type { AdminOperationLog } from "@/types/admin-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, User, Activity, Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdminOperationLogColumnsProps {
  onViewDetail: (id: number) => void;
}

export function useAdminOperationLogColumns({ onViewDetail }: AdminOperationLogColumnsProps) {
  const { t } = useTranslation();

  const getOperationText = (operation: string) => {
    const operationMap = {
      'create': t("adminLogs.operationLogs.operations.create"),
      'read': t("adminLogs.operationLogs.operations.read"),
      'update': t("adminLogs.operationLogs.operations.update"),
      'delete': t("adminLogs.operationLogs.operations.delete"),
      'login': t("adminLogs.operationLogs.operations.login"),
      'logout': t("adminLogs.operationLogs.operations.logout"),
    } as const;
    
    return operationMap[operation as keyof typeof operationMap] || operation;
  };

  const getOperationVariant = (operation: string) => {
    switch (operation) {
      case "create":
        return "default";
      case "read":
        return "secondary";
      case "update":
        return "outline";
      case "delete":
        return "destructive";
      case "login":
        return "secondary";
      case "logout":
        return "outline";
      default:
        return "secondary";
    }
  };

  const columns: ColumnDef<AdminOperationLog>[] = [
    {
      accessorKey: "operation",
      header: t("adminLogs.operationLogs.columns.operation"),
      cell: ({ row }) => {
        const operation = row.getValue("operation") as string;
        return (
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <Badge variant={getOperationVariant(operation)}>
              {getOperationText(operation)}
            </Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "username",
      header: t("adminLogs.operationLogs.columns.username"),
      cell: ({ row }) => {
        const username = row.getValue("username") as string;
        return (
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{username}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "resource",
      header: t("adminLogs.operationLogs.columns.resource"),
      cell: ({ row }) => {
        const resource = row.getValue("resource") as string;
        return (
          <span className="text-sm text-muted-foreground">
            {resource || "N/A"}
          </span>
        );
      },
    },
    {
      accessorKey: "success",
      header: t("adminLogs.operationLogs.filters.success"),
      cell: ({ row }) => {
        const success = row.getValue("success") as boolean;
        return (
          <div className="flex items-center space-x-2">
            {success ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${success ? "text-green-600" : "text-red-600"}`}>
              {success
                ? t("adminLogs.operationLogs.status.success")
                : t("adminLogs.operationLogs.status.failed")}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes((row.getValue(id) as string).toString());
      },
    },
    {
      accessorKey: "operation_time",
      header: t("adminLogs.operationLogs.columns.time"),
      cell: ({ row }) => {
        const time = row.getValue("operation_time") as string;
        return (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {new Date(time).toLocaleString()}
            </span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        if (!value || (!value.startDate && !value.endDate)) return true;
        
        const rowDate = new Date(row.getValue(id) as string);
        const startDate = value.startDate ? new Date(value.startDate) : null;
        const endDate = value.endDate ? new Date(value.endDate) : null;
        
        if (startDate && endDate) {
          return rowDate >= startDate && rowDate <= endDate;
        } else if (startDate) {
          return rowDate >= startDate;
        } else if (endDate) {
          return rowDate <= endDate;
        }
        
        return true;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const log = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(log.id)}
          >
            <Eye className="w-4 h-4 mr-1" />
            {t("adminLogs.common.detail")}
          </Button>
        );
      },
    },
  ];

  return columns;
}
