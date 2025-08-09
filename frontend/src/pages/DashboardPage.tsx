import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardStats, RecentTask } from "@/lib/api/dashboard";
import {
  SectionGroup,
  Section,
  SectionHeader,
  SectionHeaderRow,
  SectionTitle,
  SectionDescription,
  EmptyStateContainer,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/content";
import {
  MetricCard,
  MetricCardGroup,
  MetricCardHeader,
  MetricCardTitle,
  MetricCardValue,
} from "@/components/metric";
import {
  Folder,
  Key,
  Container,
  Activity,
  Plus,
  Clock,
  Loader2,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle("common.pageTitle.dashboard");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [statsData, tasksData] = await Promise.all([
          dashboardApi.getDashboardStats(),
          dashboardApi.getRecentTasks(5)
        ]);
        
        setStats(statsData);
        setRecentTasks(tasksData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const metrics = stats ? [
    {
      title: t("dashboard.metrics.totalProjects"),
      value: stats.total_projects.toString(),
      href: ROUTES.projects,
      variant: "default" as const,
      icon: Folder,
      clickable: true,
    },
    {
      title: t("dashboard.metrics.activeEnvironments"),
      value: stats.active_environments.toString(),
      href: "/environments",
      variant: "default" as const,
      icon: Container,
      clickable: true,
    },
    {
      title: t("dashboard.metrics.gitCredentials"),
      value: stats.git_credentials.toString(),
      href: ROUTES.gitCredentials,
      variant: "default" as const,
      icon: Key,
      clickable: true,
    },
    {
      title: t("dashboard.metrics.recentTasks"),
      value: stats.recent_tasks.toString(),
      href: "/tasks",
      variant: "default" as const,
      icon: Activity,
      clickable: false,
    },
  ] : [];

  const quickActions = [
    {
      title: t("dashboard.quickActions.newProject"),
      description: t("dashboard.quickActions.newProjectDesc"),
      icon: Folder,
      action: () => navigate("/projects/create"),
    },
    {
      title: t("dashboard.quickActions.newEnvironment"),
      description: t("dashboard.quickActions.newEnvironmentDesc"),
      icon: Container,
      action: () => navigate("/environments/create"),
    },
    {
      title: t("dashboard.quickActions.addCredential"),
      description: t("dashboard.quickActions.addCredentialDesc"),
      icon: Key,
      action: () => navigate("/credentials/create"),
    },
  ];

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("dashboard.title")}</SectionTitle>
          <SectionDescription>
            {t("dashboard.welcome")}, {user}! {t("dashboard.description")}
          </SectionDescription>
        </SectionHeader>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2">{t("common.loading")}</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        ) : (
          <MetricCardGroup>
            {metrics.map((metric) => (
              metric.clickable ? (
                <Link to={metric.href} key={metric.title}>
                  <MetricCard variant={metric.variant}>
                    <MetricCardHeader className="flex justify-between items-center gap-2">
                      <MetricCardTitle className="truncate">
                        {metric.title}
                      </MetricCardTitle>
                      <metric.icon className="size-4" />
                    </MetricCardHeader>
                    <MetricCardValue>{metric.value}</MetricCardValue>
                  </MetricCard>
                </Link>
              ) : (
                <MetricCard key={metric.title} variant={metric.variant}>
                  <MetricCardHeader className="flex justify-between items-center gap-2">
                    <MetricCardTitle className="truncate">
                      {metric.title}
                    </MetricCardTitle>
                    <metric.icon className="size-4" />
                  </MetricCardHeader>
                  <MetricCardValue>{metric.value}</MetricCardValue>
                </MetricCard>
              )
            ))}
          </MetricCardGroup>
        )}
      </Section>

      <Section>
        <SectionHeaderRow>
          <SectionHeader>
            <SectionTitle>{t("dashboard.quickActions.title")}</SectionTitle>
            <SectionDescription>
              {t("dashboard.quickActions.description")}
            </SectionDescription>
          </SectionHeader>
        </SectionHeaderRow>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <div
              key={action.title}
              className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={action.action}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <action.icon className="size-4 text-primary" />
                </div>
                <h3 className="font-medium">{action.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {action.description}
              </p>
              <Button size="sm" variant="outline" className="w-full">
                <Plus className="size-4 mr-2" />
                {t("common.create")}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeaderRow>
          <SectionHeader>
            <SectionTitle>{t("dashboard.recentTask.title")}</SectionTitle>
            <SectionDescription>
              {t("dashboard.recentTask.description")}
            </SectionDescription>
          </SectionHeader>

        </SectionHeaderRow>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="size-6 animate-spin" />
            <span className="ml-2">{t("common.loading")}</span>
          </div>
        ) : recentTasks.length > 0 ? (
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium truncate">{task.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    task.status === 'done' ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    task.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {task.project?.name || `Project ID: ${task.project_id}`}
                </p>
                <div className="text-xs text-muted-foreground">
                  {t("common.created")} {new Date(task.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateContainer className="min-h-[200px]">
            <Clock className="size-8 text-muted-foreground mb-2" />
            <EmptyStateTitle>{t("dashboard.recentTask.empty")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("dashboard.recentTask.emptyDesc")}
            </EmptyStateDescription>
          </EmptyStateContainer>
        )}
      </Section>


    </SectionGroup>
  );
};
