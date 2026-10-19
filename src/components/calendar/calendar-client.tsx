"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarView } from "./calendar-view";
import { AdminPlanDialog } from "./admin-plan-dialog";
import { DayPlanDetailsDialog } from "./day-plan-details-dialog";
import { ReportDetailDialog } from "@/components/dashboard/report-detail-dialog";
import { fetchReportHistory, fetchTaskTemplates } from "@/lib/api";
import { Role } from "@/types/trading";

import { PageHeader } from "@/components/page-header";

interface CalendarClientProps {
  userId: string;
  role: Role;
}

export function CalendarClient({ userId, role }: CalendarClientProps) {
  const isAdmin = role === "ADMIN";

  // 1. Fetch user reports for performance tags
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["history", userId],
    queryFn: () => fetchReportHistory(userId),
    enabled: Boolean(userId),
  });

  // 2. Fetch task templates for plan highlighting
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTaskTemplates(false),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Rejalar" />

      {/* Calendar Grid */}
      <CalendarView
        reports={reports}
        templates={templates}
        isAdmin={isAdmin}
      />

      {/* Admin Plan Creator Modal */}
      {isAdmin && <AdminPlanDialog />}

      {/* Day Plan Details & Edit Modal */}
      <DayPlanDetailsDialog isAdmin={isAdmin} />

      {/* Detail Modal */}
      <ReportDetailDialog />
    </div>
  );
}
