"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PlanSeriesView } from "./plan-series-view";
import { PlanDeadlineCountdown } from "./plan-deadline-countdown";
import { ReportDetailDialog } from "./report-detail-dialog";
import { fetchReportHistory, fetchTaskTemplates } from "@/lib/api";
import { groupTemplatesIntoPlans } from "@/lib/plan-utils";
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

  // 1. Fetch task templates to construct plan series
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTaskTemplates(false),
  });

  const plans = React.useMemo(() => {
    return groupTemplatesIntoPlans(templates);
  }, [templates]);

  // Selected plan state
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>("");

  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const currentPlan = plans.find((p) => p.isCurrent) || plans[0];
      setSelectedPlanId(currentPlan.id);
    } else if (plans.length > 0 && !plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = React.useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  // 2. Fetch full reports history
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["history", userId, currentYear, currentMonth],
    queryFn: () => fetchReportHistory(userId, currentYear, currentMonth),
    enabled: Boolean(userId),
  });

  const timerSlot = selectedPlan ? (
    <PlanDeadlineCountdown
      startDate={selectedPlan.startDate}
      endDate={selectedPlan.endDate}
    />
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asosiy"
        rightSlot={timerSlot}
        mobileSlot={timerSlot}
      />

      {/* Plan Series View */}
      <PlanSeriesView
        userId={userId}
        role={role}
        plans={plans}
        selectedPlan={selectedPlan}
        selectedPlanId={selectedPlanId}
        onSelectPlanId={setSelectedPlanId}
        templatesLoading={templatesLoading}
        reports={reports}
        reportsLoading={reportsLoading}
      />

      {/* Modal Dialog for Reflection & Proof */}
      <ReportDetailDialog />
    </div>
  );
}
