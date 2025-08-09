import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { apiService } from "@/lib/api/index";
import { toast } from "sonner";
import { handleApiError } from "@/lib/errors";
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

const EnvironmentEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { setItems } = useBreadcrumb();

  const [environment, setEnvironment] = useState<DevEnvironmentDisplay | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  usePageTitle(
    environment
      ? `${t("devEnvironments.edit")} - ${environment.name}`
      : t("devEnvironments.edit")
  );

  // Set dynamic breadcrumb navigation (including resource name)
  useEffect(() => {
    if (environment) {
      setItems([
        {
          type: "link",
          label: t("devEnvironments.list"),
          href: "/environments",
        },
        {
          type: "page",
          label: `${t("devEnvironments.edit")} - ${environment.name}`,
        },
      ]);
    }

    return () => {
      setItems([]);
    };
  }, [environment, setItems, t]);

  useEffect(() => {
    const loadEnvironment = async () => {
      if (!id) {
        toast.error(t("devEnvironments.invalid_id"));
        navigate("/environments");
        return;
      }

      try {
        setLoading(true);
        const response = await apiService.devEnvironments.get(parseInt(id, 10));

        let envVarsMap: Record<string, string> = {};
        try {
          if (response.environment.env_vars) {
            envVarsMap = JSON.parse(response.environment.env_vars);
          }
        } catch (error) {
          console.warn("Failed to parse env_vars:", error);
        }

        setEnvironment({
          ...response.environment,
          env_vars_map: envVarsMap,
        });
      } catch (error) {
        console.error("Failed to load environment:", error);
        const errorMessage = handleApiError(error);
        toast.error(errorMessage);
        navigate("/environments");
      } finally {
        setLoading(false);
      }
    };

    loadEnvironment();
  }, [id, navigate, t]);

  const handleSubmit = (_environment: DevEnvironmentDisplay) => {
    navigate("/environments");
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

  if (!environment) {
    return null;
  }

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>
            {t("devEnvironments.edit")} - {environment.name}
          </SectionTitle>
        </SectionHeader>
        <DevEnvironmentForm environment={environment} onSubmit={handleSubmit} />
      </Section>
      <Section>
        <EmptyStateContainer>
          <EmptyStateTitle>{t("devEnvironments.editAndUpdate")}</EmptyStateTitle>
          <EmptyStateDescription>
            {t("devEnvironments.editHelpText")}
          </EmptyStateDescription>
        </EmptyStateContainer>
      </Section>
    </SectionGroup>
  );
};

export default EnvironmentEditPage;
