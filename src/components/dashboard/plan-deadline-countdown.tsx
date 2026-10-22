"use client";

import * as React from "react";
import { parseISO } from "date-fns";
import { AlertCircle } from "lucide-react";

interface PlanDeadlineCountdownProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export function PlanDeadlineCountdown({
  startDate,
  endDate,
}: PlanDeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  React.useEffect(() => {
    const calculateTime = () => {
      try {
        const now = new Date();
        const deadline = parseISO(`${endDate}T23:59:59`);
        const remainingMs = deadline.getTime() - now.getTime();

        if (remainingMs <= 0) {
          setTimeLeft({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isExpired: true,
          });
          return;
        }

        const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
        const seconds = Math.floor((remainingMs / 1000) % 60);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
        });
      } catch {
        // ignore
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const { days, hours, minutes, seconds, isExpired } = timeLeft;

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5 bg-transparent text-xs font-semibold text-rose-500">
        <AlertCircle className="size-3.5" />
        <span>Tugagan ({endDate})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 font-mono select-none bg-transparent">
      {/* Days */}
      <div className="flex flex-col items-center justify-center bg-transparent px-1 py-0.5 min-w-[30px] sm:min-w-[34px]">
        <span className="text-xs sm:text-sm font-black text-foreground leading-tight">
          {String(days).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#ff7a75]">
          kun
        </span>
      </div>

      <span className="text-xs sm:text-sm font-bold text-muted-foreground/60">:</span>

      {/* Hours */}
      <div className="flex flex-col items-center justify-center bg-transparent px-1 py-0.5 min-w-[28px] sm:min-w-[32px]">
        <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">
          {String(hours).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          soat
        </span>
      </div>

      <span className="text-xs sm:text-sm font-bold text-muted-foreground/60">:</span>

      {/* Minutes */}
      <div className="flex flex-col items-center justify-center bg-transparent px-1 py-0.5 min-w-[28px] sm:min-w-[32px]">
        <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">
          {String(minutes).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          daq
        </span>
      </div>

      <span className="text-xs sm:text-sm font-bold text-muted-foreground/60">:</span>

      {/* Seconds */}
      <div className="flex flex-col items-center justify-center bg-transparent px-1 py-0.5 min-w-[28px] sm:min-w-[32px]">
        <span className="text-xs sm:text-sm font-bold text-[#ff7a75] leading-tight">
          {String(seconds).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          son
        </span>
      </div>
    </div>
  );
}
