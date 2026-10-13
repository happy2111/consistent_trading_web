"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySummary } from "@/types/trading";

interface PnLChartProps {
  daily?: DailySummary[];
  monthName?: string;
}

export function PnLChart({ daily = [], monthName = "Joriy oy" }: PnLChartProps) {
  const chartData = daily.map((d) => {
    const dayNumber = d.date.split("-")[2];
    return {
      day: dayNumber,
      fullDate: d.date,
      hisob: d.hisob,
      foyda: d.foyda,
      zarar: d.zarar,
      status: d.status,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const isProfit = data.hisob >= 0;

    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur">
        <p className="text-xs font-semibold text-muted-foreground">{data.fullDate}</p>
        <div className="mt-1.5 space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Foyda:</span>
            <span className="font-semibold text-emerald-500">+${data.foyda}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Zarar:</span>
            <span className="font-semibold text-rose-500">-${data.zarar}</span>
          </div>
          <div className="border-t pt-1 flex justify-between gap-4 font-bold">
            <span>Net:</span>
            <span className={isProfit ? "text-emerald-500" : "text-rose-500"}>
              {data.hisob >= 0 ? `+$${data.hisob}` : `-$${Math.abs(data.hisob)}`}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">
            Kunlik PnL Dinamikasi
          </CardTitle>
          <CardDescription className="text-xs">
            {monthName} kunlik sof foyda va zarar taqsimoti
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" /> Foyda
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500" /> Zarar
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Ushbu oy uchun hali savdo hisobotlari kiritilmagan.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <ReferenceLine y={0} stroke="#888888" strokeOpacity={0.4} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hisob" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hisob >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
