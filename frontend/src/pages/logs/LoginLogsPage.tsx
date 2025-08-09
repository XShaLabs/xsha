import React from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LoginLogTab } from "@/components/LoginLogTab";
import { SectionGroup } from "@/components/content/section";

export const LoginLogsPage: React.FC = () => {
  usePageTitle("adminLogs.loginLogs.title");

  return (
    <SectionGroup>
      <LoginLogTab />
    </SectionGroup>
  );
};
