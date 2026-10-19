"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PlanSeriesView } from "./plan-series-view";
import { ReportDetailDialog } from "./report-detail-dialog";
import { fetchReportHistory } from "@/lib/api";
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

  // Fetch full reports history
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["history", userId, currentYear, currentMonth],
    queryFn: () => fetchReportHistory(userId, currentYear, currentMonth),
    enabled: Boolean(userId),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Asosiy" />

      {/* Grouped Plan Series View with Selector, Big Countdown, Line Chart & Reports Table */}
      <PlanSeriesView
        userId={userId}
        role={role}
        reports={reports}
        reportsLoading={reportsLoading}
      />

      {/* Modal Dialog for Reflection & Proof */}
      <ReportDetailDialog />
    </div>
  );
}
