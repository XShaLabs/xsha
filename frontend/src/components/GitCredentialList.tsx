import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTablePaginationSimple } from "@/components/ui/data-table/data-table-pagination";
import { createGitCredentialColumns } from "@/components/data-table/credentials/columns";
import { GitCredentialDataTableToolbar } from "@/components/data-table/credentials/data-table-toolbar";
import { GitCredentialDataTableActionBar } from "@/components/data-table/credentials/data-table-action-bar";
import type { GitCredential } from "@/types/credentials";
import { Key } from "lucide-react";

interface GitCredentialListProps {
  credentials: GitCredential[];
  loading: boolean;
  onEdit: (credential: GitCredential) => void;
  onDelete: (id: number) => void;
  onBatchDelete?: (ids: number[]) => void;
}

export const GitCredentialList: React.FC<GitCredentialListProps> = ({
  credentials,
  loading,
  onEdit,
  onDelete,
  onBatchDelete,
}) => {
  const { t } = useTranslation();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = createGitCredentialColumns({
    onEdit,
    onDelete,
  });

  const ActionBar = ({ table }: { table: any }) => {
    if (!onBatchDelete) return null;
    return (
      <GitCredentialDataTableActionBar
        table={table}
        onBatchDelete={onBatchDelete}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t("common.loading")}</div>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("gitCredentials.messages.noCredentials")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t("gitCredentials.messages.noCredentialsDesc")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={credentials}
      actionBar={onBatchDelete ? ActionBar : undefined}
      toolbarComponent={GitCredentialDataTableToolbar}
      paginationComponent={DataTablePaginationSimple}
      columnFilters={columnFilters}
      setColumnFilters={setColumnFilters}
      sorting={sorting}
      setSorting={setSorting}
    />
  );
};

export default GitCredentialList;
