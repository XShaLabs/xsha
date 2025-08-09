import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePageActions } from "@/contexts/PageActionsContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

import { DataTable } from "@/components/ui/data-table/data-table";
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

import { createProjectColumns } from "@/components/data-table/projects/columns";
import { ProjectDataTableToolbar } from "@/components/data-table/projects/data-table-toolbar";
import { DataTablePaginationServer } from "@/components/ui/data-table/data-table-pagination-server";
import type {
  Project,
  ProjectListParams,
  GitProtocolType,
} from "@/types/project";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

const ProjectListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { setActions } = usePageActions();
  const { setItems } = useBreadcrumb();

  // Add request deduplication
  const lastRequestRef = useRef<string>("");
  const isRequestInProgress = useRef(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  usePageTitle(t("common.pageTitle.projects"));

  const loadProjectsData = useCallback(
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
        const apiParams: ProjectListParams = {
          page,
          page_size: pageSize,
        };

        // Handle column filters
        filters.forEach((filter) => {
          if (filter.id === "name" && filter.value) {
            apiParams.name = filter.value as string;
          } else if (filter.id === "protocol" && filter.value) {
            apiParams.protocol = filter.value as GitProtocolType;
          }
        });
        const response = await apiService.projects.list(apiParams);
        setProjects(response.projects);
        setTotal(response.total);
        setTotalPages(response.total_pages);
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
        logError(error as Error, "Failed to load projects");
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

  // Initialize from URL on component mount (only once)
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Get URL params directly to avoid dependency issues
    const nameParam = searchParams.get("name");
    const protocolParam = searchParams.get("protocol");
    const pageParam = searchParams.get("page");

    const initialFilters: ColumnFiltersState = [];

    if (nameParam) {
      initialFilters.push({ id: "name", value: nameParam });
    }

    if (protocolParam) {
      initialFilters.push({
        id: "protocol",
        value: protocolParam as GitProtocolType,
      });
    }

    const initialPage = pageParam ? parseInt(pageParam, 10) : 1;

    // Set state first
    setColumnFilters(initialFilters);
    setCurrentPage(initialPage);

    // Load initial data using the unified function
    loadProjectsData(initialPage, initialFilters, false).then(() => {
      setIsInitialized(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle column filter changes (skip initial load)
  useEffect(() => {
    if (isInitialized) {
      loadProjectsData(1, columnFilters); // Reset to page 1 when filtering
    }
  }, [columnFilters, isInitialized, loadProjectsData]);

  const handlePageChange = useCallback(
    (page: number) => {
      loadProjectsData(page, columnFilters);
    },
    [columnFilters, loadProjectsData]
  );

  // Set page actions (Create button in header) and clear breadcrumb
  useEffect(() => {
    const handleCreateNew = () => {
      navigate("/projects/create");
    };

    setActions(
      <Button onClick={handleCreateNew} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t("projects.create")}
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

  const handleEdit = useCallback(
    (project: Project) => {
      navigate(`/projects/${project.id}/edit`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await apiService.projects.delete(id);
        await loadProjectsData(currentPage, columnFilters);
      } catch (error) {
        // Re-throw error to let QuickActions handle the user notification
        throw error;
      }
    },
    [loadProjectsData, currentPage, columnFilters]
  );

  const handleManageTasks = useCallback(
    (project: Project) => {
      navigate(`/projects/${project.id}/tasks`);
    },
    [navigate]
  );

  const columns = useMemo(
    () =>
      createProjectColumns({
        t,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onManageTasks: handleManageTasks,
      }),
    [t, handleEdit, handleDelete, handleManageTasks]
  );

  return (
    <div className="min-h-screen bg-background">
      <SectionGroup>
        <Section>
          <SectionHeader>
            <SectionTitle>{t("navigation.projects")}</SectionTitle>
            <SectionDescription>
              {t("projects.page_description")}
            </SectionDescription>
          </SectionHeader>
        </Section>
        <Section>
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={projects}
              toolbarComponent={ProjectDataTableToolbar}
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

export default ProjectListPage;
