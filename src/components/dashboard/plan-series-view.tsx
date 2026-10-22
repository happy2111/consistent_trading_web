"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { DailyReport, PlanGroup, Role } from "@/types/trading";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanBalanceChart } from "./plan-balance-chart";
import { HistoryTable } from "./history-table";

interface PlanSeriesViewProps {
  userId: string;
  role: Role;
  plans: PlanGroup[];
  selectedPlan: PlanGroup | null;
  selectedPlanId: string;
  onSelectPlanId: (id: string) => void;
  templatesLoading?: boolean;
  reports?: DailyReport[];
  reportsLoading?: boolean;
}

export function PlanSeriesView({
  userId,
  role,
  plans = [],
  selectedPlan,
  selectedPlanId,
  onSelectPlanId,
  templatesLoading = false,
  reports = [],
  reportsLoading = false,
}: PlanSeriesViewProps) {
  // Filter completed reports that fall within selected plan date interval
  const planReports = React.useMemo(() => {
    if (!selectedPlan) return [];
    return reports.filter((r) => {
      const rDate = r.date.split("T")[0];
      return rDate >= selectedPlan.startDate && rDate <= selectedPlan.endDate;
    });
  }, [reports, selectedPlan]);

  // Calculate cumulative profit & balance for selected plan
  const planStats = React.useMemo(() => {
    if (!selectedPlan) {
      return {
        accumulatedProfit: 0,
        currentBalance: 0,
        completedDaysCount: 0,
        remainingProfit: 0,
      };
    }

    const completed = planReports.filter((r) => r.status === "COMPLETED");
    const accumulatedProfit = completed.reduce(
      (sum, r) => sum + (Number(r.netHisob) || 0),
      0,
    );
    const currentBalance = selectedPlan.initialCapital + accumulatedProfit;
    const remainingProfit = Math.max(selectedPlan.targetBalance - currentBalance, 0);

    return {
      accumulatedProfit,
      currentBalance,
      completedDaysCount: completed.length,
      remainingProfit,
    };
  }, [selectedPlan, planReports]);

  if (templatesLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-48 rounded-xl bg-muted/40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-20 rounded-xl bg-muted/40" />
          <div className="h-20 rounded-xl bg-muted/40" />
          <div className="h-20 rounded-xl bg-muted/40" />
          <div className="h-20 rounded-xl bg-muted/40" />
        </div>
        <div className="h-64 rounded-xl bg-muted/40" />
      </div>
    );
  }

  // If no plan series exists yet
  if (!selectedPlan || plans.length === 0) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/10 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#8c1511]/15 text-[#ff7a75] mb-3">
          <Layers className="size-6" />
        </div>
        <h3 className="text-base font-bold">Hozirda hech qanday reja yaratilmagan</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Savdo statistikasi reja asosida yuritiladi. Kalendar sahifasiga o&apos;tib yangi reja yaratishingiz mumkin.
        </p>
        <div className="mt-4">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#8c1511] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#a31914] transition-all shadow-md shadow-[#8c1511]/30"
          >
            <Plus className="size-3.5" /> Reja Yaratish
          </Link>
        </div>
      </Card>
    );
  }

  const {
    startDate,
    endDate,
    initialCapital,
    targetBalance,
    totalTradingDays,
  } = selectedPlan;

  const { currentBalance } = planStats;

  return (
    <div className="space-y-5">
      {/* 1. CLEAN SELECTOR ONLY */}
      <div className="flex items-center justify-between">
        <Select
          value={selectedPlanId}
          onValueChange={(val: any) => onSelectPlanId(val ? String(val) : "")}
        >
          <SelectTrigger className="h-9 w-full sm:w-[260px] font-semibold text-xs sm:text-sm border-border bg-card">
            <SelectValue placeholder="Rejani tanlang" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                <span className="font-semibold">{p.title}</span>
                {p.isCurrent && (
                  <span className="ml-2 text-emerald-500 font-bold text-[10px]">
                    [Faol]
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. PLAN STATISTIC BLOCKS (CLEAN, NO UNNECESSARY ICONS, UNIFIED "DEPOZIT" TERM) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Depozit */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Depozit
          </span>
          <div className="text-xl font-bold tracking-tight text-foreground">
            ${initialCapital.toLocaleString()}
          </div>
        </div>

        {/* Maqsadli Balans */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Maqsadli Balans
          </span>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            ${targetBalance.toLocaleString()}
          </div>
        </div>

        {/* Joriy Balans */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Joriy Balans
          </span>
          <div
            className={`text-xl font-bold tracking-tight ${
              currentBalance >= initialCapital ? "text-foreground" : "text-rose-500"
            }`}
          >
            ${currentBalance.toFixed(2)}
          </div>
        </div>

        {/* Savdo Kunlari */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Savdo Kunlari
          </span>
          <div className="text-xl font-bold tracking-tight text-foreground">
            {totalTradingDays} kun
          </div>
        </div>
      </div>

      {/* 3. LINE CHART */}
      <PlanBalanceChart plan={selectedPlan} reports={planReports} />

      {/* 4. DAILY REPORTS TABLE FOR THIS PLAN */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight">
            Kunlik Savdo Hisobotlari
          </h3>
          <span className="text-xs text-muted-foreground font-medium">
            {startDate} — {endDate}
          </span>
        </div>
        <HistoryTable reports={planReports} isLoading={reportsLoading} />
      </div>
    </div>
  );
}
