import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "react-i18next";
import {
  Edit,
  Trash2,
  Play,
  CheckCircle,
  Clock,
  GitBranch,
  GitPullRequest,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Filter,
  X,
  MessageSquare,
  MoreHorizontal,
  GitCompare,
} from "lucide-react";
import type { Task, TaskStatus } from "@/types/task";
import type { Project } from "@/types/project";
import type { DevEnvironment } from "@/types/dev-environment";

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  devEnvironments: DevEnvironment[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  total: number;
  statusFilter?: TaskStatus;
  projectFilter?: number;
  titleFilter?: string;
  branchFilter?: string;
  devEnvironmentFilter?: number;
  hideProjectFilter?: boolean;
  hidePagination?: boolean;
  onPageChange: (page: number) => void;
  onStatusFilterChange: (status: TaskStatus | undefined) => void;
  onProjectFilterChange: (projectId: number | undefined) => void;
  onTitleFilterChange: (title: string | undefined) => void;
  onBranchFilterChange: (branch: string | undefined) => void;
  onDevEnvironmentFilterChange: (envId: number | undefined) => void;
  onFiltersApply?: (filters: {
    status?: TaskStatus;
    project?: number;
    title?: string;
    branch?: string;
    devEnvironment?: number;
  }) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onViewConversation?: (task: Task) => void;
  onViewGitDiff?: (task: Task) => void;
  onPushBranch?: (task: Task) => void;
  onCreateNew: () => void;
  onBatchUpdateStatus?: (taskIds: number[], status: TaskStatus) => void;
}

