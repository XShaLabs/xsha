import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { usePageActions } from "@/contexts/PageActionsContext";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import { toast } from "sonner";
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
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  
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

  const fetchEnvironments = async (page = currentPage, filters = columnFilters) => {
    setLoading(true);
    try {
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
    } catch (error) {
      logError(error as Error, "Failed to fetch environments");
      toast.error(
        error instanceof Error
          ? error.message
          : t("devEnvironments.fetch_failed")
      );
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteEnvironment = async (id: number) => {
    try {
      await apiService.devEnvironments.delete(id);
      await fetchEnvironments();
    } catch (error) {
      // Re-throw error to let QuickActions handle the user notification
      throw error;
    }
  };





  const handleEditEnvironment = (environment: DevEnvironmentDisplay) => {
    navigate(`/environments/${environment.id}/edit`);
  };

  const columns = createDevEnvironmentColumns({
    onEdit: handleEditEnvironment,
    onDelete: handleDeleteEnvironment,
  });

  useEffect(() => {
    fetchEnvironments().then(() => setIsInitialized(true));
  }, []);

  // Handle column filter changes (skip initial empty state)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      fetchEnvironments(1, columnFilters); // Reset to page 1 when filtering
    }
  }, [columnFilters, isInitialized]);

  const handlePageChange = (page: number) => {
    fetchEnvironments(page);
  };

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