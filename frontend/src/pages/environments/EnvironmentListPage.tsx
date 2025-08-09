import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { usePageActions } from "@/contexts/PageActionsContext";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";

import {
  Section,
  SectionDescription,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content/section";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTablePaginationServer } from "@/components/ui/data-table/data-table-pagination-server";
import { createDevEnvironmentColumns } from "@/components/data-table/environments/columns";
import { DevEnvironmentDataTableToolbar } from "@/components/data-table/environments/data-table-toolbar";
import type {
  DevEnvironment,
  DevEnvironmentDisplay,
  DevEnvironmentListParams,
} from "@/types/dev-environment";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

const EnvironmentListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setItems } = useBreadcrumb();
  const { setActions } = usePageActions();
  
  usePageTitle(t("navigation.environments"));

  // Set page actions (Create button in header) and clear breadcrumb
  useEffect(() => {
    const handleCreateNew = () => {
      navigate("/environments/create");
    };

    setActions(
      <Button onClick={handleCreateNew} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t("devEnvironments.create")}
      </Button>
    );

    // Clear breadcrumb items (we're at the root level)
    setItems([]);

    // Cleanup when component unmounts
    return () => {
      setActions(null);
      setItems([]);
    };
  }, [navigate, setActions, setItems, t]);

  const [environments, setEnvironments] = useState<DevEnvironmentDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  // Add request deduplication
  const lastRequestRef = useRef<string>("");
  const isRequestInProgress = useRef(false);
  
  const pageSize = 10;

  const transformEnvironments = (
    envs: DevEnvironment[]
  ): DevEnvironmentDisplay[] => {
    return envs.map((env) => {
      let envVarsMap: Record<string, string> = {};
      try {
        if (env.env_vars) {
          envVarsMap = JSON.parse(env.env_vars);
        }
      } catch (error) {
        console.warn(
          "Failed to parse env_vars for environment:",
          env.id,
          error
        );
      }

      return {
        ...env,
        env_vars_map: envVarsMap,
      };
    });
  };

  const loadEnvironmentsData = useCallback(
    async (page: number, filters: ColumnFiltersState, updateUrl = true) => {
      // Create a unique request key for deduplication
      const requestKey = JSON.stringify({ page, filters, updateUrl });

      // Skip if same request is already in progress or just completed
      if (
        isRequestInProgress.current ||
        lastRequestRef.current === requestKey
      ) {
        return;
      }

      isRequestInProgress.current = true;
      lastRequestRef.current = requestKey;

      try {
        setLoading(true);

        // Convert DataTable filters to API parameters
        const apiParams: DevEnvironmentListParams = {
          page,
          page_size: pageSize,
        };

        // Handle column filters
        filters.forEach((filter) => {
          if (filter.id === "name" && filter.value) {
            apiParams.name = filter.value as string;
          } else if (filter.id === "docker_image" && filter.value) {
            apiParams.docker_image = filter.value as string;
          }
        });

        const response = await apiService.devEnvironments.list(apiParams);
        const transformedEnvironments = transformEnvironments(
          response.environments
        );
        setEnvironments(transformedEnvironments);
        setTotalPages(response.total_pages);
        setTotal(response.total);
        setCurrentPage(page);

        // Update URL parameters
        if (updateUrl) {
          const params = new URLSearchParams();

          // Add filter parameters
          filters.forEach((filter) => {
            if (filter.value) {
              params.set(filter.id, String(filter.value));
            }
          });

          // Add page parameter (only if not page 1)
          if (page > 1) {
            params.set("page", String(page));
          }

          // Update URL without causing navigation
          setSearchParams(params, { replace: true });
        }
      } catch (error) {
        logError(error as Error, "Failed to fetch environments");
      } finally {
        setLoading(false);
        isRequestInProgress.current = false;

        // Clear the request key after a short delay to allow legitimate new requests
        setTimeout(() => {
          if (lastRequestRef.current === requestKey) {
            lastRequestRef.current = "";
          }
        }, 500); // Increase delay to prevent rapid duplicate requests
      }
    },
    [pageSize, setSearchParams]
  );



  const handleDeleteEnvironment = useCallback(
    async (id: number) => {
      try {
        await apiService.devEnvironments.delete(id);
        await loadEnvironmentsData(currentPage, columnFilters);
      } catch (error) {
        // Re-throw error to let QuickActions handle the user notification
        throw error;
      }
    },
    [loadEnvironmentsData, currentPage, columnFilters]
  );





  const handleEditEnvironment = useCallback(
    (environment: DevEnvironmentDisplay) => {
      navigate(`/environments/${environment.id}/edit`);
    },
    [navigate]
  );

  const columns = useMemo(
    () =>
      createDevEnvironmentColumns({
        onEdit: handleEditEnvironment,
        onDelete: handleDeleteEnvironment,
      }),
    [handleEditEnvironment, handleDeleteEnvironment]
  );

  // Initialize from URL on component mount (only once)
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Get URL params directly to avoid dependency issues
    const nameParam = searchParams.get("name");
    const dockerImageParam = searchParams.get("docker_image");
    const pageParam = searchParams.get("page");

    const initialFilters: ColumnFiltersState = [];

    if (nameParam) {
      initialFilters.push({ id: "name", value: nameParam });
    }

    if (dockerImageParam) {
      initialFilters.push({ id: "docker_image", value: dockerImageParam });
    }

    const initialPage = pageParam ? parseInt(pageParam, 10) : 1;

    // Set state first
    setColumnFilters(initialFilters);
    setCurrentPage(initialPage);

    // Load initial data using the unified function
    loadEnvironmentsData(initialPage, initialFilters, false).then(() => {
      setIsInitialized(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle column filter changes (skip initial load)
  useEffect(() => {
    if (isInitialized) {
      loadEnvironmentsData(1, columnFilters); // Reset to page 1 when filtering
    }
  }, [columnFilters, isInitialized, loadEnvironmentsData]);

  const handlePageChange = useCallback(
    (page: number) => {
      loadEnvironmentsData(page, columnFilters);
    },
    [columnFilters, loadEnvironmentsData]
  );

  return (
    <div className="min-h-screen bg-background">
      <SectionGroup>
          <Section>
            <SectionHeader>
              <SectionTitle>{t("navigation.environments")}</SectionTitle>
              <SectionDescription>
                {t("devEnvironments.page_description")}
              </SectionDescription>
            </SectionHeader>

          </Section>
        <Section>
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={environments}
              toolbarComponent={DevEnvironmentDataTableToolbar}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              sorting={sorting}
              setSorting={setSorting}
              loading={loading}
            />
            <DataTablePaginationServer
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              onPageChange={handlePageChange}
            />
          </div>
        </Section>
      </SectionGroup>
    </div>
  );
};

export default EnvironmentListPage;