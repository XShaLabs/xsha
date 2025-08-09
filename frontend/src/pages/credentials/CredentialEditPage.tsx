import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
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

const CredentialEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { setItems } = useBreadcrumb();

  const [credential, setCredential] = useState<GitCredential | null>(null);
  const [loading, setLoading] = useState(true);

  usePageTitle(
    credential
      ? `${t("gitCredentials.edit")} - ${credential.name}`
      : t("gitCredentials.edit")
  );

  // Set dynamic breadcrumb navigation (including resource name)
  useEffect(() => {
    if (credential) {
      setItems([
        {
          type: "link",
          label: t("gitCredentials.list"),
          href: "/credentials",
        },
        {
          type: "page",
          label: `${t("gitCredentials.edit")} - ${credential.name}`,
        },
      ]);
    }

    return () => {
      setItems([]);
    };
  }, [credential, setItems, t]);

  useEffect(() => {
    const loadCredential = async () => {
      if (!id) {
        logError(
          new Error("Credential ID is required"),
          "Invalid credential ID"
        );
        navigate("/credentials");
        return;
      }

      try {
        setLoading(true);
        const response = await apiService.gitCredentials.get(parseInt(id, 10));
        setCredential(response.credential);
      } catch (error) {
        logError(error as Error, "Failed to load credential");
        toast.error(
          error instanceof Error
            ? error.message
            : t("gitCredentials.messages.loadFailed")
        );
        navigate("/credentials");
      } finally {
        setLoading(false);
      }
    };

    loadCredential();
  }, [id, navigate, t]);

  const handleSubmit = (_credential: GitCredential) => {
    navigate("/credentials");
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

  if (!credential) {
    return null;
  }

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>
            {t("gitCredentials.edit")} - {credential.name}
          </SectionTitle>
        </SectionHeader>
        <GitCredentialForm credential={credential} onSubmit={handleSubmit} />
      </Section>
      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("gitCredentials.editAndUpdate")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("gitCredentials.editHelpText")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default CredentialEditPage;
