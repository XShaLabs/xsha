import type { Table } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";


import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/ui/data-table";
import { Separator } from "@/components/ui/separator";
import type { DevEnvironmentDisplay } from "@/types/dev-environment";

interface DevEnvironmentDataTableActionBarProps {
  table: Table<DevEnvironmentDisplay>;
  onDelete?: (ids: number[]) => void;
}

export function DevEnvironmentDataTableActionBar({
  table,
  onDelete,
}: DevEnvironmentDataTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;

  const handleDelete = () => {
    if (onDelete) {
      const ids = rows.map((row) => row.original.id);
      onDelete(ids);
    }
  };

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <DataTableActionBarAction size="icon" tooltip="Delete environments" onClick={handleDelete}>
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
