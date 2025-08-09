import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { usePageActions } from "@/contexts/PageActionsContext";
import { Button } from "@/components/ui/button";


import {
  Section,
  SectionGroup,
  SectionHeader,
  SectionTitle,
  SectionDescription,
} from "@/components/content/section";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTablePaginationServer } from "@/components/ui/data-table/data-table-pagination-server";
import { createGitCredentialColumns } from "@/components/data-table/credentials/columns";
import { GitCredentialDataTableToolbar } from "@/components/data-table/credentials/data-table-toolbar";

import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import type {
  GitCredential,
  GitCredentialListParams,
} from "@/types/credentials";
import { Plus } from "lucide-react";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

const CredentialListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setItems } = useBreadcrumb();
  const { setActions } = usePageActions();

  const [credentials, setCredentials] = useState<GitCredential[]>([]);
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

  usePageTitle(t("common.pageTitle.gitCredentials"));

  // Set page actions (Create button in header) and clear breadcrumb
  useEffect(() => {
    const handleCreateNew = () => {
      navigate("/credentials/create");
    };

    setActions(
      <Button onClick={handleCreateNew} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t("gitCredentials.create")}
      </Button>
    );

    // Clear breadcrumb items (we're at root level)
    setItems([]);

    // Cleanup when component unmounts
    return () => {
      setActions(null);
      setItems([]);
    };
  }, [navigate, setActions, setItems, t]);

  const loadCredentialsData = useCallback(
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
        const apiParams: GitCredentialListParams = {
          page,
          page_size: pageSize,
        };

        // Handle column filters
        filters.forEach((filter) => {
          if (filter.id === "name" && filter.value) {
            apiParams.name = filter.value as string;
          }
        });

        const response = await apiService.gitCredentials.list(apiParams);
        setCredentials(response.credentials);
        setTotal(response.total);
        setTotalPages(response.total_pages);
        setCurrentPage(page);

        // Update URL parameters
        if (updateUrl) {
          const params = new URLSearchParams();

          // Add filter parameters
          filters.forEach((filter) => {
            if (filter.id === "name" && filter.value) {
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
        logError(error as Error, "Failed to load credentials");
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
    const pageParam = searchParams.get("page");

    const initialFilters: ColumnFiltersState = [];

    if (nameParam) {
      initialFilters.push({ id: "name", value: nameParam });
    }

    const initialPage = pageParam ? parseInt(pageParam, 10) : 1;

    // Set state first
    setColumnFilters(initialFilters);
    setCurrentPage(initialPage);

    // Load initial data using the unified function
    loadCredentialsData(initialPage, initialFilters, false).then(() => {
      setIsInitialized(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Handle column filter changes (skip initial load)
  useEffect(() => {
    if (isInitialized) {
      loadCredentialsData(1, columnFilters); // Reset to page 1 when filtering
    }
  }, [columnFilters, isInitialized, loadCredentialsData]);

  const handlePageChange = useCallback(
    (page: number) => {
      loadCredentialsData(page, columnFilters);
    },
    [columnFilters, loadCredentialsData]
  );

  const handleEdit = useCallback(
    (credential: GitCredential) => {
      navigate(`/credentials/${credential.id}/edit`);
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await apiService.gitCredentials.delete(id);
        await loadCredentialsData(currentPage, columnFilters);
      } catch (error) {
        // Re-throw error to let QuickActions handle the user notification
        throw error;
      }
    },
    [loadCredentialsData, currentPage, columnFilters]
  );





  const columns = useMemo(
    () =>
      createGitCredentialColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
      }),
    [handleEdit, handleDelete]
  );



  return (
    <>
      <SectionGroup>
        <Section>
          <SectionHeader>
            <SectionTitle>{t("gitCredentials.title")}</SectionTitle>
            <SectionDescription>
              {t(
                "gitCredentials.subtitle",
                "Manage your Git repository access credentials"
              )}
            </SectionDescription>
          </SectionHeader>


        </Section>

        <Section>
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={credentials}
              toolbarComponent={GitCredentialDataTableToolbar}
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
    </>
  );
};

export default CredentialListPage;
