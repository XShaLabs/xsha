import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PushBranchDialog } from "@/components/PushBranchDialog";

import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import type { Task, TaskStatus } from "@/types/task";
import type { Project } from "@/types/project";
import type { DevEnvironment } from "@/types/dev-environment";
import { toast } from "sonner";
import { usePageActions } from "@/contexts/PageActionsContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { DataTable } from "@/components/ui/data-table/data-table";
import { createTaskColumns } from "@/components/data-table/tasks/columns";
import { TaskDataTableToolbar } from "@/components/data-table/tasks/data-table-toolbar";
import { TaskDataTableActionBar } from "@/components/data-table/tasks/data-table-action-bar";
import { DataTablePaginationServer } from "@/components/ui/data-table/data-table-pagination-server";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import {
  Section,
  SectionDescription,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content";
import {
  MetricCardGroup,
  MetricCardHeader,
  MetricCardTitle,
  MetricCardValue,
  MetricCardButton,
} from "@/components/metric";

import { Plus, CheckCircle, ListFilter } from "lucide-react";

const TaskListPage: React.FC = () => {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { setActions } = usePageActions();
  const { setItems } = useBreadcrumb();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // New DataTable state management
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [devEnvironments, setDevEnvironments] = useState<DevEnvironment[]>([]);

  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [selectedTaskForPush, setSelectedTaskForPush] = useState<Task | null>(null);

  usePageTitle(
    currentProject
      ? `${currentProject.name} - ${t("tasks.title")}`
      : t("tasks.title")
  );

  const pageSize = 20;

  // Metrics for task status
  const metrics = React.useMemo(() => [
    {
      title: t("tasks.status.todo"),
      value: tasks.filter((task) => task.status === "todo").length,
      variant: "default" as const,
      type: "filter" as const,
      status: "todo" as TaskStatus,
    },
    {
      title: t("tasks.status.in_progress"),
      value: tasks.filter((task) => task.status === "in_progress").length,
      variant: "warning" as const,
      type: "filter" as const,
      status: "in_progress" as TaskStatus,
    },
    {
      title: t("tasks.status.done"),
      value: tasks.filter((task) => task.status === "done").length,
      variant: "success" as const,
      type: "filter" as const,
      status: "done" as TaskStatus,
    },
    {
      title: t("tasks.status.cancelled"),
      value: tasks.filter((task) => task.status === "cancelled").length,
      variant: "destructive" as const,
      type: "filter" as const,
      status: "cancelled" as TaskStatus,
    },
    {
      title: t("tasks.metrics.total"),
      value: total,
      variant: "ghost" as const,
      type: "info" as const,
    },
  ], [tasks, total, t]);

  const icons = {
    filter: {
      active: CheckCircle,
      inactive: ListFilter,
    },
    info: {
      active: ListFilter,
      inactive: ListFilter,
    },
  };



  const loadDevEnvironments = async () => {
    try {
      const response = await apiService.devEnvironments.list();
      setDevEnvironments(response.environments);
    } catch (error) {
      logError(error as Error, "Failed to load dev environments");
    }
  };

  const loadTasksData = async (page = currentPage, filters = columnFilters) => {
    try {
      
      // Convert DataTable filters to API parameters
      const apiParams: any = {
        page,
        page_size: pageSize,
        project_id: projectId ? parseInt(projectId, 10) : undefined,
      };

      // Handle column filters
      filters.forEach((filter) => {
        if (filter.id === "title" && filter.value) {
          apiParams.title = filter.value as string;
        } else if (filter.id === "status" && filter.value) {
          const statusArray = filter.value as string[];
          if (statusArray.length > 0) {
            apiParams.status = statusArray[0]; // API expects single status
          }
        } else if (filter.id === "start_branch" && filter.value) {
          apiParams.branch = filter.value as string;
        } else if (filter.id === "dev_environment.name" && filter.value) {
          const envIdArray = filter.value as string[];
          if (envIdArray.length > 0) {
            apiParams.dev_environment_id = parseInt(envIdArray[0]);
          }
        }
      });

      const response = await apiService.tasks.list(apiParams);
      setTasks(response.data.tasks);
      setTotalPages(Math.ceil(response.data.total / pageSize));
      setTotal(response.data.total);
      setCurrentPage(page);
    } catch (error) {
      logError(error as Error, "Failed to load tasks");
    }
  };

  useEffect(() => {
    loadDevEnvironments();
    loadTasksData().then(() => setIsInitialized(true));
    
    if (projectId) {
      apiService.projects
        .get(parseInt(projectId, 10))
        .then((response) => {
          setCurrentProject(response.project);
        })
        .catch((error) => {
          logError(error as Error, "Failed to load project");
          navigate("/projects");
        });
    }
  }, [projectId]);

  // Handle column filter changes (skip initial empty state)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      loadTasksData(1, columnFilters); // Reset to page 1 when filtering
    }
  }, [columnFilters, isInitialized]);

  // Set page actions (Create button in header) and breadcrumb
  useEffect(() => {
    const handleCreateNew = () => {
      navigate(`/projects/${projectId}/tasks/create`);
    };

    setActions(
      <Button onClick={handleCreateNew} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t("tasks.create")}
      </Button>
    );

    // Set breadcrumb items
    if (currentProject) {
      setItems([
        { type: "link", label: t("navigation.projects"), href: "/projects" },
        { type: "page", label: currentProject.name }
      ]);
    }

    // Cleanup when component unmounts
    return () => {
      setActions(null);
      setItems([]);
    };
  }, [navigate, setActions, setItems, t, projectId, currentProject]);

  const handleTaskEdit = (task: Task) => {
    navigate(`/projects/${projectId}/tasks/${task.id}/edit`);
  };

  const handleTaskDelete = async (id: number) => {
    try {
      await apiService.tasks.delete(id);
      await loadTasksData();
    } catch (error) {
      // Re-throw error to let QuickActions handle the user notification
      throw error;
    }
  };



  const handleViewConversation = (task: Task) => {
    navigate(`/projects/${projectId}/tasks/${task.id}/conversation`);
  };

  const handleViewGitDiff = (task: Task) => {
    navigate(`/projects/${projectId}/tasks/${task.id}/git-diff`);
  };

  const handlePageChange = (page: number) => {
    loadTasksData(page);
  };

  // Handle metric card clicks for filtering
  const handleMetricClick = (metric: typeof metrics[0]) => {
    if (metric.type !== "filter") return;

    const existingFilter = columnFilters.find(
      (filter) => filter.id === "status"
    );
    
    const isFilterActive = 
      Array.isArray(existingFilter?.value) && 
      existingFilter?.value.includes(metric.status);

    if (isFilterActive) {
      // Remove filter
      setColumnFilters(prev => 
        prev.filter(filter => filter.id !== "status")
      );
    } else {
      // Add filter
      setColumnFilters(prev => {
        const others = prev.filter(filter => filter.id !== "status");
        return [...others, { id: "status", value: [metric.status!] }];
      });
    }
  };

  const handleBatchUpdateStatus = async (
    taskIds: number[],
    status: TaskStatus
  ) => {
    try {
      const response = await apiService.tasks.batchUpdateStatus({
        task_ids: taskIds,
        status,
      });

      const { success_count, failed_count } = response.data;
      if (failed_count === 0) {
        toast.success(
          t("tasks.messages.batchUpdateSuccess", {
            success: success_count,
            failed: failed_count,
          })
        );
      } else {
        toast.warning(
          t("tasks.messages.batchUpdateSuccess", {
            success: success_count,
            failed: failed_count,
          })
        );
      }

      await loadTasksData();
    } catch (error) {
      logError(error as Error, "Failed to batch update task status");
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks.messages.batchUpdateFailed")
      );
    }
  };

  const handleBatchDelete = async (taskIds: number[]) => {
    try {
      // Assuming there's a batch delete API
      for (const id of taskIds) {
        await apiService.tasks.delete(id);
      }
      toast.success(t("tasks.messages.deleteSuccess"));
      await loadTasksData();
    } catch (error) {
      logError(error as Error, "Failed to batch delete tasks");
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks.messages.deleteFailed")
      );
    }
  };

  const handlePushBranch = async (task: Task) => {
    if (!task.work_branch) {
      toast.error(t("tasks.messages.push_failed"), {
        description: "Task has no work branch",
      });
      return;
    }

    setSelectedTaskForPush(task);
    setPushDialogOpen(true);
  };

  const handlePushSuccess = async () => {
    await loadTasksData();
  };

  return (
    <div className="min-h-screen bg-background">
      <SectionGroup>
        <Section>
          <SectionHeader>
            <SectionTitle>
              {currentProject ? `${currentProject.name} - ${t("tasks.title")}` : t("tasks.title")}
            </SectionTitle>
            <SectionDescription>
              {t("tasks.page_description")}
            </SectionDescription>
          </SectionHeader>
          <MetricCardGroup>
            {metrics.map((metric) => {
              const existingFilter = columnFilters.find(
                (filter) => filter.id === "status"
              );
              const isFilterActive = 
                metric.type === "filter" &&
                Array.isArray(existingFilter?.value) && 
                existingFilter?.value.includes(metric.status);

              const isActive = metric.type === "filter" ? isFilterActive : false;
              const Icon = icons[metric.type][isActive ? "active" : "inactive"];

              return (
                <MetricCardButton
                  key={metric.title}
                  variant={metric.variant}
                  onClick={() => handleMetricClick(metric)}
                  disabled={metric.type === "info"}
                  className={metric.type === "info" ? "cursor-default" : ""}
                >
                  <MetricCardHeader className="flex justify-between items-center gap-2 w-full">
                    <MetricCardTitle className="truncate">
                      {metric.title}
                    </MetricCardTitle>
                    {metric.type === "filter" && <Icon className="size-4" />}
                  </MetricCardHeader>
                  <MetricCardValue>{metric.value}</MetricCardValue>
                </MetricCardButton>
              );
            })}
          </MetricCardGroup>
        </Section>
        <Section>
          <div className="space-y-4">
            <DataTable
              columns={createTaskColumns({
                t,
                onEdit: handleTaskEdit,
                onDelete: handleTaskDelete,
                onViewConversation: handleViewConversation,
                onViewGitDiff: handleViewGitDiff,
                onPushBranch: handlePushBranch,
                hideProjectColumn: true,
              })}
              data={tasks}
              toolbarComponent={(props) => (
                <TaskDataTableToolbar 
                  {...props} 
                  devEnvironments={devEnvironments}
                />
              )}
              actionBar={(props) => (
                <TaskDataTableActionBar
                  {...props}
                  onBatchUpdateStatus={handleBatchUpdateStatus}
                  onBatchDelete={handleBatchDelete}
                />
              )}
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

      <PushBranchDialog
        open={pushDialogOpen}
        onOpenChange={setPushDialogOpen}
        task={selectedTaskForPush}
        onSuccess={handlePushSuccess}
      />

    </div>
  );
};

export default TaskListPage;
