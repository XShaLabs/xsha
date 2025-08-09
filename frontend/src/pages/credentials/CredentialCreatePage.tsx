import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { GitCredentialForm } from "@/components/GitCredentialForm";
import {
  EmptyStateContainer,
  EmptyStateTitle,
  EmptyStateDescription,
  Section,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content";
import type { GitCredential } from "@/types/credentials";

const CredentialCreatePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setItems } = useBreadcrumb();

  usePageTitle(t("gitCredentials.create"));

  // Set breadcrumb navigation
  useEffect(() => {
    setItems([
      {
        type: "link",
        label: t("gitCredentials.list"),
        href: "/credentials",
      },
      {
        type: "page",
        label: t("gitCredentials.create"),
      },
    ]);

    // Cleanup when component unmounts
    return () => {
      setItems([]);
    };
  }, [setItems, t]);

  const handleSubmit = (_credential: GitCredential) => {
    navigate("/credentials");
  };

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("gitCredentials.create")}</SectionTitle>
        </SectionHeader>
        <GitCredentialForm onSubmit={handleSubmit} />
      </Section>
      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("gitCredentials.createAndSecure")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("gitCredentials.createHelpText")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default CredentialCreatePage;
