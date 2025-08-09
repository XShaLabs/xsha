import React from "react";
import { cn } from "@/lib/utils";
import { PageHeader, PageHeaderHeading, PageHeaderDescription, PageHeaderActions } from "./page-header";
import { PageContent } from "./page-content";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  title,
  description,
  actions,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      {(title || description || actions) && (
        <PageHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {title && <PageHeaderHeading>{title}</PageHeaderHeading>}
              {description && (
                <PageHeaderDescription>{description}</PageHeaderDescription>
              )}
            </div>
            {actions && <PageHeaderActions>{actions}</PageHeaderActions>}
          </div>
        </PageHeader>
      )}
      <PageContent className={title || description || actions ? "pt-0" : ""}>
        {children}
      </PageContent>
    </div>
  );
}
