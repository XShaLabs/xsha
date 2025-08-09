import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import type { Task } from "@/types/task";
import type { DevEnvironment } from "@/types/dev-environment";

export interface TaskDataTableToolbarProps {
  table: Table<Task>;
  devEnvironments?: DevEnvironment[];
}

export function TaskDataTableToolbar({
  table,
  devEnvironments = [],
}: TaskDataTableToolbarProps) {
  const { t } = useTranslation();
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2 flex-wrap">
        <Input
          placeholder={t("tasks.filters.titlePlaceholder")}
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />

        {table.getColumn("status") && (
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title={t("tasks.filters.status")}
            options={[
              { label: t("tasks.status.todo"), value: "todo" },
              { label: t("tasks.status.in_progress"), value: "in_progress" },
              { label: t("tasks.status.done"), value: "done" },
              { label: t("tasks.status.cancelled"), value: "cancelled" },
            ]}
          />
        )}

        {table.getColumn("start_branch") && (
          <Input
            placeholder={t("tasks.filters.branchPlaceholder")}
            value={(table.getColumn("start_branch")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("start_branch")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[200px]"
          />
        )}

        {table.getColumn("dev_environment.name") && devEnvironments.length > 0 && (
          <DataTableFacetedFilter
            column={table.getColumn("dev_environment.name")}
            title={t("tasks.filters.devEnvironment")}
            options={devEnvironments.map((env) => ({
              label: `${env.name} (${env.type})`,
              value: env.id.toString(),
            }))}
          />
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            {t("common.reset")}
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
