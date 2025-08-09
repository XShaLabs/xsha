import type { Table } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GitCredential } from "@/types/credentials";

export interface GitCredentialDataTableToolbarProps {
  table: Table<GitCredential>;
}

export function GitCredentialDataTableToolbar({
  table,
}: GitCredentialDataTableToolbarProps) {
  const { t } = useTranslation();
  const isFiltered = table.getState().columnFilters.length > 0;

  // Local state for the input value
  const [searchValue, setSearchValue] = useState("");
  const isUserInput = useRef(false);

  // Sync searchValue with table filter value
  useEffect(() => {
    const currentFilter = table.getColumn("name")?.getFilterValue() as
      | string
      | undefined;

    // Only update if it's not from user input to avoid conflicts
    if (!isUserInput.current) {
      setSearchValue(currentFilter || "");
    }

    // Reset the flag after processing
    isUserInput.current = false;
  }, [table.getState().columnFilters]);

  // Debounce the filter value update when user types
  useEffect(() => {
    if (!isUserInput.current) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      if (isUserInput.current) {
        // Double check before setting filter
        table.getColumn("name")?.setFilterValue(searchValue || undefined);
        isUserInput.current = false;
      }
    }, 500); // 500ms delay

    return () => {
      clearTimeout(debounceTimer);
      // Don't reset isUserInput here as it might interfere with the timer
    };
  }, [searchValue, table]);

  const handleSearchChange = (value: string) => {
    isUserInput.current = true;
    setSearchValue(value);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2 flex-wrap">
        <Input
          placeholder={t("gitCredentials.filter.placeholder", "Filter name...")}
          value={searchValue}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              // searchValue will be synced automatically via useEffect
            }}
            className="h-8 px-2 lg:px-3"
          >
            {t("common.reset", "Reset")}
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}
