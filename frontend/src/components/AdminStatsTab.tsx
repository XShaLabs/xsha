import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiService } from "@/lib/api/index";
import { logError } from "@/lib/errors";
import { formatDateToLocal } from "@/lib/utils";
import {
  Section,
  SectionDescription,
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

export const AdminStatsTab: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminOperationStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});

  const loadStats = async (params?: { startDate?: Date; endDate?: Date }) => {
    try {
      setLoading(true);
      const apiParams: any = {};
      
      if (params?.startDate) {
        apiParams.start_time = formatDateToLocal(params.startDate);
      }
      if (params?.endDate) {
        apiParams.end_time = formatDateToLocal(params.endDate);
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

  const getOperationVariant = (operation: string) => {
    const variantMap = {
      create: "success" as const,
      read: "default" as const,
      update: "warning" as const,
      delete: "destructive" as const,
      login: "default" as const,
      logout: "ghost" as const,
    };
    return variantMap[operation as keyof typeof variantMap] || "default";
  };

  const getTotalOperations = () => {
    if (!stats) return 0;
    return Object.values(stats.operation_stats).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t("adminLogs.stats.noStatsAvailable")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section>
        <SectionHeader>
          <SectionTitle>{t("adminLogs.stats.title")}</SectionTitle>
          <SectionDescription>
            {t("adminLogs.stats.timeRange")}: {stats.start_time} ~ {stats.end_time}
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
              <MetricCardTitle>{t("adminLogs.stats.totalOperations")}</MetricCardTitle>
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
            <MetricCard key={operation} variant={getOperationVariant(operation)}>
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
    </div>
  );
};
