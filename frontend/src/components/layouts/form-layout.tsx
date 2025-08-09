import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FormLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

export function FormLayout({
  children,
  title,
  description,
  className,
  maxWidth = "xl",
}: FormLayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className={cn("w-full", maxWidthClasses[maxWidth], className)}>
        <Card>
          {(title || description) && (
            <CardHeader>
              {title && <CardTitle>{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent className={title || description ? "pt-0" : ""}>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
