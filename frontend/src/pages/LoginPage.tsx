import React from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LoginForm } from "@/components/login-form";
import { GalleryVerticalEnd } from "lucide-react";

export const LoginPage: React.FC = () => {
  usePageTitle("common.pageTitle.login");

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a
          href="#"
          className="flex items-center gap-2 self-center font-medium text-foreground"
        >
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          XSHA
        </a>
        <LoginForm />
      </div>
    </div>
  );
};
