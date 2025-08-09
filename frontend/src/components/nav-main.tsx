import { Link, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function NavMain({
  groups,
}: {
  groups: NavGroup[];
}) {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const isActive = (itemUrl: string) => {
    if (itemUrl === "/projects") {
      return location.pathname.startsWith("/projects");
    }
    if (itemUrl === "/credentials") {
      return location.pathname.startsWith("/credentials");
    }
    if (itemUrl === "/environments") {
      return location.pathname.startsWith("/environments");
    }

    if (itemUrl === "/logs") {
      return location.pathname.startsWith("/logs");
    }
    if (itemUrl === "/settings") {
      return location.pathname.startsWith("/settings");
    }
    return location.pathname === itemUrl;
  };

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isActive(item.url)}
                >
                  <Link to={item.url} onClick={() => setOpenMobile(false)}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
