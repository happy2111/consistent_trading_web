"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval,
  getDay,
  parseISO,
} from "date-fns";
import {
  Calendar,
  CircleDollarSign,
  Clock,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchTaskTemplates } from "@/lib/api";
import { DailyReport, TaskTemplate } from "@/types/trading";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PlanProgressCardProps {
  reports?: DailyReport[];
}

export function PlanProgressCard({ reports = [] }: PlanProgressCardProps) {
  // Fetch active templates to retrieve current plan parameters
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTaskTemplates(false),
  });

  // Extract capital and target profit templates
  const planInfo = React.useMemo(() => {
    if (!templates.length) return null;

    // Look for initial capital template
    const capitalTpl = templates.find((t) => {
      const title = t.title.toLowerCase();
      return (
        title.includes("kapital") ||
        title.includes("investitsiya") ||
        title.includes("boshlang'ich") ||
        title.includes("boshlangich")
      );
    });

    // Look for target profit template
    const targetTpl = templates.find((t) => {
      const title = t.title.toLowerCase();
      return (
        title.includes("maqsadli") ||
        (title.includes("umumiy") && title.includes("foyda")) ||
        title.includes("rejadagi")
      );
    });

    // Fallback: any primary or standard template with date interval
    const anchorTpl = capitalTpl || targetTpl || templates.find((t) => t.isPrimary) || templates[0];
    if (!anchorTpl || !anchorTpl.startDate || !anchorTpl.endDate) return null;

    const startDate = anchorTpl.startDate.split("T")[0];
    const endDate = anchorTpl.endDate.split("T")[0];
    const repeatDays = anchorTpl.repeatDays?.length ? anchorTpl.repeatDays : [1, 2, 3, 4, 5];

    const initialCapital = capitalTpl?.defaultValue
      ? parseFloat(capitalTpl.defaultValue) || 400
      : 400;

    const targetProfit = targetTpl?.defaultValue
      ? parseFloat(targetTpl.defaultValue) || 1000
      : 1000;

    // Calculate total scheduled trading days in the plan interval
    let totalTradingDays = 0;
    try {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      if (s <= e) {
        const days = eachDayOfInterval({ start: s, end: e });
        for (const d of days) {
          const dow = getDay(d);
          const converted = dow === 0 ? 7 : dow;
          if (repeatDays.includes(converted)) {
            totalTradingDays++;
          }
        }
      }
    } catch {
      totalTradingDays = 20;
    }

    if (totalTradingDays === 0) totalTradingDays = 20;

    return {
      startDate,
      endDate,
      repeatDays,
      initialCapital,
      targetProfit,
      targetBalance: initialCapital + targetProfit,
      totalTradingDays,
    };
  }, [templates]);

  if (templatesLoading) {
    return (
      <Card className="animate-pulse bg-muted/40 border-border/60">
        <CardHeader className="h-20" />
        <CardContent className="h-28" />
      </Card>
    );
  }

  if (!planInfo) {
    return null;
  }

  const {
    startDate,
    endDate,
    initialCapital,
    targetProfit,
    targetBalance,
    totalTradingDays,
  } = planInfo;

  // Filter completed reports that fall within the plan date range
  const completedReports = reports.filter((r) => {
    if (r.status !== "COMPLETED") return false;
    const rDate = r.date.split("T")[0];
    return rDate >= startDate && rDate <= endDate;
  });

  // Calculate cumulative profit from submitted reports (hisob)
  const accumulatedProfit = completedReports.reduce(
    (sum, r) => sum + (Number(r.netHisob) || 0),
    0,
  );

  const currentBalance = initialCapital + accumulatedProfit;
  const progressPct =
    targetProfit > 0 ? (accumulatedProfit / targetProfit) * 100 : 0;
  const clampedProgress = Math.min(Math.max(progressPct, 0), 100);
  const remainingProfit = Math.max(targetProfit - accumulatedProfit, 0);
  const completedDaysCount = completedReports.length;
  const remainingDaysCount = Math.max(totalTradingDays - completedDaysCount, 0);

  const isProfit = accumulatedProfit >= 0;
  const isGoalReached = accumulatedProfit >= targetProfit;

  return (
    <Card className="relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-card via-card to-purple-500/5 shadow-xs">
      {/* Decorative top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-500" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-600/20">
              <Target className="size-5" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                Faol Savdo Rejasi & Maqsad
                {isGoalReached && (
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-semibold gap-1">
                    <Sparkles className="size-3" /> Maqsad zabt etildi!
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Calendar className="size-3 text-purple-500" />
                <span>
                  {startDate} — {endDate}
                </span>
                <span>•</span>
                <Clock className="size-3 text-muted-foreground" />
                <span>{totalTradingDays} ta savdo kuni</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-1 ${
                isGoalReached
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : isProfit
                  ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-500"
              }`}
            >
              {progressPct >= 0 ? "+" : ""}
              {progressPct.toFixed(1)}% bajarildi
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1 pb-4">
        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* 1. Boshlang'ich Investitsiya */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Investitsiya
              </span>
              <Wallet className="size-3.5 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              ${initialCapital.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Boshlang&apos;ich balans
            </p>
          </div>

          {/* 2. Rejadagi Umumiy Foyda */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Reja Maqsadi
              </span>
              <Target className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              +${targetProfit.toLocaleString()}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Kutilayotgan yakuniy: ${targetBalance.toLocaleString()}
            </p>
          </div>

          {/* 3. To'plangan Net Hisob */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                To&apos;plangan Foyda
              </span>
              {isProfit ? (
                <TrendingUp className="size-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="size-3.5 text-rose-500" />
              )}
            </div>
            <div
              className={`text-lg sm:text-xl font-bold tracking-tight ${
                isProfit
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-500"
              }`}
            >
              {accumulatedProfit >= 0 ? "+" : ""}
              ${accumulatedProfit.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Hisobotlar orqali to&apos;planmoqda
            </p>
          </div>

          {/* 4. Joriy Balans */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                Joriy Balans
              </span>
              <CircleDollarSign className="size-3.5 text-indigo-500" />
            </div>
            <div
              className={`text-lg sm:text-xl font-bold tracking-tight ${
                currentBalance >= initialCapital
                  ? "text-foreground"
                  : "text-rose-500"
              }`}
            >
              ${currentBalance.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {remainingProfit > 0
                ? `$${remainingProfit.toFixed(2)} maqsadga qoldi`
                : "Maqsad bajarildi!"}
            </p>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <span>Foyda maqsadi:</span>
              <span className="font-bold text-foreground">
                ${accumulatedProfit > 0 ? accumulatedProfit.toFixed(2) : "0.00"} / ${targetProfit.toLocaleString()}
              </span>
            </span>
            <span className="font-semibold text-muted-foreground">
              {completedDaysCount} / {totalTradingDays} savdo kuni ({remainingDaysCount} kun qoldi)
            </span>
          </div>

          {/* Progress bar line */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isGoalReached
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : isProfit
                  ? "bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
