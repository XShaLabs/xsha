import type { Table } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/ui/data-table/data-table-action-bar";
import { Separator } from "@/components/ui/separator";
import type { GitCredential } from "@/types/credentials";

interface GitCredentialDataTableActionBarProps {
  table: Table<GitCredential>;
  onBatchDelete: (ids: number[]) => void;
}

export function GitCredentialDataTableActionBar({
  table,
  onBatchDelete,
}: GitCredentialDataTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;

  const handleBatchDelete = () => {
    const selectedIds = rows.map((row) => row.original.id);
    onBatchDelete(selectedIds);
  };

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <DataTableActionBarAction
          size="icon"
          tooltip="Delete credentials"
          onClick={handleBatchDelete}
        >
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
