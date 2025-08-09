import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { TaskFormCreate } from "@/components/TaskFormCreate";
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
import { toast } from "sonner";
import type { TaskFormData } from "@/types/task";
import type { Project } from "@/types/project";

const TaskCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { setItems } = useBreadcrumb();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  usePageTitle(t("tasks.create"));

  useEffect(() => {
    const loadCurrentProject = async () => {
      if (projectId) {
        try {
          const projectResponse = await apiService.projects.get(
            parseInt(projectId, 10)
          );
          setCurrentProject(projectResponse.project);
        } catch (error) {
          logError(error as Error, "Failed to load current project");
        }
      }
    };

    loadCurrentProject();
  }, [projectId]);

  // Set breadcrumb items
  useEffect(() => {
    if (currentProject) {
      setItems([
        { type: "link", label: t("navigation.projects"), href: "/projects" },
        { type: "link", label: currentProject.name, href: `/projects/${projectId}/tasks` },
        { type: "page", label: t("tasks.create") }
      ]);
    }

    // Cleanup when component unmounts
    return () => {
      setItems([]);
    };
  }, [currentProject, projectId, setItems, t]);

  const handleSubmit = async (data: TaskFormData | { title: string }) => {
    try {
      const projectIdNum = projectId ? parseInt(projectId, 10) : undefined;
      if (!projectIdNum) {
        throw new Error(t("errors.project_id_required"));
      }

      if ("start_branch" in data && "project_id" in data) {
        await apiService.tasks.create({ ...data, project_id: projectIdNum });
        toast.success(t("tasks.messages.createSuccess"));
      } else {
        throw new Error(t("errors.task_fields_required"));
      }
      navigate(`/projects/${projectId}/tasks`);
    } catch (error) {
      logError(error as Error, "Failed to submit task");
      throw error;
    }
  };

  return (
    <SectionGroup>
        <Section>
          <SectionHeader>
            <SectionTitle>{t("tasks.create")}</SectionTitle>
          </SectionHeader>
          <TaskFormCreate
            defaultProjectId={projectId ? parseInt(projectId, 10) : undefined}
            currentProject={currentProject || undefined}
            onSubmit={handleSubmit}
          />
        </Section>
        
        <Section>
          <EmptyStateContainer>
            <EmptyStateTitle>{t("tasks.form.helpTitle")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("tasks.form.helpDescription")}
            </EmptyStateDescription>
          </EmptyStateContainer>
        </Section>
      </SectionGroup>
  );
};

export default TaskCreatePage;
