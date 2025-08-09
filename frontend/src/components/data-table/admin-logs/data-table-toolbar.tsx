import type { Table } from "@tanstack/react-table";
import type { AdminOperationLog } from "@/types/admin-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter";
import { DatePicker } from "@/components/ui/date-picker";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";

interface DataTableToolbarProps {
  table: Table<AdminOperationLog>;
}

export function AdminOperationLogDataTableToolbar({
  table,
}: DataTableToolbarProps) {
  const { t } = useTranslation();
  const isFiltered = table.getState().columnFilters.length > 0;
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Local state for the username search input with debouncing
  const [usernameSearchValue, setUsernameSearchValue] = useState("");
  const isUserInput = useRef(false);

  const operationOptions = [
    { label: t("adminLogs.operationLogs.operations.create"), value: "create" },
    { label: t("adminLogs.operationLogs.operations.read"), value: "read" },
    { label: t("adminLogs.operationLogs.operations.update"), value: "update" },
    { label: t("adminLogs.operationLogs.operations.delete"), value: "delete" },
    { label: t("adminLogs.operationLogs.operations.login"), value: "login" },
    { label: t("adminLogs.operationLogs.operations.logout"), value: "logout" },
  ];

  const statusOptions = [
    { label: t("adminLogs.operationLogs.status.success"), value: "true" },
    { label: t("adminLogs.operationLogs.status.failed"), value: "false" },
  ];

  // Sync usernameSearchValue with table filter value
  useEffect(() => {
    const currentFilter = table.getColumn("username")?.getFilterValue() as
      | string
      | undefined;

    // Only update if it's not from user input to avoid conflicts
    if (!isUserInput.current) {
      setUsernameSearchValue(currentFilter || "");
    }

    // Reset the flag after processing
    isUserInput.current = false;
  }, [table.getState().columnFilters]);

  // Debounce the username filter value update when user types
  useEffect(() => {
    if (!isUserInput.current) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      if (isUserInput.current) {
        // Double check before setting filter
        table.getColumn("username")?.setFilterValue(usernameSearchValue || undefined);
        isUserInput.current = false;
      }
    }, 500); // 500ms delay

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [usernameSearchValue, table]);

  // Sync date picker values with table filter (for initialization from URL)
  useEffect(() => {
    const column = table.getColumn("operation_time");
    const filterValue = column?.getFilterValue() as { startDate?: Date; endDate?: Date } | undefined;
    
    if (filterValue) {
      setStartDate(filterValue.startDate);
      setEndDate(filterValue.endDate);
    } else {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [table.getState().columnFilters]);

  // Apply date filter when dates change
  useEffect(() => {
    const column = table.getColumn("operation_time");
    if (column && (startDate || endDate)) {
      column.setFilterValue({ startDate, endDate });
    } else if (column) {
      column.setFilterValue(undefined);
    }
  }, [startDate, endDate, table]);

  const handleUsernameSearchChange = (value: string) => {
    isUserInput.current = true;
    setUsernameSearchValue(value);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-1 items-center space-x-2 flex-wrap gap-2">
        <Input
          placeholder={t("adminLogs.operationLogs.filters.username")}
          value={usernameSearchValue}
          onChange={(event) => handleUsernameSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[200px]"
        />
        {table.getColumn("operation") && (
          <DataTableFacetedFilter
            column={table.getColumn("operation")}
            title={t("adminLogs.operationLogs.filters.operation")}
            options={operationOptions}
          />
        )}
        {table.getColumn("success") && (
          <DataTableFacetedFilter
            column={table.getColumn("success")}
            title={t("adminLogs.operationLogs.filters.success")}
            options={statusOptions}
          />
        )}
        <DatePicker
          id="start_date"
          placeholder={t("adminLogs.operationLogs.filters.startDate")}
          value={startDate}
          onChange={setStartDate}
        />
        <DatePicker
          id="end_date"
          placeholder={t("adminLogs.operationLogs.filters.endDate")}
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
              // usernameSearchValue will be synced automatically via useEffect
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
