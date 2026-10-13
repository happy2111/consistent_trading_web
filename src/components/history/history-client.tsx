"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { HistoryTable } from "@/components/dashboard/history-table";
import { ReportDetailDialog } from "@/components/dashboard/report-detail-dialog";
import { fetchReportHistory } from "@/lib/api";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Savdo Tarixi & Hisobotlar
        </h1>
        <p className="text-xs text-muted-foreground">
          Barcha oylardagi kunlik hisobotlar, tahlillar va isbot skrinshotlari
        </p>
      </div>

      <HistoryTable reports={reports} isLoading={isLoading} />
      <ReportDetailDialog />
    </div>
  );
}
