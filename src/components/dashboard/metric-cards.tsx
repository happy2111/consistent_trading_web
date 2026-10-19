"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Percent,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Statistics } from "@/types/trading";
import { parseDecimal } from "@/lib/utils";

interface MetricCardsProps {
  stats?: Statistics | null;
  isLoading?: boolean;
}

export function MetricCards({ stats, isLoading }: MetricCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse bg-muted/40">
            <CardHeader className="h-16" />
            <CardContent className="h-16" />
          </Card>
        ))}
      </div>
    );
  }

  const umumiyFoyda = parseDecimal(stats.umumiyFoyda);
  const umumiyZarar = parseDecimal(stats.umumiyZarar);
  const umumiyHisob = parseDecimal(stats.umumiyHisob);
  const {
    winRate,
    winCount,
    stopLossCount,
    breakevenCount,
    riskViolations,
  } = stats;

  // Badge/Indicator logic:
  // 🟢 Green if Balance >= $1000
  // 🟡 Yellow if 800 <= Balance < $1000
  // 🔴 Red if Balance < $400
  let balanceBadgeColor = "bg-muted text-muted-foreground";
  let balanceStatusText = "Normal";

  if (umumiyHisob >= 1000) {
    balanceBadgeColor = "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    balanceStatusText = "A'lo (>= $1000)";
  } else if (umumiyHisob >= 800 && umumiyHisob < 1000) {
    balanceBadgeColor = "bg-amber-500/15 text-amber-500 border-amber-500/30";
    balanceStatusText = "Ehtiyotkorlik ($800–$1000)";
  } else if (umumiyHisob < 400) {
    balanceBadgeColor = "bg-rose-500/15 text-rose-500 border-rose-500/30";
    balanceStatusText = "Xavf ostida (< $400)";
  }

  const formatCurrency = (amount: number) => {
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return `${sign}$${Math.abs(amount).toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Umumiy Foyda */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Umumiy Foyda
          </CardTitle>
          <div className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-500">
            <ArrowUpRight className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-emerald-500">
            {formatCurrency(umumiyFoyda)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {winCount} ta muvaffaqiyatli savdo kuni
          </p>
        </CardContent>
      </Card>

      {/* 2. Umumiy Zarar */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Umumiy Zarar
          </CardTitle>
          <div className="rounded-full bg-rose-500/10 p-1.5 text-rose-500">
            <ArrowDownRight className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-rose-500">
            {formatCurrency(umumiyZarar > 0 ? -umumiyZarar : 0)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stopLossCount} ta Stop-Loss kuni
          </p>
        </CardContent>
      </Card>

      {/* 3. Net Balance (Hisob) with Indicator */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Net Hisob (Balance)
          </CardTitle>
          <div className="rounded-full bg-blue-500/10 p-1.5 text-blue-500">
            <Wallet className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between gap-2">
            <div
              className={`text-2xl font-bold tracking-tight ${
                umumiyHisob >= 0 ? "text-foreground" : "text-rose-500"
              }`}
            >
              {formatCurrency(umumiyHisob)}
            </div>
            <Badge variant="outline" className={`text-[10px] font-semibold ${balanceBadgeColor}`}>
              {balanceStatusText}
            </Badge>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Foyda - Zarar ayirmasi</span>
            {riskViolations > 0 && (
              <span className="flex items-center gap-1 font-medium text-rose-500">
                <AlertTriangle className="size-3" /> {riskViolations} ta risk buzilishi
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Win Rate % */}
      <Card className="border-border/60 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Win Rate %
          </CardTitle>
          <div className="rounded-full bg-indigo-500/10 p-1.5 text-indigo-500">
            <Percent className="size-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {winRate}%
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-emerald-500 font-medium">{winCount}W</span>
            <span>/</span>
            <span className="text-rose-500 font-medium">{stopLossCount}L</span>
            <span>/</span>
            <span className="text-muted-foreground">{breakevenCount}BE</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
