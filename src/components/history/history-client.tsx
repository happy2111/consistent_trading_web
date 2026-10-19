"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { HistoryTable } from "@/components/dashboard/history-table";
import { ReportDetailDialog } from "@/components/dashboard/report-detail-dialog";
import { fetchReportHistory } from "@/lib/api";

import { PageHeader } from "@/components/page-header";

interface HistoryClientProps {
  userId: string;
}

export function HistoryClient({ userId }: HistoryClientProps) {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["history", userId],
    queryFn: () => fetchReportHistory(userId),
    enabled: Boolean(userId),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Hisobotlar" />

      <HistoryTable reports={reports} isLoading={isLoading} />
      <ReportDetailDialog />
    </div>
  );
}
