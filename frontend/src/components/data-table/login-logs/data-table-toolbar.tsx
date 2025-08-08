import type { Table } from "@tanstack/react-table";
import type { LoginLog } from "@/types/admin-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { DatePicker } from "@/components/ui/date-picker";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

interface DataTableToolbarProps {
  table: Table<LoginLog>;
}

export function LoginLogDataTableToolbar({
  table,
}: DataTableToolbarProps) {
  const { t } = useTranslation();
  const isFiltered = table.getState().columnFilters.length > 0;
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const statusOptions = [
    { label: t("adminLogs.loginLogs.status.success"), value: "true" },
    { label: t("adminLogs.loginLogs.status.failed"), value: "false" },
  ];

  // Apply date filter when dates change
  useEffect(() => {
    const column = table.getColumn("login_time");
    if (column && (startDate || endDate)) {
      column.setFilterValue({ startDate, endDate });
    } else if (column) {
      column.setFilterValue(undefined);
    }
  }, [startDate, endDate, table]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-1 items-center space-x-2 flex-wrap gap-2">
        <Input
          placeholder={t("adminLogs.loginLogs.filters.username")}
          value={
            (table.getColumn("username")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("username")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[200px]"
        />
        <Input
          placeholder={t("adminLogs.loginLogs.filters.ip")}
          value={
            (table.getColumn("ip")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("ip")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[120px] lg:w-[150px]"
        />
        {table.getColumn("success") && (
          <DataTableFacetedFilter
            column={table.getColumn("success")}
            title={t("adminLogs.loginLogs.filters.status")}
            options={statusOptions}
          />
        )}
        <DatePicker
          id="start_date"
          placeholder={t("adminLogs.loginLogs.filters.startDate")}
          value={startDate}
          onChange={setStartDate}
        />
        <DatePicker
          id="end_date"
          placeholder={t("adminLogs.loginLogs.filters.endDate")}
          value={endDate}
          onChange={setEndDate}
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              setStartDate(undefined);
              setEndDate(undefined);
            }}
            className="h-8 px-2 lg:px-3"
          >
            {t("adminLogs.common.reset")}
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
