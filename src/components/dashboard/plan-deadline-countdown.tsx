"use client";

import * as React from "react";
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, parseISO } from "date-fns";
import { AlertCircle, CheckCircle2, Clock, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlanDeadlineCountdownProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  totalTradingDays: number;
  isGoalReached?: boolean;
}

export function PlanDeadlineCountdown({
  startDate,
  endDate,
  totalTradingDays,
  isGoalReached = false,
}: PlanDeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    progressPct: 0,
  });

  React.useEffect(() => {
    const calculateTime = () => {
      try {
        const now = new Date();
        // Deadline is the end of the end date (23:59:59)
        const deadline = parseISO(`${endDate}T23:59:59`);
        const start = parseISO(`${startDate}T00:00:00`);

        const totalDurationMs = deadline.getTime() - start.getTime();
        const elapsedMs = now.getTime() - start.getTime();
        const remainingMs = deadline.getTime() - now.getTime();

        if (remainingMs <= 0) {
          setTimeLeft({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
            progressPct: 100,
          });
          return;
        }

        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
        const seconds = Math.floor((remainingMs / 1000) % 60);

        const progressPct = Math.min(
          Math.max((elapsedMs / totalDurationMs) * 100, 0),
          100,
        );

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
          progressPct,
        });
      } catch {
        // ignore
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const { days, hours, minutes, seconds, isExpired, progressPct } = timeLeft;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-background to-indigo-950/20 p-5 shadow-xs">
      {/* Background soft glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`gap-1.5 px-2.5 py-0.5 text-xs font-semibold ${
                isExpired
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                  : isGoalReached
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                  : "border-purple-500/30 bg-purple-500/10 text-purple-500"
              }`}
            >
              <Clock className="size-3.5" />
              {isExpired ? "Muddat yakunlangan" : isGoalReached ? "Maqsad zabt etildi" : "Deadline vaqti"}
            </Badge>

            <span className="text-xs text-muted-foreground font-medium">
              Deadline: <strong className="text-foreground">{endDate}</strong>
            </span>
          </div>

          <h3 className="text-sm font-medium text-muted-foreground">
            Reja tugashiga qolgan vaqt ({totalTradingDays} savdo kuni doirasida)
          </h3>
        </div>

        {/* Big Countdown Displays */}
        {!isExpired ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Days */}
            <div className="flex min-w-[64px] sm:min-w-[76px] flex-col items-center justify-center rounded-xl border border-purple-500/30 bg-background/80 px-2.5 py-2 backdrop-blur-sm">
              <span className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
                {String(days).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Kun
              </span>
            </div>

            <span className="text-2xl font-bold text-muted-foreground/60">:</span>

            {/* Hours */}
            <div className="flex min-w-[56px] sm:min-w-[68px] flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 px-2.5 py-2 backdrop-blur-sm">
              <span className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
                {String(hours).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Soat
              </span>
            </div>

            <span className="text-2xl font-bold text-muted-foreground/60">:</span>

            {/* Minutes */}
            <div className="flex min-w-[56px] sm:min-w-[68px] flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 px-2.5 py-2 backdrop-blur-sm">
              <span className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
                {String(minutes).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Daqiqa
              </span>
            </div>

            <span className="text-2xl font-bold text-muted-foreground/60">:</span>

            {/* Seconds */}
            <div className="flex min-w-[56px] sm:min-w-[68px] flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 px-2.5 py-2 backdrop-blur-sm">
              <span className="text-xl sm:text-3xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono">
                {String(seconds).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Soniya
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-500">
            <AlertCircle className="size-5 shrink-0" />
            <div className="text-xs font-semibold">
              Reja muddati yakunlangan ({endDate})
            </div>
          </div>
        )}
      </div>

      {/* Progress Line */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Boshlanish: {startDate}</span>
          <span className="font-semibold text-foreground">
            {isExpired ? "100% vaqt tugadi" : `${progressPct.toFixed(0)}% vaqt o'tdi`}
          </span>
          <span>Tugash: {endDate}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/40">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isExpired
                ? "bg-rose-500"
                : isGoalReached
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-purple-600 to-indigo-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
