import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
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

const ProjectCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setItems } = useBreadcrumb();

  usePageTitle(t("projects.create"));

  // Set breadcrumb navigation
  useEffect(() => {
    setItems([
      {
        type: "link",
        label: t("projects.list"),
        href: "/projects",
      },
      {
        type: "page",
        label: t("projects.create"),
      },
    ]);

    // Cleanup when component unmounts
    return () => {
      setItems([]);
    };
  }, [setItems, t]);

  const handleSubmit = (_project: Project) => {
    navigate("/projects");
  };

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("projects.create")}</SectionTitle>
        </SectionHeader>
        <ProjectForm onSubmit={handleSubmit} />
      </Section>
      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("projects.createAndCustomize")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("projects.createHelpText")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default ProjectCreatePage;
