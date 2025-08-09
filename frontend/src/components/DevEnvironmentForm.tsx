import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/lib/api/index";
import { devEnvironmentsApi } from "@/lib/api/environments";
import { handleApiError } from "@/lib/errors";
import type {
  DevEnvironmentDisplay,
  CreateDevEnvironmentRequest,
  UpdateDevEnvironmentRequest,
} from "@/types/dev-environment";

interface DevEnvironmentFormProps {
  environment?: DevEnvironmentDisplay;
  onSubmit?: (environment: DevEnvironmentDisplay) => void;
}

const defaultResources = {
  cpu: 1.0,
  memory: 1024,
};

interface EnvironmentImageOption {
  image: string;
  name: string;
  type: string;
  description: string;
}

const DevEnvironmentForm: React.FC<DevEnvironmentFormProps> = ({
  environment,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const isEdit = !!environment;

  const [environmentImages, setEnvironmentImages] = useState<
    EnvironmentImageOption[]
  >([]);
  const [loadingImages, setLoadingImages] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    docker_image: "",
    cpu_limit: 1.0,
    memory_limit: 1024,
  });

  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const loadEnvironmentImages = async () => {
      try {
        setLoadingImages(true);
        const response = await devEnvironmentsApi.getAvailableImages();
        const images: EnvironmentImageOption[] = response.images.map(
          (item) => ({
            image: item.image,
            name: item.name,
            type: item.type,
            description: item.name,
          })
        );
        setEnvironmentImages(images);

        if (!isEdit && images.length > 0) {
          const defaultImage =
            images.find((img) => img.type === "claude-code") || images[0];
          setFormData((prev) => ({
            ...prev,
            docker_image: defaultImage.image,
          }));
        }
      } catch (error: any) {
        const errorMessage = handleApiError(error);
        toast.error(errorMessage);
        const fallbackImage = {
          image: "claude-code:latest",
          name: "Claude Code",
          type: "claude-code",
          description: "Claude Code",
        };
        setEnvironmentImages([fallbackImage]);
        if (!isEdit) {
          setFormData((prev) => ({
            ...prev,
            docker_image: fallbackImage.image,
          }));
        }
      } finally {
        setLoadingImages(false);
      }
    };

    loadEnvironmentImages();
  }, [isEdit, t]);

  useEffect(() => {
    if (environment && isEdit) {
      setFormData({
        name: environment.name,
        description: environment.description,
        docker_image: environment.docker_image,
        cpu_limit: environment.cpu_limit,
        memory_limit: environment.memory_limit,
      });
      setEnvVars(environment.env_vars_map || {});
    } else {
      setFormData({
        name: "",
        description: "",
        docker_image: "",
        cpu_limit: 1.0,
        memory_limit: 1024,
      });
      setEnvVars({});
    }
    setValidationErrors({});
    setNewEnvKey("");
    setNewEnvValue("");
  }, [environment, isEdit]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = t("devEnvironments.validation.name_required");
    }

    if (!isEdit && !formData.docker_image.trim()) {
      errors.docker_image = t(
        "devEnvironments.validation.docker_image_required"
      );
    }

    if (formData.cpu_limit <= 0 || formData.cpu_limit > 16) {
      errors.cpu_limit = t("devEnvironments.validation.cpu_limit_invalid");
    }

    if (formData.memory_limit <= 0 || formData.memory_limit > 32768) {
      errors.memory_limit = t(
        "devEnvironments.validation.memory_limit_invalid"
      );
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDockerImageChange = (dockerImage: string) => {
    const selectedImage = environmentImages.find(
      (img) => img.image === dockerImage
    );

    setFormData((prev) => ({
      ...prev,
      docker_image: dockerImage,
      cpu_limit: defaultResources.cpu,
      memory_limit: defaultResources.memory,
      type: selectedImage?.type || "claude-code",
    }));
  };

  const addEnvVar = () => {
    if (!newEnvKey.trim()) {
      toast.error(t("devEnvironments.env_vars.key_required"));
      return;
    }

    if (envVars[newEnvKey]) {
      toast.error(t("devEnvironments.env_vars.key_exists"));
      return;
    }

    setEnvVars((prev) => ({
      ...prev,
      [newEnvKey]: newEnvValue,
    }));
    setNewEnvKey("");
    setNewEnvValue("");
  };

  const removeEnvVar = (key: string) => {
    setEnvVars((prev) => {
      const newVars = { ...prev };
      delete newVars[key];
      return newVars;
    });
  };

  const updateEnvVar = (key: string, value: string) => {
    setEnvVars((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let result: DevEnvironmentDisplay;

      if (isEdit && environment) {
        const requestData: UpdateDevEnvironmentRequest = {
          name: formData.name,
          description: formData.description,
          cpu_limit: formData.cpu_limit,
          memory_limit: formData.memory_limit,
          env_vars: envVars,
        };
        await apiService.devEnvironments.update(environment.id, requestData);
        toast.success(t("devEnvironments.update_success"));
        
        // Get updated environment
        const response = await apiService.devEnvironments.get(environment.id);
        result = {
          ...response.environment,
          env_vars_map: envVars,
        } as DevEnvironmentDisplay;
      } else {
        const selectedImage = environmentImages.find(
          (img) => img.image === formData.docker_image
        );
        const envType = selectedImage?.type || "claude-code";

        const requestData: CreateDevEnvironmentRequest = {
          ...formData,
          type: envType,
          env_vars: envVars,
        };
        const response = await apiService.devEnvironments.create(requestData);
        result = {
          ...response.environment,
          env_vars_map: envVars,
        } as DevEnvironmentDisplay;
        toast.success(t("devEnvironments.create_success"));
      }

      if (onSubmit) {
        onSubmit(result);
      }
    } catch (error: any) {
      console.error("Failed to save environment:", error);
      const errorMessage = handleApiError(error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>
            {isEdit ? t("devEnvironments.edit") : t("devEnvironments.create")}
          </FormCardTitle>
          <FormCardDescription>
            {isEdit
              ? t("devEnvironments.edit_description")
              : t("devEnvironments.create_description")}
          </FormCardDescription>
        </FormCardHeader>
        
        <FormCardContent className="grid gap-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="name">{t("devEnvironments.form.name")} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder={t("devEnvironments.form.name_placeholder")}
              className={validationErrors.name ? "border-destructive" : ""}
            />
            {validationErrors.name && (
              <p className="text-sm text-destructive">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="description">
              {t("devEnvironments.form.description")}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleFieldChange("description", e.target.value)
              }
              placeholder={t("devEnvironments.form.description_placeholder")}
              rows={3}
            />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-3">
              <Label>{t("devEnvironments.form.docker_image")} *</Label>
              <Select
                value={formData.docker_image}
                onValueChange={handleDockerImageChange}
                disabled={loadingImages}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t(
                      "devEnvironments.form.docker_image_placeholder"
                    )}
                  >
                    {loadingImages ? t("common.loading") : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-[400px]">
                  {environmentImages.map((imgOption) => (
                    <SelectItem key={imgOption.image} value={imgOption.image}>
                      <span className="font-medium truncate">{imgOption.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.docker_image && (
                <p className="text-sm text-destructive">
                  {validationErrors.docker_image}
                </p>
              )}
            </div>
          )}
        </FormCardContent>

        <FormCardSeparator />
        
        <FormCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="cpu_limit">
                {t("devEnvironments.form.cpu_limit")} * (0.1-16{" "}
                {t("devEnvironments.stats.cores")})
              </Label>
              <Input
                id="cpu_limit"
                type="number"
                step="0.1"
                min="0.1"
                max="16"
                value={formData.cpu_limit}
                onChange={(e) =>
                  handleFieldChange("cpu_limit", parseFloat(e.target.value))
                }
                className={
                  validationErrors.cpu_limit ? "border-destructive" : ""
                }
              />
              {validationErrors.cpu_limit && (
                <p className="text-sm text-destructive">
                  {validationErrors.cpu_limit}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Label htmlFor="memory_limit">
                {t("devEnvironments.form.memory_limit")} * (128-32768 MB)
              </Label>
              <Input
                id="memory_limit"
                type="number"
                min="128"
                max="32768"
                value={formData.memory_limit}
                onChange={(e) =>
                  handleFieldChange("memory_limit", parseInt(e.target.value))
                }
                className={
                  validationErrors.memory_limit ? "border-destructive" : ""
                }
              />
              {validationErrors.memory_limit && (
                <p className="text-sm text-destructive">
                  {validationErrors.memory_limit}
                </p>
              )}
            </div>
          </div>
        </FormCardContent>

        <FormCardSeparator />
        
        <FormCardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <Label>{t("devEnvironments.env_vars.title")}</Label>
              <div className="space-y-3">
                {Object.keys(envVars).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("devEnvironments.env_vars.empty_message")}
                  </p>
                )}
                {Object.entries(envVars).map(([key, value]) => (
                  <div key={key} className="grid gap-2 grid-cols-5">
                    <Input
                      placeholder={t("devEnvironments.env_vars.key")}
                      className="col-span-2"
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        if (newKey !== key) {
                          // Check if new key already exists
                          if (newKey && envVars[newKey]) {
                            toast.error(t("devEnvironments.env_vars.key_exists"));
                            return;
                          }
                          const newVars = { ...envVars };
                          delete newVars[key];
                          if (newKey) {
                            newVars[newKey] = value;
                          }
                          setEnvVars(newVars);
                        }
                      }}
                    />
                    <Input
                      placeholder={t("devEnvironments.env_vars.value")}
                      className="col-span-2"
                      value={value}
                      onChange={(e) => updateEnvVar(key, e.target.value)}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEnvVar(key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 grid-cols-5">
                <Input
                  placeholder={t("devEnvironments.env_vars.key")}
                  className="col-span-2"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newEnvKey.trim()) {
                      e.preventDefault();
                      addEnvVar();
                    }
                  }}
                />
                <Input
                  placeholder={t("devEnvironments.env_vars.value")}
                  className="col-span-2"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newEnvKey.trim()) {
                      e.preventDefault();
                      addEnvVar();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={addEnvVar}
                  disabled={!newEnvKey.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addEnvVar}
                  disabled={!newEnvKey.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("devEnvironments.env_vars.add")}
                </Button>
              </div>
            </div>
          </div>
        </FormCardContent>

        <FormCardFooter>
          <FormCardFooterInfo>
            {t("devEnvironments.configurationHelp")}
          </FormCardFooterInfo>
          <Button type="submit" disabled={loading}>
            {loading
              ? t("common.loading")
              : isEdit
              ? t("common.save")
              : t("devEnvironments.create")}
          </Button>
        </FormCardFooter>
      </FormCard>
    </form>
  );
};

export default DevEnvironmentForm;
