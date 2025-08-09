import { SelectTrigger } from "@radix-ui/react-select";
import type { Table } from "@tanstack/react-table";
import { CheckCircle2, Trash2 } from "lucide-react";

import { useTranslation } from "react-i18next";

import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/ui/data-table/data-table-action-bar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Task, TaskStatus } from "@/types/task";

interface TaskDataTableActionBarProps {
  table: Table<Task>;
  onBatchUpdateStatus?: (taskIds: number[], status: TaskStatus) => void;
  onBatchDelete?: (taskIds: number[]) => void;
}

export function TaskDataTableActionBar({
  table,
  onBatchUpdateStatus,
  onBatchDelete,
}: TaskDataTableActionBarProps) {
  const { t } = useTranslation();
  const rows = table.getFilteredSelectedRowModel().rows;

  const handleStatusUpdate = (status: TaskStatus) => {
    const taskIds = rows.map(row => row.original.id);
    if (onBatchUpdateStatus && taskIds.length > 0) {
      onBatchUpdateStatus(taskIds, status);
      table.resetRowSelection();
    }
  };

  const handleDelete = () => {
    const taskIds = rows.map(row => row.original.id);
    if (onBatchDelete && taskIds.length > 0) {
      onBatchDelete(taskIds);
      table.resetRowSelection();
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
        <Select onValueChange={handleStatusUpdate}>
          <SelectTrigger asChild>
            <DataTableActionBarAction size="icon" tooltip={t("tasks.batch.updateStatus")}>
              <CheckCircle2 />
            </DataTableActionBarAction>
          </SelectTrigger>
          <SelectContent align="center">
            <SelectGroup>
              <SelectItem value="todo">{t("tasks.status.todo")}</SelectItem>
              <SelectItem value="in_progress">{t("tasks.status.in_progress")}</SelectItem>
              <SelectItem value="done">{t("tasks.status.done")}</SelectItem>
              <SelectItem value="cancelled">{t("tasks.status.cancelled")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <DataTableActionBarAction 
          size="icon" 
          tooltip={t("common.delete")}
          onClick={handleDelete}
        >
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
