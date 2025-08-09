import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardFooter,
  FormCardFooterInfo,
  FormCardHeader,
  FormCardSeparator,
  FormCardTitle,
} from "@/components/forms/form-card";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFormData,
  GitProtocolType,
} from "@/types/project";

interface ProjectFormProps {
  project?: Project;
  onSubmit?: (project: Project) => void;
}

interface CredentialOption {
  id: number;
  name: string;
  type: string;
  username: string;
}

export function ProjectForm({ project, onSubmit }: ProjectFormProps) {
  const { t } = useTranslation();
  const isEdit = !!project;

  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || "",
    description: project?.description || "",
    repo_url: project?.repo_url || "",
    protocol: project?.protocol || "https",
    credential_id: project?.credential_id,
  });

  const [credentials, setCredentials] = useState<CredentialOption[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [branchesLoading, setBranchesLoading] = useState(false);

  void branches;
  void branchesLoading;
  const [urlParsing, setUrlParsing] = useState(false);
  const [credentialValidating, setCredentialValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [urlParseTimeout, setUrlParseTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [accessValidated, setAccessValidated] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const loadCredentials = async (protocol: GitProtocolType) => {
    try {
      setCredentialsLoading(true);
      const response = await apiService.projects.getCompatibleCredentials(
        protocol
      );
      setCredentials(response.credentials);
    } catch (error) {
      logError(error as Error, "Failed to load credentials");
      setCredentials([]);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const validateAccessAndFetchBranches = async (
    repoUrl: string,
    credentialId?: number
  ) => {
    if (!repoUrl.trim()) {
      setBranches([]);
      setAccessValidated(false);
      setAccessError(null);
      return;
    }

    try {
      setCredentialValidating(true);
      setBranchesLoading(true);
      setAccessError(null);
      setAccessValidated(false);

      const validateResponse = await apiService.projects.validateAccess({
        repo_url: repoUrl,
        credential_id: credentialId,
      });

      if (!validateResponse.can_access) {
        setAccessError(
          validateResponse.error || t("projects.messages.accessFailed")
        );
        setBranches([]);
        return;
      }

      const branchesResponse = await apiService.projects.fetchBranches({
        repo_url: repoUrl,
        credential_id: credentialId,
      });

      if (branchesResponse.result.can_access) {
        setBranches(branchesResponse.result.branches);
        setAccessValidated(true);
      } else {
        setAccessError(
          branchesResponse.result.error_message ||
            t("projects.messages.fetchBranchesFailed")
        );
        setBranches([]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t("projects.messages.validateAccessFailed");
      setAccessError(errorMessage);
      setBranches([]);
      logError(error as Error, "Failed to validate repository access");
    } finally {
      setCredentialValidating(false);
      setBranchesLoading(false);
    }
  };

  const parseRepositoryUrl = useCallback(
    async (url: string) => {
      if (!url.trim()) {
        return;
      }

      const gitUrlPattern = /^(https?:\/\/|git@|ssh:\/\/)/;
      if (!gitUrlPattern.test(url)) {
        return;
      }

      try {
        setUrlParsing(true);
        const response = await apiService.projects.parseUrl(url);

        if (response.result.is_valid) {
          const detectedProtocol = response.result.protocol as GitProtocolType;

          if (detectedProtocol !== formData.protocol) {
            setFormData((prev) => ({
              ...prev,
              protocol: detectedProtocol,
              credential_id: undefined,
            }));
          }
        }
      } catch (error) {
        logError(error as Error, "Failed to parse repository URL");
      } finally {
        setUrlParsing(false);
      }
    },
    [formData.protocol]
  );

  useEffect(() => {
    if (formData.protocol) {
      loadCredentials(formData.protocol);
    }
  }, [formData.protocol]);

  useEffect(() => {
    if (formData.repo_url && formData.credential_id) {
      validateAccessAndFetchBranches(formData.repo_url, formData.credential_id);
    } else if (formData.repo_url && !formData.credential_id) {
      validateAccessAndFetchBranches(formData.repo_url);
    } else {
      setBranches([]);
      setAccessValidated(false);
      setAccessError(null);
    }
  }, [formData.repo_url, formData.credential_id]);

  useEffect(() => {
    return () => {
      if (urlParseTimeout) {
        clearTimeout(urlParseTimeout);
      }
    };
  }, [urlParseTimeout]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("projects.validation.nameRequired");
    }

    if (!formData.repo_url.trim()) {
      newErrors.repo_url = t("projects.validation.repoUrlRequired");
    } else {
      const urlPattern = /^(https?:\/\/|git@)/;
      if (!urlPattern.test(formData.repo_url)) {
        newErrors.repo_url = t("projects.validation.invalidRepoUrl");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    field: keyof ProjectFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    if (field === "repo_url" && typeof value === "string") {
      if (urlParseTimeout) {
        clearTimeout(urlParseTimeout);
      }

      const timeoutId = setTimeout(() => {
        parseRepositoryUrl(value);
      }, 500);

      setUrlParseTimeout(timeoutId);
    }

    if (field === "credential_id") {
      setAccessValidated(false);
      setAccessError(null);
      setBranches([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let result: Project;

      if (isEdit && project) {
        const updateData: UpdateProjectRequest = {
          name: formData.name,
          description: formData.description,
          repo_url: formData.repo_url,
          protocol: formData.protocol,
          credential_id: formData.credential_id,
        };

        await apiService.projects.update(project.id, updateData);
        toast.success(t("projects.messages.updateSuccess"));

        const response = await apiService.projects.get(project.id);
        result = response.project;
      } else {
        const createData: CreateProjectRequest = {
          name: formData.name,
          description: formData.description,
          repo_url: formData.repo_url,
          protocol: formData.protocol,
          credential_id: formData.credential_id,
        };

        const response = await apiService.projects.create(createData);
        result = response.project;
        toast.success(t("projects.messages.createSuccess"));
      }

      if (onSubmit) {
        onSubmit(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : isEdit
          ? t("projects.messages.updateFailed")
          : t("projects.messages.createFailed");
      setError(errorMessage);
      logError(
        error as Error,
        `Failed to ${isEdit ? "update" : "create"} project`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>
            {isEdit ? t("projects.edit") : t("projects.create")}
          </FormCardTitle>
          <FormCardDescription>
            {isEdit
              ? t("projects.editDescription")
              : t("projects.createDescription")}
          </FormCardDescription>
        </FormCardHeader>
        <FormCardContent className="grid gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Label htmlFor="name">{t("projects.name")} *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder={t("projects.placeholders.name")}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="description">{t("projects.description")}</Label>
            <Input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) =>
                handleInputChange("description", e.target.value)
              }
              placeholder={t("projects.placeholders.description")}
            />
          </div>
        </FormCardContent>
        <FormCardSeparator />
        <FormCardContent>
          <div className="flex flex-col gap-3">
            <Label htmlFor="repo_url">{t("projects.repoUrl")} *</Label>
            <div className="relative">
              <Input
                id="repo_url"
                type="text"
                value={formData.repo_url}
                onChange={(e) =>
                  handleInputChange("repo_url", e.target.value)
                }
                placeholder={t("projects.placeholders.repoUrl")}
                className={errors.repo_url ? "border-red-500" : ""}
              />
              {urlParsing && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            {errors.repo_url && (
              <p className="text-sm text-red-500">{errors.repo_url}</p>
            )}
            {!errors.repo_url && formData.repo_url && (
              <p className="text-sm text-gray-500">
                {t("projects.protocolAutoDetected")}:{" "}
                {formData.protocol.toUpperCase()}
              </p>
            )}
          </div>
        </FormCardContent>
        <FormCardSeparator />
        <FormCardContent>
          <div className="flex flex-col gap-3">
            <Label htmlFor="credential_id">{t("projects.credential")}</Label>
            {credentialsLoading ? (
              <div className="text-sm text-gray-500">
                {t("common.loading")}
              </div>
            ) : (
              <Select
                onValueChange={(value) =>
                  handleInputChange(
                    "credential_id",
                    value ? Number(value) : undefined
                  )
                }
                value={formData.credential_id?.toString()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("projects.placeholders.selectCredential")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((credential) => (
                    <SelectItem
                      key={credential.id}
                      value={credential.id.toString()}
                    >
                      {credential.name} ({credential.type} -{" "}
                      {credential.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-gray-500">
              {t("projects.credentialHelp")}
            </p>

            {credentialValidating && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>{t("projects.repository.validatingAccess")}</span>
              </div>
            )}

            {accessValidated && !credentialValidating && (
              <div className="text-sm text-green-600">
                ✓ {t("projects.repository.accessValidated")}
              </div>
            )}

            {accessError && !credentialValidating && (
              <div className="text-sm text-red-600">✗ {accessError}</div>
            )}
          </div>
        </FormCardContent>
        <FormCardFooter>
          <FormCardFooterInfo>
            {isEdit 
              ? t("projects.editDescription")
              : t("projects.createDescription")}
          </FormCardFooterInfo>
          <Button type="submit" disabled={loading}>
            {loading
              ? t("common.loading")
              : isEdit
              ? t("common.save")
              : t("projects.create")}
          </Button>
        </FormCardFooter>
      </FormCard>
    </form>
  );
}
