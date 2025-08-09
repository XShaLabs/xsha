import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import {
  Section,
  SectionDescription,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content/section";
import {
  MetricCard,
  MetricCardGroup,
  MetricCardHeader,
  MetricCardTitle,
  MetricCardValue,
} from "@/components/metric/metric-card";
import { DateRangePicker, type DateRange } from "@/components/DateRangePicker";
import type { AdminOperationStatsResponse } from "@/types/admin-logs";

export const AuditStatsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle("adminLogs.stats.title");

  const [stats, setStats] = useState<AdminOperationStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});

  const loadStats = async (params?: { startDate?: Date; endDate?: Date }) => {
    try {
      setLoading(true);
      const apiParams: any = {};

      if (params?.startDate) {
        apiParams.start_time = params.startDate.toISOString().split("T")[0];
      }
      if (params?.endDate) {
        apiParams.end_time = params.endDate.toISOString().split("T")[0];
      }

      const response = await apiService.adminLogs.getOperationStats(apiParams);
      setStats(response);
    } catch (err: any) {
      logError(err, "Failed to load stats");
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
    loadStats(newDateRange);
  };

  const handleDateRangeReset = () => {
    setDateRange({});
    loadStats();
  };

  const getOperationText = (operation: string) => {
    const operationMap = {
      create: t("adminLogs.operationLogs.operations.create"),
      read: t("adminLogs.operationLogs.operations.read"),
      update: t("adminLogs.operationLogs.operations.update"),
      delete: t("adminLogs.operationLogs.operations.delete"),
      login: t("adminLogs.operationLogs.operations.login"),
      logout: t("adminLogs.operationLogs.operations.logout"),
    } as const;
    return operationMap[operation as keyof typeof operationMap] || operation;
  };

  const getTotalOperations = () => {
    if (!stats) return 0;
    return Object.values(stats.operation_stats).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  if (loading) {
    return (
      <SectionGroup>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t("common.loading")}</div>
        </div>
      </SectionGroup>
    );
  }

  if (!stats) {
    return (
      <SectionGroup>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {t("adminLogs.stats.noStatsAvailable")}
          </p>
        </div>
      </SectionGroup>
    );
  }

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{t("adminLogs.stats.title")}</SectionTitle>
          <SectionDescription>
            {t("adminLogs.stats.timeRange")}: {stats.start_time} ~{" "}
            {stats.end_time}
          </SectionDescription>
        </SectionHeader>
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          onReset={handleDateRangeReset}
          placeholder={t("adminLogs.stats.selectDateRange")}
        />
        <MetricCardGroup>
          <MetricCard variant="default">
            <MetricCardHeader>
              <MetricCardTitle>
                {t("adminLogs.stats.totalOperations")}
              </MetricCardTitle>
            </MetricCardHeader>
            <MetricCardValue>{getTotalOperations()}</MetricCardValue>
          </MetricCard>
        </MetricCardGroup>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>{t("adminLogs.stats.operationStats")}</SectionTitle>
          <SectionDescription>
            {t("adminLogs.stats.operationBreakdown")}
          </SectionDescription>
        </SectionHeader>
        <MetricCardGroup>
          {Object.entries(stats.operation_stats).map(([operation, count]) => (
            <MetricCard key={operation} variant="default">
              <MetricCardHeader>
                <MetricCardTitle className="truncate">
                  {getOperationText(operation)}
                </MetricCardTitle>
              </MetricCardHeader>
              <MetricCardValue>{count}</MetricCardValue>
            </MetricCard>
          ))}
        </MetricCardGroup>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>{t("adminLogs.stats.resourceStats")}</SectionTitle>
          <SectionDescription>
            {t("adminLogs.stats.resourceBreakdown")}
          </SectionDescription>
        </SectionHeader>
        <MetricCardGroup>
          {Object.entries(stats.resource_stats).map(([resource, count]) => (
            <MetricCard key={resource} variant="default">
              <MetricCardHeader>
                <MetricCardTitle className="truncate capitalize">
                  {resource}
                </MetricCardTitle>
              </MetricCardHeader>
              <MetricCardValue>{count}</MetricCardValue>
            </MetricCard>
          ))}
        </MetricCardGroup>
      </Section>
    </SectionGroup>
  );
};
