"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { MetricCards } from "./metric-cards";
import { PnLChart } from "./pnl-chart";
import { HistoryTable } from "./history-table";
import { ReportDetailDialog } from "./report-detail-dialog";
import { fetchReportHistory, fetchStatistics } from "@/lib/api";
import { Role } from "@/types/trading";

import { PageHeader } from "@/components/page-header";

interface DashboardClientProps {
  userId: string;
  role: Role;
}

export function DashboardClient({ userId, role }: DashboardClientProps) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-12

  // 1. Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["statistics", userId, currentYear, currentMonth],
    queryFn: () => fetchStatistics(userId, currentYear, currentMonth),
    enabled: Boolean(userId),
  });

  // 2. Fetch full reports history
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["history", userId, currentYear, currentMonth],
    queryFn: () => fetchReportHistory(userId, currentYear, currentMonth),
    enabled: Boolean(userId),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Asosiy" />

      {/* 1. KPI Metric Cards */}
      <MetricCards stats={stats} isLoading={statsLoading} />

      {/* 2. Visual Activity & PnL Chart */}
      <PnLChart
        daily={stats?.daily}
        monthName={format(now, "MMMM yyyy")}
      />

      {/* 3. Daily History Table */}
      <HistoryTable reports={reports} isLoading={reportsLoading} />

      {/* Modal Dialog for Reflection & Proof */}
      <ReportDetailDialog />
    </div>
  );
}
