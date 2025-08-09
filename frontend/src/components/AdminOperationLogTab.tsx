import React, { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import { formatDateToLocal } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Section,
  SectionHeader,
  SectionTitle,
  SectionDescription,
} from "@/components/content/section";

import { DataTable } from "@/components/ui/data-table";
import { useAdminOperationLogColumns } from "@/components/data-table/admin-logs/columns";
import { AdminOperationLogDataTableToolbar } from "@/components/data-table/admin-logs/data-table-toolbar";
import { CustomPagination } from "@/components/data-table/admin-logs/custom-pagination";

import type {
  AdminOperationLog,
} from "@/types/admin-logs";
import type { ColumnFiltersState } from "@tanstack/react-table";

export const AdminOperationLogTab: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<AdminOperationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminOperationLog | null>(
    null
  );
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  
  // DataTable state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Prevent duplicate requests
  const lastRequestRef = useRef<string>("");



  // Unified data loading function with debouncing and duplicate request prevention
  const loadOperationLogsData = useCallback(
    async (page: number, filters: ColumnFiltersState, shouldDebounce = true, updateUrl = true) => {
      const requestKey = `${page}-${JSON.stringify(filters)}`;
      
      // Prevent duplicate requests
      if (lastRequestRef.current === requestKey) {
        return;
      }

      if (shouldDebounce) {
        // Debounce to prevent rapid duplicate requests
        const debounceTimer = setTimeout(async () => {
          if (lastRequestRef.current === requestKey) {
            return; // Request was cancelled
          }
          
          lastRequestRef.current = requestKey;
          await executeRequest();
        }, 500); // Increased delay to prevent rapid duplicate requests

        // Store timer for potential cleanup
        return () => clearTimeout(debounceTimer);
      } else {
        lastRequestRef.current = requestKey;
        await executeRequest();
      }

      async function executeRequest() {
        try {
          setLoading(true);

          // Convert DataTable filters to API parameters
          const apiParams: any = {
            page,
            page_size: pageSize,
          };

          // Handle column filters
          filters.forEach((filter) => {
            if (filter.id === "username" && filter.value) {
              apiParams.username = filter.value;
            } else if (filter.id === "operation" && Array.isArray(filter.value) && filter.value.length > 0) {
              apiParams.operation = filter.value[0]; // API expects single operation
            } else if (filter.id === "success" && Array.isArray(filter.value) && filter.value.length > 0) {
              apiParams.success = filter.value[0] === "true";
            } else if (filter.id === "operation_time" && filter.value) {
              const { startDate, endDate } = filter.value as { startDate?: Date; endDate?: Date };
              if (startDate) {
                apiParams.start_time = formatDateToLocal(startDate);
              }
              if (endDate) {
                apiParams.end_time = formatDateToLocal(endDate);
              }
            }
          });

          const response = await apiService.adminLogs.getOperationLogs(apiParams);

          setLogs(response.logs);
          setTotal(response.total);
          setTotalPages(response.total_pages);
          setCurrentPage(page);

          // Update URL parameters
          if (updateUrl) {
            const params = new URLSearchParams();

            // Add filter parameters
            filters.forEach((filter) => {
              if (filter.value) {
                if (filter.id === "operation_time") {
                  // Handle date range filter
                  const { startDate, endDate } = filter.value as { startDate?: Date; endDate?: Date };
                  if (startDate) {
                    params.set("start_time", formatDateToLocal(startDate));
                  }
                  if (endDate) {
                    params.set("end_time", formatDateToLocal(endDate));
                  }
                } else if (Array.isArray(filter.value) && filter.value.length > 0) {
                  // Handle array filters (operation, success)
                  params.set(filter.id, filter.value[0]);
                } else if (typeof filter.value === "string" && filter.value.trim()) {
                  // Handle string filters (username)
                  params.set(filter.id, filter.value);
                }
              }
            });

            // Add page parameter (only if not page 1)
            if (page > 1) {
              params.set("page", String(page));
            }

            // Update URL without causing navigation
            setSearchParams(params, { replace: true });
          }
        } catch (err: any) {
          logError(err, "Failed to load operation logs");
          console.error("Failed to load operation logs:", err);
        } finally {
          setLoading(false);
          // Clear the request tracking after a short delay
          setTimeout(() => {
            if (lastRequestRef.current === requestKey) {
              lastRequestRef.current = "";
            }
          }, 500);
        }
      }
    },
    [pageSize, setSearchParams]
  );



  const handlePageChange = useCallback(
    (page: number) => {
      loadOperationLogsData(page, columnFilters);
    },
    [columnFilters, loadOperationLogsData]
  );

  const handleViewDetail = async (id: number) => {
    try {
      const response = await apiService.adminLogs.getOperationLog(id);
      setSelectedLog(response.log);
      setDetailDialogOpen(true);
    } catch (err: any) {
      logError(err, "Failed to load operation log detail");
      console.error("Failed to load operation log detail:", err);
      toast.error(t("adminLogs.operationLogs.messages.loadDetailFailed"));
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedLog(null);
  };

  // Create columns with the view detail handler
  const columns = useAdminOperationLogColumns({ onViewDetail: handleViewDetail });

  // Initialize component (only once)
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Ref for tracking previous column filters to avoid unnecessary resets
  const prevColumnFiltersRef = useRef<ColumnFiltersState>([]);

  // Initialize from URL on component mount (only once)
  useEffect(() => {
    // Get URL params directly to avoid dependency issues
    const usernameParam = searchParams.get("username");
    const operationParam = searchParams.get("operation");
    const successParam = searchParams.get("success");
    const startTimeParam = searchParams.get("start_time");
    const endTimeParam = searchParams.get("end_time");
    const pageParam = searchParams.get("page");

    const initialFilters: ColumnFiltersState = [];

    if (usernameParam) {
      initialFilters.push({ id: "username", value: usernameParam });
    }

    if (operationParam) {
      initialFilters.push({ id: "operation", value: [operationParam] });
    }

    if (successParam) {
      initialFilters.push({ id: "success", value: [successParam] });
    }

    if (startTimeParam || endTimeParam) {
      const dateFilter: { startDate?: Date; endDate?: Date } = {};
      if (startTimeParam) {
        dateFilter.startDate = new Date(startTimeParam);
      }
      if (endTimeParam) {
        dateFilter.endDate = new Date(endTimeParam);
      }
      initialFilters.push({ id: "operation_time", value: dateFilter });
    }

    const initialPage = pageParam ? parseInt(pageParam, 10) : 1;

    // Set state first
    setColumnFilters(initialFilters);
    setCurrentPage(initialPage);
    
    // Initialize the ref for filter comparison
    prevColumnFiltersRef.current = initialFilters;

    // Load initial data using the unified function
    loadOperationLogsData(initialPage, initialFilters, false, false).then(() => {
      setIsInitialized(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle column filter changes (skip initial load)
  useEffect(() => {
    if (isInitialized) {
      // Deep compare columnFilters to avoid unnecessary resets
      const filtersChanged = JSON.stringify(prevColumnFiltersRef.current) !== JSON.stringify(columnFilters);
      if (filtersChanged) {
        prevColumnFiltersRef.current = columnFilters;
        loadOperationLogsData(1, columnFilters); // Reset to page 1 when filtering
      }
    }
  }, [columnFilters, isInitialized, loadOperationLogsData]);

  return (
    <>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("adminLogs.operationLogs.overview.title")}</SectionTitle>
          <SectionDescription>
            {t("adminLogs.operationLogs.overview.description")}
          </SectionDescription>
        </SectionHeader>
      </Section>

      <Section>
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            toolbarComponent={AdminOperationLogDataTableToolbar}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
          />
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
          />
        </div>
      </Section>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t("adminLogs.operationLogs.detail.title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("adminLogs.operationLogs.detail.description")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t("adminLogs.operationLogs.columns.id")}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLog.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t("adminLogs.operationLogs.columns.operation")}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLog.operation}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t("adminLogs.operationLogs.columns.resource")}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLog.resource || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t("adminLogs.operationLogs.columns.username")}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedLog.username || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">
                    {t("adminLogs.operationLogs.columns.time")}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(selectedLog.operation_time).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("adminLogs.operationLogs.columns.description")}
                </label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                  {selectedLog.details || "N/A"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={handleCloseDetail}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
