import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { TaskFormEdit } from "@/components/TaskFormEdit";
import {
  Section,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content/section";
import {
  EmptyStateContainer,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/content/empty-state";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import type { Task, TaskFormData } from "@/types/task";

const TaskEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId, taskId } = useParams<{
    projectId: string;
    taskId: string;
  }>();
  const { setItems } = useBreadcrumb();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  usePageTitle(task ? `${t("tasks.edit")} - ${task.title}` : t("tasks.edit"));

  useEffect(() => {
    const loadData = async () => {
      if (!taskId || !projectId) {
        logError(
          new Error("Task ID and Project ID are required"),
          "Invalid IDs"
        );
        navigate(`/projects/${projectId}/tasks`);
        return;
      }

      try {
        setLoading(true);

        const taskResponse = await apiService.tasks.get(parseInt(taskId, 10));
        setTask(taskResponse.data);
      } catch (error) {
        logError(error as Error, "Failed to load task");
        toast.error(
          error instanceof Error
            ? error.message
            : t("tasks.messages.loadFailed")
        );
        navigate(`/projects/${projectId}/tasks`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [taskId, projectId, navigate, t]);

  // Set breadcrumb items when task data is loaded
  useEffect(() => {
    if (task && task.project) {
      setItems([
        { type: "link", label: t("navigation.projects"), href: "/projects" },
        {
          type: "link",
          label: task.project.name,
          href: `/projects/${projectId}/tasks`,
        },
        { type: "page", label: `${t("tasks.edit")} - ${task.title}` },
      ]);
    }

    // Cleanup when component unmounts
    return () => {
      setItems([]);
    };
  }, [task, projectId, setItems, t]);

  const handleSubmit = async (data: TaskFormData | { title: string }) => {
    if (!taskId) return;

    try {
      await apiService.tasks.update(
        parseInt(taskId, 10),
        data as { title: string }
      );
      toast.success(t("tasks.messages.updateSuccess"));
      navigate(`/projects/${projectId}/tasks`);
    } catch (error) {
      logError(error as Error, "Failed to submit task");
      throw error;
    }
  };

  if (loading) {
    return (
      <SectionGroup>
        <Section>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          </div>
        </Section>
      </SectionGroup>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>
            {t("tasks.edit")} - {task.title}
          </SectionTitle>
        </SectionHeader>
        <TaskFormEdit task={task} onSubmit={handleSubmit} />
      </Section>

      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("tasks.form.editHelpTitle")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("tasks.form.editHelpDescription")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default TaskEditPage;
