import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import { ProjectForm } from "@/components/ProjectForm";
import {
  EmptyStateContainer,
  EmptyStateTitle,
  EmptyStateDescription,
  Section,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content";
import type { Project } from "@/types/project";

const ProjectEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { setItems } = useBreadcrumb();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  usePageTitle(
    project ? `${t("projects.edit")} - ${project.name}` : t("projects.edit")
  );

  // Set breadcrumb navigation
  useEffect(() => {
    if (project) {
      setItems([
        {
          type: "link",
          label: t("projects.list"),
          href: "/projects",
        },
        {
          type: "page",
          label: `${t("projects.edit")} - ${project.name}`,
        },
      ]);
    }

    // Cleanup when component unmounts
    return () => {
      setItems([]);
    };
  }, [project, setItems, t]);

  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        logError(new Error("Project ID is required"), "Invalid project ID");
        navigate("/projects");
        return;
      }

      try {
        setLoading(true);
        const response = await apiService.projects.get(parseInt(id, 10));
        setProject(response.project);
      } catch (error) {
        logError(error as Error, "Failed to load project");
        toast.error(
          error instanceof Error
            ? error.message
            : t("projects.messages.loadFailed")
        );
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, navigate, t]);

  const handleSubmit = (_project: Project) => {
    navigate("/projects");
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

  if (!project) {
    return null;
  }

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("projects.edit")} - {project.name}</SectionTitle>
        </SectionHeader>
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
        />
      </Section>
      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("projects.editAndUpdate")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("projects.editHelpText")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default ProjectEditPage;
