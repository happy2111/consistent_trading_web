"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eachDayOfInterval, format, getDay, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReport, PlanGroup } from "@/types/trading";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface PlanBalanceChartProps {
  plan: PlanGroup;
  reports?: DailyReport[];
}

export function PlanBalanceChart({ plan, reports = [] }: PlanBalanceChartProps) {
  const chartData = React.useMemo(() => {
    try {
      const s = parseISO(plan.startDate);
      const e = parseISO(plan.endDate);
      if (s > e) return [];

      const allDays = eachDayOfInterval({ start: s, end: e });
      const todayStr = new Date().toISOString().split("T")[0];

      // Build map of reports by YYYY-MM-DD
      const reportsByDate = new Map<string, DailyReport>();
      for (const r of reports) {
        const dateKey = r.date.split("T")[0];
        reportsByDate.set(dateKey, r);
      }

      let runningBalance = plan.initialCapital;
      const data: any[] = [];

      // Starting point: Day 0 / Start date initial capital
      data.push({
        date: plan.startDate,
        displayDate: "Boshlanish",
        balance: plan.initialCapital,
        net: 0,
        foyda: 0,
        zarar: 0,
        hasReport: false,
        isFuture: false,
      });

      for (const d of allDays) {
        const dateStr = format(d, "yyyy-MM-dd");
        const dow = getDay(d);
        const converted = dow === 0 ? 7 : dow;

        // Only include trading days that match repeatDays
        if (!plan.repeatDays.includes(converted)) continue;

        const isFuture = dateStr > todayStr;
        const rep = reportsByDate.get(dateStr);

        let net = 0;
        let foyda = 0;
        let zarar = 0;
        let hasReport = false;

        if (rep && rep.status === "COMPLETED") {
          net = Number(rep.netHisob) || 0;
          foyda = Number(rep.totalFoyda) || 0;
          zarar = Number(rep.totalZarar) || 0;
          runningBalance += net;
          hasReport = true;
        }

        data.push({
          date: dateStr,
          displayDate: format(d, "dd-MMM"),
          balance: isFuture && !hasReport ? null : Math.round(runningBalance * 100) / 100,
          net,
          foyda,
          zarar,
          hasReport,
          isFuture,
        });
      }

      return data;
    } catch {
      return [];
    }
  }, [plan, reports]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;
    if (item.balance === null) return null;

    const isAboveCapital = item.balance >= plan.initialCapital;
    const diffFromTarget = Math.max(plan.targetBalance - item.balance, 0);

    return (
      <div className="rounded-xl border bg-background/95 p-3.5 shadow-xl backdrop-blur min-w-[200px] space-y-2">
        <div className="flex items-center justify-between border-b pb-1.5">
          <span className="text-xs font-bold text-foreground">{item.date}</span>
          {item.hasReport ? (
            <Badge className="bg-emerald-500/15 text-emerald-500 text-[10px] px-1.5 py-0">
              Hisobot topshirilgan
            </Badge>
          ) : item.displayDate === "Boshlanish" ? (
            <Badge variant="outline" className="text-[10px]">Boshlang&apos;ich</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Kutilmoqda</Badge>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hisob Balansi:</span>
            <span
              className={`font-black text-sm ${
                isAboveCapital ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              ${item.balance.toLocaleString()}
            </span>
          </div>

          {item.hasReport && (
            <>
              <div className="flex justify-between text-muted-foreground pt-1 border-t border-border/40">
                <span>Kunlik Foyda:</span>
                <span className="font-semibold text-emerald-500">+${item.foyda}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Kunlik Zarar:</span>
                <span className="font-semibold text-rose-500">-${item.zarar}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-border/40">
                <span>Kunlik Net Hisob:</span>
                <span className={item.net >= 0 ? "text-emerald-500" : "text-rose-500"}>
                  {item.net >= 0 ? "+" : ""}${item.net}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            <span>Maqsadga ({plan.targetBalance}):</span>
            <span className="font-semibold text-foreground">
              {diffFromTarget > 0 ? `$${diffFromTarget.toFixed(2)} qoldi` : "Erishildi 🎉"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const minVal = Math.min(
    plan.initialCapital * 0.8,
    ...chartData.filter((d) => d.balance !== null).map((d) => d.balance),
  );
  const maxVal = Math.max(
    plan.targetBalance * 1.1,
    ...chartData.filter((d) => d.balance !== null).map((d) => d.balance),
  );

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2">
        <CardTitle className="text-sm font-bold">
          Balans Dinamikasi
        </CardTitle>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-0.5 text-[11px]">
            <span className="size-2 rounded-full bg-purple-600" />
            <span className="font-medium">Balans</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-0.5 text-[11px]">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="font-medium">Maqsad (${plan.targetBalance.toLocaleString()})</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted/20" />
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[Math.floor(minVal), Math.ceil(maxVal)]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference line for target balance */}
              <ReferenceLine
                y={plan.targetBalance}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Maqsad: $${plan.targetBalance}`,
                  position: "insideTopRight",
                  fill: "#10b981",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              />

              {/* Reference line for initial capital */}
              <ReferenceLine
                y={plan.initialCapital}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: `Depozit: $${plan.initialCapital}`,
                  position: "insideBottomLeft",
                  fill: "#94a3b8",
                  fontSize: 10,
                }}
              />

              {/* Balance Progression Curve */}
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#8c1511"
                strokeWidth={3}
                dot={{ r: 4, fill: "#8c1511", strokeWidth: 1, stroke: "#ffffff" }}
                activeDot={{ r: 6, fill: "#ff7a75" }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
