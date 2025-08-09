import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutGrid,
  Folder,
  Key,
  Container,
  Settings,
  Cog,
  Shield,
  TrendingUp,
  Activity,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();

  const data = {
    navGroups: [
      {
        title: t("navigation.groups.workspace"),
        items: [
          {
            title: t("navigation.dashboard"),
            url: "/dashboard",
            icon: LayoutGrid,
          },
          {
            title: t("navigation.projects"),
            url: "/projects",
            icon: Folder,
          },
          {
            title: t("navigation.gitCredentials"),
            url: "/credentials",
            icon: Key,
          },
          {
            title: t("navigation.environments"),
            url: "/environments",
            icon: Container,
          },
          {
            title: t("navigation.settings"),
            url: "/settings",
            icon: Cog,
          },
        ],
      },
      {
        title: t("navigation.groups.logs"),
        items: [
          {
            title: t("navigation.logs.loginLogs"),
            url: "/logs/login-logs",
            icon: Shield,
          },
          {
            title: t("navigation.logs.operationLogs"),
            url: "/logs/operation-logs",
            icon: Activity,
          },
          {
            title: t("navigation.logs.stats"),
            url: "/logs/stats",
            icon: TrendingUp,
          },
        ],
      },
    ],
    navSecondary: [],
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b py-1 h-14 flex justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Settings className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">XSHA</span>
                  <span className="truncate text-xs">AI Dev Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={data.navGroups} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="border-t">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
