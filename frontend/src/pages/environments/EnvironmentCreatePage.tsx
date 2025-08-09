import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import DevEnvironmentForm from "@/components/DevEnvironmentForm";
import {
  EmptyStateContainer,
  EmptyStateTitle,
  EmptyStateDescription,
  Section,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content";
import type { DevEnvironmentDisplay } from "@/types/dev-environment";

const EnvironmentCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setItems } = useBreadcrumb();

  usePageTitle(t("devEnvironments.create"));

  // Set breadcrumb navigation
  useEffect(() => {
    setItems([
      {
        type: "link",
        label: t("devEnvironments.list"),
                  href: "/environments",
      },
      {
        type: "page",
        label: t("devEnvironments.create"),
      },
    ]);

    // Cleanup when component unmounts
    return () => {
      setItems([]);
    };
  }, [setItems, t]);

  const handleSubmit = (_environment: DevEnvironmentDisplay) => {
    navigate("/environments");
  };

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("devEnvironments.create")}</SectionTitle>
        </SectionHeader>
        <DevEnvironmentForm onSubmit={handleSubmit} />
      </Section>
      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("devEnvironments.createAndCustomize")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("devEnvironments.createHelpText")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default EnvironmentCreatePage;
