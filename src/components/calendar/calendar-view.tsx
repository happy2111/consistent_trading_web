"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyReport, TaskTemplate } from "@/types/trading";
import { useTradingStore } from "@/lib/store";
import { parseDecimal } from "@/lib/utils";

interface CalendarViewProps {
  reports?: DailyReport[];
  templates?: TaskTemplate[];
  isAdmin?: boolean;
}

const WEEKDAYS = ["Dush", "Sesh", "Chor", "Pay", "Juma", "Shan", "Yak"];

export function CalendarView({
  reports = [],
  templates = [],
  isAdmin = false,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const {
    setIsAdminPlanDialogOpen,
    setAdminSelectedDate,
    setSelectedReport,
  } = useTradingStore();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Map reports by date 'YYYY-MM-DD'
  const reportsByDate = React.useMemo(() => {
    const map = new Map<string, DailyReport>();
    for (const r of reports) {
      if (r.date) {
        const key = format(new Date(r.date), "yyyy-MM-dd");
        map.set(key, r);
      }
    }
    return map;
  }, [reports]);

  const getActiveTemplatesForDay = (date: Date): TaskTemplate[] => {
    const dayOfWeek = getDay(date);
    const convertedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const dateStr = format(date, "yyyy-MM-dd");

    return templates.filter((t) => {
      const start = t.startDate ? format(new Date(t.startDate), "yyyy-MM-dd") : "";
      const end = t.endDate ? format(new Date(t.endDate), "yyyy-MM-dd") : "";
      const isInRange = dateStr >= start && dateStr <= end;
      const repeats = t.repeatDays?.includes(convertedDay) ?? true;
      return isInRange && repeats;
    });
  };

  const isPlanActiveForDay = (date: Date) => {
    return getActiveTemplatesForDay(date).length > 0;
  };

  const handleDayClick = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const existingReport = reportsByDate.get(key);

    if (existingReport) {
      setSelectedReport(existingReport);
      return;
    }

    const dayTemplates = getActiveTemplatesForDay(date);
    if (dayTemplates.length > 0) {
      // Open Plan Details for reading & editing
      const { openPlanDetails } = useTradingStore.getState();
      openPlanDetails(date, dayTemplates);
    } else if (isAdmin) {
      setAdminSelectedDate(date);
      setIsAdminPlanDialogOpen(true);
    }
  };

  const handleOpenCreatePlan = () => {
    setAdminSelectedDate(new Date());
    setIsAdminPlanDialogOpen(true);
  };

  // Calculate starting blank columns (Mon=0, Tue=1, ... Sun=6)
  const startDay = getDay(monthStart);
  const leadingBlankDays = (startDay + 6) % 7;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-600/10 p-2 text-purple-600 shrink-0">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg font-bold">
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Intizom va savdo natijalari taqvimi
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-semibold px-2"
              onClick={() => setCurrentMonth(new Date())}
            >
              Bugun
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              onClick={handleOpenCreatePlan}
              className="h-8 gap-1.5 bg-purple-600 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
            >
              <Plus className="size-3.5" /> <span className="hidden sm:inline">Yangi Reja Yaratish</span><span className="sm:hidden">Reja</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-6">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[11px] sm:text-xs font-semibold text-muted-foreground mb-1.5 sm:mb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              <span className="sm:hidden">{w.slice(0, 2)}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {/* Leading blank slots */}
          {Array.from({ length: leadingBlankDays }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[58px] sm:min-h-[96px] rounded-lg sm:rounded-xl border border-transparent bg-muted/10 p-1 sm:p-2 opacity-30"
            />
          ))}

          {/* Days */}
          {daysInMonth.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const report = reportsByDate.get(dateStr);
            const hasActivePlan = isPlanActiveForDay(day);
            const today = isToday(day);
            let statusBg = "";
            let statusTextColor = "";
            if (report) {
              if (report.status === "COMPLETED") {
                const net = parseDecimal(report.netHisob);
                if (net >= 0) {
                  statusBg = "bg-emerald-500 text-white font-bold";
                  statusTextColor = "text-emerald-500";
                } else {
                  statusBg = "bg-rose-500 text-white font-bold";
                  statusTextColor = "text-rose-500";
                }
              } else if (report.status === "MISSED") {
                statusBg = "bg-muted-foreground/30 text-foreground font-semibold";
              } else {
                statusBg = "bg-amber-500 text-white font-bold";
              }
            } else if (hasActivePlan) {
              statusBg = "bg-purple-600/20 text-purple-600 dark:text-purple-400 font-semibold ring-1 ring-purple-600/50";
            }

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`group relative flex min-h-[52px] sm:min-h-[96px] flex-col items-center sm:items-stretch justify-center sm:justify-between rounded-xl border p-1 sm:p-2 text-center sm:text-left transition-all hover:border-foreground/30 hover:shadow-md cursor-pointer ${
                  today
                    ? "border-purple-600/60 bg-purple-600/5 ring-1 ring-purple-600/40"
                    : "border-border/60 bg-card hover:bg-muted/40"
                }`}
              >
                {/* Header / Main Number */}
                <div className="flex w-full items-center justify-center sm:justify-between">
                  <span
                    className={`flex size-8 sm:size-6 items-center justify-center rounded-full text-sm sm:text-xs font-bold transition-transform ${
                      today
                        ? "bg-purple-600 text-white shadow-sm"
                        : statusBg
                        ? `${statusBg} sm:bg-transparent sm:text-foreground sm:ring-0 group-hover:text-purple-600`
                        : "text-foreground group-hover:text-purple-600"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Desktop Plan dot indicator */}
                  {hasActivePlan && (
                    <span
                      title="Ushbu kunga reja belgilangan"
                      className="hidden sm:inline-block size-1.5 rounded-full bg-purple-600"
                    />
                  )}
                </div>

                {/* Performance Tags: Shown on tablet / desktop only, on mobile circle color defines status */}
                <div className="hidden sm:block mt-auto pt-1 space-y-1">
                  {report ? (
                    report.status === "COMPLETED" ? (
                      (() => {
                        const netHisob = parseDecimal(report.netHisob);
                        return (
                          <div
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              netHisob >= 0
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{report.dayResult || "WIN"}</span>
                              <span>
                                {netHisob >= 0 ? "+" : ""}
                                ${netHisob.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })()
                    ) : report.status === "MISSED" ? (
                      <div className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground text-center truncate">
                        MISSED
                      </div>
                    ) : (
                      <div className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 text-center truncate">
                        PENDING
                      </div>
                    )
                  ) : hasActivePlan ? (
                    <div className="rounded border border-dashed border-purple-500/30 px-1 py-0.5 text-[9px] font-medium text-purple-600/80 text-center truncate">
                      Rejali kun
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-purple-600" />
            <span>Faol Reja</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span>WIN (Foydali kun)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500" />
            <span>STOP LOSS (Zarar)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/60" />
            <span>MISSED (O&apos;tkazib yuborilgan)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