export function TaskList({
  tasks,
  projects: _projects,
  devEnvironments,
  loading,
  currentPage,
  totalPages,
  total,
  statusFilter,
  projectFilter,
  titleFilter,
  branchFilter,
  devEnvironmentFilter,
  hideProjectFilter = false,
  hidePagination = false,
  onPageChange,
  onStatusFilterChange,
  onProjectFilterChange,
  onTitleFilterChange,
  onBranchFilterChange,
  onDevEnvironmentFilterChange,
  onFiltersApply,
  onEdit,
  onDelete,
  onViewConversation,
  onViewGitDiff,
  onPushBranch,
  onCreateNew,
  onBatchUpdateStatus,
}: TaskListProps) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [showBatchStatusDialog, setShowBatchStatusDialog] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] =
    useState<TaskStatus>("todo");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [localFilters, setLocalFilters] = useState({
    status: statusFilter,
    project: projectFilter,
    title: titleFilter,
    branch: branchFilter,
    devEnvironment: devEnvironmentFilter,
  });

  React.useEffect(() => {
    setLocalFilters({
      status: statusFilter,
      project: projectFilter,
      title: titleFilter,
      branch: branchFilter,
      devEnvironment: devEnvironmentFilter,
    });
  }, [
    statusFilter,
    projectFilter,
    titleFilter,
    branchFilter,
    devEnvironmentFilter,
  ]);

  const handleLocalFilterChange = (
    key: keyof typeof localFilters,
    value: any
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  const applyFilters = () => {
    if (onFiltersApply) {
      onFiltersApply({
        status: localFilters.status,
        project: localFilters.project,
        title: localFilters.title,
        branch: localFilters.branch,
        devEnvironment: localFilters.devEnvironment,
      });
    } else {
      onStatusFilterChange(localFilters.status);
      onProjectFilterChange(localFilters.project);
      onTitleFilterChange(localFilters.title);
      onBranchFilterChange(localFilters.branch);
      onDevEnvironmentFilterChange(localFilters.devEnvironment);
    }
  };

  const resetFilters = () => {
    const emptyFilters = {
      status: undefined,
      project: hideProjectFilter ? projectFilter : undefined,
      title: undefined,
      branch: undefined,
      devEnvironment: undefined,
    };
    setLocalFilters(emptyFilters);
    if (onFiltersApply) {
      onFiltersApply(emptyFilters);
    } else {
      onStatusFilterChange(emptyFilters.status);
      onProjectFilterChange(emptyFilters.project);
      onTitleFilterChange(emptyFilters.title);
      onBranchFilterChange(emptyFilters.branch);
      onDevEnvironmentFilterChange(emptyFilters.devEnvironment);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "done":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return <Clock className="w-3 h-3" />;
      case "in_progress":
        return <Play className="w-3 h-3" />;
      case "done":
        return <CheckCircle className="w-3 h-3" />;
      case "cancelled":
        return <X className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const handleSelectTask = (taskId: number, checked: boolean) => {
    if (checked) {
      setSelectedTaskIds((prev) => [...prev, taskId]);
    } else {
      setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(tasks.map((task) => task.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleBatchUpdateStatus = () => {
    if (selectedTaskIds.length === 0) {
      return;
    }
    setShowBatchStatusDialog(true);
  };

  const confirmBatchUpdateStatus = () => {
    if (onBatchUpdateStatus && selectedTaskIds.length > 0) {
      onBatchUpdateStatus(selectedTaskIds, batchTargetStatus);
      setSelectedTaskIds([]);
      setShowBatchStatusDialog(false);
    }
  };

  const getStatusDisplayName = (status: TaskStatus) => {
    const statusMap = {
      todo: t("tasks.status.todo"),
      in_progress: t("tasks.status.in_progress"),
      done: t("tasks.status.done"),
      cancelled: t("tasks.status.cancelled"),
    } as const;
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      onDelete(taskToDelete.id);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleRefresh = () => {
    applyFilters();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-foreground">
          {t("common.total")} {total} {t("common.items")}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-foreground"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {t("common.filter")}
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            size="sm"
            variant="ghost"
            className="text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="border rounded-lg p-4 space-y-4 bg-card">
          <h3 className="text-sm font-medium">{t("tasks.filters.title")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">{t("tasks.filters.taskTitle")}</Label>
              <Input
                id="title"
                type="text"
                placeholder={t("tasks.filters.titlePlaceholder")}
                value={localFilters.title || ""}
                onChange={(e) =>
                  handleLocalFilterChange("title", e.target.value)
                }
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch" className="text-sm">{t("tasks.filters.branch")}</Label>
              <Input
                id="branch"
                type="text"
                placeholder={t("tasks.filters.branchPlaceholder")}
                value={localFilters.branch || ""}
                onChange={(e) =>
                  handleLocalFilterChange("branch", e.target.value)
                }
                className="h-8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="devEnvironment" className="text-sm">
                {t("tasks.filters.devEnvironment")}
              </Label>
              <Select
                value={localFilters.devEnvironment?.toString() || "all"}
                onValueChange={(value) =>
                  handleLocalFilterChange(
                    "devEnvironment",
                    value === "all" ? undefined : parseInt(value)
                  )
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {devEnvironments.map((env) => (
                    <SelectItem key={env.id} value={env.id.toString()}>
                      {env.name} ({env.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} size="sm">{t("common.apply")}</Button>
            <Button variant="outline" onClick={resetFilters} size="sm">
              {t("common.reset")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("tasks.empty.title")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("tasks.empty.description")}
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                {t("tasks.actions.create")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTaskIds.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-blue-700 font-medium">
                      {t("tasks.batch.selectedCount", {
                        count: selectedTaskIds.length,
                      })}
                    </span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBatchUpdateStatus}
                    disabled={selectedTaskIds.length === 0}
                  >
                    {t("tasks.batch.updateStatus")}
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedTaskIds.length === tasks.length &&
                          tasks.length > 0
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked as boolean)
                        }
                      />
                    </TableHead>
                    <TableHead>{t("tasks.table.title")}</TableHead>
                    {!hideProjectFilter && (
                      <TableHead>{t("tasks.table.project")}</TableHead>
                    )}
                    <TableHead>{t("tasks.table.status")}</TableHead>
                    <TableHead>{t("tasks.table.conversations")}</TableHead>
                    <TableHead>{t("tasks.table.branch")}</TableHead>
                    <TableHead>{t("tasks.table.environment")}</TableHead>
                    <TableHead>{t("tasks.table.updated")}</TableHead>
                    <TableHead className="text-right">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTaskIds.includes(task.id)}
                          onCheckedChange={(checked) =>
                            handleSelectTask(task.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div
                            className="font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                            onClick={() => onViewConversation?.(task)}
                          >
                            {task.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("common.createdAt")}:{" "}
                            {formatDate(task.created_at)}
                          </div>
                        </div>
                      </TableCell>
                      {!hideProjectFilter && (
                        <TableCell>
                          {task.project?.name && (
                            <span className="text-blue-600">
                              {task.project.name}
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(task.status)}`}
                        >
                          {getStatusIcon(task.status)}
                          <span className="ml-1">
                            {getStatusDisplayName(task.status)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {task.conversation_count}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <GitBranch className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{task.start_branch}</span>
                          {task.has_pull_request && (
                            <Badge variant="outline" className="text-xs">
                              <GitPullRequest className="w-3 h-3 mr-1" />
                              PR
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.dev_environment ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-sm">
                              {task.dev_environment.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(task.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">
                                {t("common.open_menu")}
                              </span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {t("common.actions")}
                            </DropdownMenuLabel>

                            {onViewConversation && (
                              <DropdownMenuItem
                                onClick={() => onViewConversation(task)}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {t("tasks.actions.viewConversation")}
                              </DropdownMenuItem>
                            )}

                            {onViewGitDiff && task.work_branch && (
                              <DropdownMenuItem
                                onClick={() => onViewGitDiff(task)}
                              >
                                <GitCompare className="h-4 w-4 mr-2" />
                                {t("tasks.actions.viewGitDiff")}
                              </DropdownMenuItem>
                            )}

                            {onPushBranch && (
                              <DropdownMenuItem
                                onClick={() => onPushBranch(task)}
                              >
                                <GitBranch className="h-4 w-4 mr-2" />
                                {t("tasks.actions.pushBranch")}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => onEdit(task)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(task)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!hidePagination && totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t("common.page")} {currentPage} / {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      <Dialog
        open={showBatchStatusDialog}
        onOpenChange={setShowBatchStatusDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t("tasks.batch.updateStatus")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("tasks.batch.confirmUpdate", {
                count: selectedTaskIds.length,
                status: getStatusDisplayName(batchTargetStatus),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-status" className="text-muted-foreground">
                {t("tasks.batch.selectStatus")}
              </Label>
              <Select
                value={batchTargetStatus}
                onValueChange={(value: TaskStatus) =>
                  setBatchTargetStatus(value)
                }
              >
                <SelectTrigger className="text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">{t("tasks.status.todo")}</SelectItem>
                  <SelectItem value="in_progress">
                    {t("tasks.status.in_progress")}
                  </SelectItem>
                  <SelectItem value="done">{t("tasks.status.done")}</SelectItem>
                  <SelectItem value="cancelled">
                    {t("tasks.status.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={() => setShowBatchStatusDialog(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmBatchUpdateStatus}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {t("tasks.messages.delete_confirm_title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("tasks.messages.deleteConfirm", {
                title: taskToDelete?.title || "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-foreground hover:text-foreground"
              onClick={handleCancelDelete}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="text-foreground"
              onClick={handleConfirmDelete}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
