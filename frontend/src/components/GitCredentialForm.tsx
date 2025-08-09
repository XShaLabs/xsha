import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { apiService } from "@/lib/api/index";
import type {
  GitCredential,
  GitCredentialType,
  GitCredentialFormData,
} from "@/types/credentials";
import { GitCredentialType as CredentialTypes } from "@/types/credentials";

interface GitCredentialFormProps {
  credential?: GitCredential;
  onSubmit?: (credential: GitCredential) => void;
}

export const GitCredentialForm: React.FC<GitCredentialFormProps> = ({
  credential,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<GitCredentialFormData>({
    name: "",
    description: "",
    type: CredentialTypes.PASSWORD,
    username: "",
    password: "",
    token: "",
    private_key: "",
    public_key: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!credential;

  useEffect(() => {
    if (credential) {
      setFormData({
        name: credential.name,
        description: credential.description,
        type: credential.type,
        username: credential.username,
        password: "",
        token: "",
        private_key: "",
        public_key: credential.public_key || "",
      });
    }
  }, [credential]);

  useEffect(() => {
    if (formData.type === CredentialTypes.SSH_KEY) {
      setFormData((prev) => ({ ...prev, username: "" }));
    }
  }, [formData.type]);

  const updateField = (field: keyof GitCredentialFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim())
      return t("gitCredentials.validation.nameRequired");
    if (!formData.type) return t("gitCredentials.validation.typeRequired");

    if (formData.type !== CredentialTypes.SSH_KEY && !formData.username.trim())
      return t("gitCredentials.validation.usernameRequired");

    if (!isEditing) {
      switch (formData.type) {
        case CredentialTypes.PASSWORD:
          if (!formData.password)
            return t("gitCredentials.validation.passwordRequired");
          break;
        case CredentialTypes.TOKEN:
          if (!formData.token)
            return t("gitCredentials.validation.tokenRequired");
          break;
        case CredentialTypes.SSH_KEY:
          if (!formData.private_key)
            return t("gitCredentials.validation.privateKeyRequired");
          break;
      }
    }

    return null;
  };

  const buildSubmitData = () => {
    const secretData: Record<string, string> = {};

    switch (formData.type) {
      case CredentialTypes.PASSWORD:
        if (formData.password) secretData.password = formData.password;
        break;
      case CredentialTypes.TOKEN:
        if (formData.token) secretData.password = formData.token;
        break;
      case CredentialTypes.SSH_KEY:
        if (formData.private_key) secretData.private_key = formData.private_key;
        if (formData.public_key) secretData.public_key = formData.public_key;
        break;
    }

    return {
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      username:
        formData.type === CredentialTypes.SSH_KEY
          ? ""
          : formData.username.trim(),
      secret_data: secretData,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = buildSubmitData();
      let result: GitCredential;

      if (isEditing && credential) {
        await apiService.gitCredentials.update(credential.id, submitData);
        toast.success(t("gitCredentials.messages.updateSuccess"));
        
        // Get updated credential
        const response = await apiService.gitCredentials.get(credential.id);
        result = response.credential;
      } else {
        const response = await apiService.gitCredentials.create(submitData);
        result = response.credential;
        toast.success(t("gitCredentials.messages.createSuccess"));
      }

      if (onSubmit) {
        onSubmit(result);
      }
    } catch (err: any) {
      setError(
        err.message ||
          t(
            isEditing
              ? "gitCredentials.messages.updateFailed"
              : "gitCredentials.messages.createFailed"
          )
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
            {isEditing ? t("gitCredentials.edit") : t("gitCredentials.create")}
          </FormCardTitle>
          <FormCardDescription>
            {isEditing
              ? t("gitCredentials.editDescription")
              : t("gitCredentials.createDescription")}
          </FormCardDescription>
        </FormCardHeader>
        
        <FormCardContent className="grid gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Label htmlFor="name">{t("gitCredentials.name")} *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t("gitCredentials.placeholders.name")}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="description">
              {t("gitCredentials.description")}
            </Label>
            <Input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t("gitCredentials.placeholders.description")}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="type">{t("gitCredentials.type")} *</Label>
            {isEditing ? (
              <div className="flex items-center h-9 px-3 py-2 border border-input rounded-md bg-muted text-muted-foreground">
                {formData.type === CredentialTypes.PASSWORD && t("gitCredentials.types.password")}
                {formData.type === CredentialTypes.TOKEN && t("gitCredentials.types.token")}
                {formData.type === CredentialTypes.SSH_KEY && t("gitCredentials.types.ssh_key")}
              </div>
            ) : (
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  updateField("type", value as GitCredentialType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("gitCredentials.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CredentialTypes.PASSWORD}>
                    {t("gitCredentials.types.password")}
                  </SelectItem>
                  <SelectItem value={CredentialTypes.TOKEN}>
                    {t("gitCredentials.types.token")}
                  </SelectItem>
                  {/* <SelectItem value={CredentialTypes.SSH_KEY}>
                    {t("gitCredentials.types.ssh_key")}
                  </SelectItem> */}
                </SelectContent>
              </Select>
            )}
          </div>

          {formData.type !== CredentialTypes.SSH_KEY && (
            <div className="flex flex-col gap-3">
              <Label htmlFor="username">
                {t("gitCredentials.username")} *
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder={t("gitCredentials.placeholders.username")}
              />
            </div>
          )}
        </FormCardContent>

        <FormCardSeparator />
        
        <FormCardContent>
          {formData.type === CredentialTypes.PASSWORD && (
            <div className="flex flex-col gap-3">
              <Label htmlFor="password">
                {t("gitCredentials.password")}
                {!isEditing && " *"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder={
                  isEditing
                    ? t("gitCredentials.placeholders.passwordOptional")
                    : t("gitCredentials.placeholders.password")
                }
              />
            </div>
          )}

          {formData.type === CredentialTypes.TOKEN && (
            <div className="flex flex-col gap-3">
              <Label htmlFor="token">
                {t("gitCredentials.token")}
                {!isEditing && " *"}
              </Label>
              <Input
                id="token"
                type="password"
                value={formData.token}
                onChange={(e) => updateField("token", e.target.value)}
                placeholder={
                  isEditing
                    ? t("gitCredentials.placeholders.tokenOptional")
                    : t("gitCredentials.placeholders.token")
                }
              />
            </div>
          )}

          {formData.type === CredentialTypes.SSH_KEY && (
            <>
              <div className="flex flex-col gap-3">
                <Label htmlFor="private_key">
                  {t("gitCredentials.privateKey")}
                  {!isEditing && " *"}
                </Label>
                <Textarea
                  id="private_key"
                  value={formData.private_key}
                  onChange={(e) => updateField("private_key", e.target.value)}
                  placeholder={
                    isEditing
                      ? t("gitCredentials.placeholders.privateKeyOptional")
                      : t("gitCredentials.placeholders.privateKey")
                  }
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="public_key">
                  {t("gitCredentials.publicKey")}
                </Label>
                <Textarea
                  id="public_key"
                  value={formData.public_key}
                  onChange={(e) => updateField("public_key", e.target.value)}
                  placeholder={
                    isEditing
                      ? t("gitCredentials.placeholders.publicKeyOptional")
                      : t("gitCredentials.placeholders.publicKey")
                  }
                  className="min-h-[80px] font-mono text-sm"
                />
              </div>
            </>
          )}
        </FormCardContent>

        <FormCardFooter>
          <FormCardFooterInfo>
            {t("gitCredentials.securityNotice")}
          </FormCardFooterInfo>
          <Button type="submit" disabled={loading}>
            {loading
              ? t("common.loading")
              : isEditing
              ? t("common.save")
              : t("gitCredentials.create")}
          </Button>
        </FormCardFooter>
      </FormCard>
    </form>
  );
};

export default GitCredentialForm;
