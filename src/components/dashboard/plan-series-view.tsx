"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Layers,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { fetchTaskTemplates } from "@/lib/api";
import { groupTemplatesIntoPlans } from "@/lib/plan-utils";
import { DailyReport, PlanGroup, Role } from "@/types/trading";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanDeadlineCountdown } from "./plan-deadline-countdown";
import { PlanBalanceChart } from "./plan-balance-chart";
import { HistoryTable } from "./history-table";

interface PlanSeriesViewProps {
  userId: string;
  role: Role;
  reports?: DailyReport[];
  reportsLoading?: boolean;
}

const WEEKDAY_NAMES: Record<number, string> = {
  1: "Du",
  2: "Se",
  3: "Ch",
  4: "Pa",
  5: "Ju",
  6: "Sh",
  7: "Ya",
};

export function PlanSeriesView({
  userId,
  role,
  reports = [],
  reportsLoading = false,
}: PlanSeriesViewProps) {
  // 1. Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTaskTemplates(false),
  });

  // 2. Group into coherent plan series
  const plans = React.useMemo(() => {
    return groupTemplatesIntoPlans(templates);
  }, [templates]);

  // 3. Selected plan state (default to active/current plan or first plan)
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
        isGoalReached: false,
        remainingProfit: 0,
        progressPct: 0,
      };
    }

    const completed = planReports.filter((r) => r.status === "COMPLETED");
    const accumulatedProfit = completed.reduce(
      (sum, r) => sum + (Number(r.netHisob) || 0),
      0,
    );
    const currentBalance = selectedPlan.initialCapital + accumulatedProfit;
    const isGoalReached = currentBalance >= selectedPlan.targetBalance;
    const remainingProfit = Math.max(selectedPlan.targetBalance - currentBalance, 0);

    const progressPct =
      selectedPlan.netProfitTarget > 0
        ? (accumulatedProfit / selectedPlan.netProfitTarget) * 100
        : (currentBalance / selectedPlan.targetBalance) * 100;

    return {
      accumulatedProfit,
      currentBalance,
      completedDaysCount: completed.length,
      isGoalReached,
      remainingProfit,
      progressPct: Math.min(Math.max(progressPct, 0), 100),
    };
  }, [selectedPlan, planReports]);

  if (templatesLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-full rounded-2xl bg-muted/40" />
        <div className="h-32 w-full rounded-2xl bg-muted/40" />
        <div className="h-64 w-full rounded-2xl bg-muted/40" />
      </div>
    );
  }

  // If no plan series exists yet
  if (!selectedPlan || plans.length === 0) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/10 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 mb-3">
          <Layers className="size-6" />
        </div>
        <h3 className="text-base font-bold">Hozirda hech qanday reja yaratilmagan</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Savdo statistikasi va maqsadlar reja asosida yuritiladi. Kalendar sahifasiga o&apos;tib yangi reja yaratishingiz mumkin.
        </p>
        <div className="mt-4">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition-all shadow-xs"
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
    repeatDays,
    initialCapital,
    targetBalance,
    netProfitTarget,
    totalTradingDays,
    isCompleted,
    isCurrent,
  } = selectedPlan;

  const {
    accumulatedProfit,
    currentBalance,
    completedDaysCount,
    isGoalReached,
    remainingProfit,
    progressPct,
  } = planStats;

  const repeatDaysFormatted = repeatDays
    .map((d) => WEEKDAY_NAMES[d] || String(d))
    .join(", ");

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      {/* 1. TOP PLAN SELECTOR & STATUS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600">
            <Layers className="size-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Savdo Rejasi Guruhlari:
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <Select value={selectedPlanId} onValueChange={(val: any) => setSelectedPlanId(val ? String(val) : "")}>
                <SelectTrigger className="h-8 font-bold text-xs sm:text-sm border-purple-500/30 bg-purple-500/5 min-w-[240px]">
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
                      {p.isCompleted && (
                        <span className="ml-2 text-muted-foreground text-[10px]">
                          [Tugagan]
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Plan Status Badges */}
        <div className="flex items-center gap-2">
          {isGoalReached ? (
            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-semibold gap-1">
              <Sparkles className="size-3.5" /> Maqsad zabt etildi!
            </Badge>
          ) : isCurrent ? (
            <Badge className="bg-purple-600/15 text-purple-600 border-purple-500/30 text-xs font-semibold gap-1">
              <Clock className="size-3.5" /> Reja Amalda (Faol)
            </Badge>
          ) : isCompleted ? (
            <Badge variant="secondary" className="text-xs">
              Reja Yakunlangan
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Kutilayotgan Reja
            </Badge>
          )}

          <Badge variant="outline" className="text-xs font-mono font-bold">
            {progressPct.toFixed(0)}%
          </Badge>
        </div>
      </div>

      {/* 2. BIG DEADLINE COUNTDOWN TIMER */}
      <PlanDeadlineCountdown
        startDate={startDate}
        endDate={endDate}
        totalTradingDays={totalTradingDays}
        isGoalReached={isGoalReached}
      />

      {/* 3. PLAN PARAMETERS & PERFORMANCE KPI GRID */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Investitsiya / Boshlang'ich Balans */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Investitsiya
            </span>
            <Wallet className="size-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground">
            ${initialCapital.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Boshlang&apos;ich depozit
          </p>
        </div>

        {/* Maqsadli Balans */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Maqsadli Balans
            </span>
            <Target className="size-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            ${targetBalance.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Sof foyda: +${netProfitTarget.toLocaleString()}
          </p>
        </div>

        {/* Joriy Balans */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Joriy Balans
            </span>
            <CircleDollarSign className="size-3.5 text-indigo-500" />
          </div>
          <div
            className={`text-xl font-bold tracking-tight ${
              currentBalance >= initialCapital ? "text-foreground" : "text-rose-500"
            }`}
          >
            ${currentBalance.toFixed(2)}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {remainingProfit > 0
              ? `$${remainingProfit.toFixed(2)} qoldi`
              : "Maqsad bajarildi!"}
          </p>
        </div>

        {/* Savdo Kunlari & Ish tartibi */}
        <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Savdo Tartibi
            </span>
            <CalendarDays className="size-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground">
            {totalTradingDays} kun
          </div>
          <p className="text-[11px] text-muted-foreground truncate font-medium">
            Ish kunlari: {repeatDaysFormatted}
          </p>
        </div>
      </div>

      {/* 4. LINE CHART (BALANCE TRAJECTORY TOWARDS TARGET) */}
      <PlanBalanceChart plan={selectedPlan} reports={planReports} />

      {/* 5. DAILY REPORTS TABLE FOR THIS PLAN */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <Clock className="size-4 text-purple-600" />
            Kunlik Savdo Hisobotlari ({planReports.length} ta topshirilgan)
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
