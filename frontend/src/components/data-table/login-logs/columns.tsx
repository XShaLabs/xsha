import type { ColumnDef } from "@tanstack/react-table";
import type { LoginLog } from "@/types/admin-logs";
import { CheckCircle, XCircle, User, Calendar, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export function useLoginLogColumns() {
  const { t } = useTranslation();

  const getReasonText = (reason: string) => {
    if (!reason) return "";
    
    const reasonMap = {
      'token_generation_failed': t("adminLogs.loginLogs.reasons.tokenGenerationFailed"),
      'invalid_username': t("adminLogs.loginLogs.reasons.invalidUsername"),
      'invalid_password': t("adminLogs.loginLogs.reasons.invalidPassword"),
    } as const;
    
    return reasonMap[reason as keyof typeof reasonMap] || reason;
  };

  const columns: ColumnDef<LoginLog>[] = [
    {
      accessorKey: "success",
      header: t("adminLogs.loginLogs.columns.status"),
      cell: ({ row }) => {
        const success = row.original.success;
        return (
          <div className="flex items-center space-x-2">
            {success ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${success ? "text-green-600" : "text-red-600"}`}>
              {success
                ? t("adminLogs.loginLogs.status.success")
                : t("adminLogs.loginLogs.status.failed")}
            </span>
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        return value.includes(row.original.success.toString());
      },
    },
    {
      accessorKey: "username",
      header: t("adminLogs.loginLogs.columns.username"),
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
      accessorKey: "ip",
      header: t("adminLogs.loginLogs.columns.ip"),
      cell: ({ row }) => {
        const ip = row.getValue("ip") as string;
        return (
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono">
              {ip}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "login_time",
      header: t("adminLogs.loginLogs.columns.time"),
      cell: ({ row }) => {
        const time = row.getValue("login_time") as string;
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
      accessorKey: "reason",
      header: t("adminLogs.loginLogs.columns.reason"),
      cell: ({ row }) => {
        const reason = row.getValue("reason") as string;
        const success = row.original.success;
        
        if (success || !reason) {
          return (
            <span className="text-sm text-muted-foreground">-</span>
          );
        }
        
        return (
          <div className="max-w-xs">
            <span className="text-sm text-red-600 break-words">
              {getReasonText(reason)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "user_agent",
      header: t("adminLogs.loginLogs.columns.userAgent"),
      cell: ({ row }) => {
        const userAgent = row.getValue("user_agent") as string;
        if (!userAgent) {
          return (
            <span className="text-sm text-muted-foreground">-</span>
          );
        }
        
        return (
          <div className="max-w-xs">
            <span className="text-xs text-muted-foreground break-words line-clamp-2">
              {userAgent}
            </span>
          </div>
        );
      },
    },
  ];

  return columns;
}
