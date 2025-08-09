import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardFooter,
  FormCardFooterInfo,
  FormCardHeader,
  FormCardTitle,
} from "@/components/forms/form-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import type { Task } from "@/types/task";

interface TaskFormEditProps {
  task: Task;
  loading?: boolean;
  onSubmit: (data: { title: string }) => Promise<void>;
  onCancel?: () => void;
}

export function TaskFormEdit({
  task,
  loading = false,
  onSubmit,
}: TaskFormEditProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    title: task.title,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t("tasks.validation.titleRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ title: formData.title });
    } catch (error) {
      console.error("Failed to submit task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
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
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard>
        <FormCardHeader>
          <FormCardTitle>{t("tasks.actions.edit")}</FormCardTitle>
          <FormCardDescription>
            {t("tasks.form.editDescription")}
          </FormCardDescription>
        </FormCardHeader>

        <FormCardContent className="grid gap-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="title">
              {t("tasks.fields.title")}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder={t("tasks.form.titlePlaceholder")}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>
        </FormCardContent>

        <FormCardFooter>
          <FormCardFooterInfo>
            {t("tasks.form.editFooterInfo")}
          </FormCardFooterInfo>
          <Button type="submit" disabled={submitting || loading}>
            <Save className="w-4 h-4 mr-2" />
            {submitting
              ? t("common.saving")
              : t("common.save")}
          </Button>
        </FormCardFooter>
      </FormCard>
    </form>
  );
}