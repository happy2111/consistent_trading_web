"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  format,
  getDay,
  parseISO,
} from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Hash,
  Wallet,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTaskTemplateDto, FieldType } from "@/types/trading";
import { createTaskTemplate } from "@/lib/api";
import { useTradingStore } from "@/lib/store";

const WEEKDAYS = [
  { id: 1, label: "Du", full: "Dushanba" },
  { id: 2, label: "Se", full: "Seshanba" },
  { id: 3, label: "Ch", full: "Chorshanba" },
  { id: 4, label: "Pa", full: "Payshanba" },
  { id: 5, label: "Ju", full: "Juma" },
  { id: 6, label: "Sh", full: "Shanba" },
  { id: 7, label: "Ya", full: "Yakshanba" },
];

const UNITS = ["kun", "oy", "yil"] as const;
type UnitType = (typeof UNITS)[number];

interface CustomField {
  id: string;
  title: string;
  fieldType: FieldType;
  defaultValue: string;
}

export function AdminPlanDialog() {
  const {
    isAdminPlanDialogOpen,
    setIsAdminPlanDialogOpen,
    adminSelectedDate,
  } = useTradingStore();
  const queryClient = useQueryClient();

  // Wizard Step: 1 | 2 | 3 | 4
  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(1);

  // Wheel Picker states: number (1..60) and unit ('kun' | 'oy' | 'yil')
  const [wheelNumber, setWheelNumber] = React.useState<number>(30);
  const [wheelUnit, setWheelUnit] = React.useState<UnitType>("kun");

  // Date range
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const initialDate = adminSelectedDate
    ? format(adminSelectedDate, "yyyy-MM-dd")
    : todayStr;

  const [startDate, setStartDate] = React.useState(initialDate);
  const [endDate, setEndDate] = React.useState(initialDate);

  // Weekdays (Default Monday to Friday: 1, 2, 3, 4, 5)
  const [repeatDays, setRepeatDays] = React.useState<number[]>([1, 2, 3, 4, 5]);

  // Trading Sessions (London & New York)
  const [londonSession, setLondonSession] = React.useState(true);
  const [newYorkSession, setNewYorkSession] = React.useState(true);

  // Limits & Targets
  const [initialCapital, setInitialCapital] = React.useState("400");
  const [targetProfit, setTargetProfit] = React.useState("1000");
  const [maxZarar, setMaxZarar] = React.useState("100");
  const [maxFoyda, setMaxFoyda] = React.useState("300");
  const [maxTrades, setMaxTrades] = React.useState("3");

  // Custom Fields
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);

  // Wheel refs for programmatic scrolling / sync
  const numberScrollRef = React.useRef<HTMLDivElement>(null);
  const unitScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingRef = React.useRef(false);

  React.useEffect(() => {
    if (adminSelectedDate) {
      const dt = format(adminSelectedDate, "yyyy-MM-dd");
      setStartDate(dt);
    }
  }, [adminSelectedDate]);

  // Recalculate endDate dynamically based on startDate, wheelNumber, wheelUnit, AND repeatDays
  React.useEffect(() => {
    try {
      const s = startDate ? parseISO(startDate) : new Date();

      if (wheelUnit === "kun") {
        // wheelNumber represents the number of active TRADING DAYS desired
        // Advance day by day until we match wheelNumber trading days
        if (repeatDays.length > 0) {
          let matched = 0;
          let curr = s;
          let safety = 0;
          while (safety < 3650) {
            const dow = getDay(curr);
            const converted = dow === 0 ? 7 : dow;
            if (repeatDays.includes(converted)) {
              matched++;
              if (matched >= wheelNumber) {
                break;
              }
            }
            curr = addDays(curr, 1);
            safety++;
          }
          setEndDate(format(curr, "yyyy-MM-dd"));
        } else {
          setEndDate(format(addDays(s, Math.max(1, wheelNumber) - 1), "yyyy-MM-dd"));
        }
      } else if (wheelUnit === "oy") {
        const calEnd = addDays(addMonths(s, Math.max(1, wheelNumber)), -1);
        setEndDate(format(calEnd, "yyyy-MM-dd"));
      } else {
        const calEnd = addDays(addYears(s, Math.max(1, wheelNumber)), -1);
        setEndDate(format(calEnd, "yyyy-MM-dd"));
      }
    } catch {
      // ignore
    }
  }, [startDate, wheelNumber, wheelUnit, repeatDays]);

  // Keep wheel scroll centered when value changes externally or initially
  const scrollToNumber = React.useCallback((num: number, smooth = true) => {
    if (!numberScrollRef.current) return;
    const index = num - 1; // 1-based to 0-based
    numberScrollRef.current.scrollTo({
      top: index * 44,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const scrollToUnit = React.useCallback((unit: UnitType, smooth = true) => {
    if (!unitScrollRef.current) return;
    const index = UNITS.indexOf(unit);
    if (index >= 0) {
      unitScrollRef.current.scrollTo({
        top: index * 44,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Center wheels on step 1 open
  React.useEffect(() => {
    if (isAdminPlanDialogOpen && currentStep === 1) {
      const timer = setTimeout(() => {
        scrollToNumber(wheelNumber, false);
        scrollToUnit(wheelUnit, false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAdminPlanDialogOpen, currentStep, scrollToNumber, scrollToUnit, wheelNumber, wheelUnit]);

  // Scroll listener to update value on user dragging / scrolling
  const handleNumberScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / 44);
    const val = Math.min(Math.max(index + 1, 1), 60);
    if (val !== wheelNumber) {
      setWheelNumber(val);
    }
  };

  const handleUnitScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / 44);
    const val = UNITS[Math.min(Math.max(index, 0), UNITS.length - 1)];
    if (val && val !== wheelUnit) {
      setWheelUnit(val);
    }
  };

  // Up/down button helpers for wheels
  const stepNumber = (delta: number) => {
    setWheelNumber((prev) => {
      const next = Math.min(Math.max(prev + delta, 1), 60);
      scrollToNumber(next, true);
      return next;
    });
  };

  const stepUnit = (delta: number) => {
    setWheelUnit((prev) => {
      const curIndex = UNITS.indexOf(prev);
      const nextIndex = Math.min(Math.max(curIndex + delta, 0), UNITS.length - 1);
      const next = UNITS[nextIndex];
      scrollToUnit(next, true);
      return next;
    });
  };

  // Calculate actual trading days
  const tradingDayStats = React.useMemo(() => {
    if (!startDate || !endDate) return { calendarDays: 0, tradingDays: 0 };
    try {
      const s = parseISO(startDate);
      const e = parseISO(endDate);
      if (s > e) return { calendarDays: 0, tradingDays: 0 };

      const days = eachDayOfInterval({ start: s, end: e });
      const totalCal = days.length;

      let tradingCount = 0;
      for (const d of days) {
        const dow = getDay(d);
        const converted = dow === 0 ? 7 : dow;
        if (repeatDays.includes(converted)) {
          tradingCount++;
        }
      }

      return { calendarDays: totalCal, tradingDays: tradingCount };
    } catch {
      return { calendarDays: 0, tradingDays: 0 };
    }
  }, [startDate, endDate, repeatDays]);

  const toggleWeekday = (dayId: number) => {
    setRepeatDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((d) => d !== dayId)
        : [...prev, dayId].sort(),
    );
  };

  const addCustomField = () => {
    setCustomFields((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        title: "",
        fieldType: "TEXT",
        defaultValue: "",
      },
    ]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const planId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

      const templatesToCreate: CreateTaskTemplateDto[] = [
        {
          planId,
          title: "Maksimal zarar",
          fieldType: "NUMBER",
          isPrimary: true,
          startDate,
          endDate,
          repeatDays,
          defaultValue: maxZarar,
        },
        {
          planId,
          title: "Maksimal foyda",
          fieldType: "NUMBER",
          isPrimary: true,
          startDate,
          endDate,
          repeatDays,
          defaultValue: maxFoyda,
        },
        {
          planId,
          title: "Kunlik maksimal trade soni",
          fieldType: "NUMBER",
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: maxTrades,
        },
        {
          planId,
          title: "Depozit",
          fieldType: "NUMBER",
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: initialCapital,
        },
        {
          planId,
          title: "Maqsadli umumiy foyda",
          fieldType: "NUMBER",
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: targetProfit,
        },
        {
          planId,
          title: "London Session",
          fieldType: "BOOLEAN",
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: String(londonSession),
        },
        {
          planId,
          title: "New York Session",
          fieldType: "BOOLEAN",
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: String(newYorkSession),
        },
      ];

      for (const cf of customFields) {
        if (cf.title.trim()) {
          templatesToCreate.push({
            planId,
            title: cf.title.trim(),
            fieldType: cf.fieldType,
            isPrimary: false,
            startDate,
            endDate,
            repeatDays,
            defaultValue: cf.defaultValue || undefined,
          });
        }
      }

      for (const t of templatesToCreate) {
        await createTaskTemplate(t);
      }
    },
    onSuccess: () => {
      toast.success("Reja muvaffaqiyatli saqlandi!");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["todayReport"] });
      setIsAdminPlanDialogOpen(false);
      setCurrentStep(1);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Reja yaratishda xatolik yuz berdi",
      );
    },
  });

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (!startDate) {
        toast.error("Boshlanish sanasini kiriting");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (repeatDays.length === 0) {
        toast.error("Kamida bitta ish kunini tanlang");
        return;
      }
      if (tradingDayStats.tradingDays === 0) {
        toast.error("Ushbu oraliqda hech qanday savdo kuni mavjud emas");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!maxZarar || !maxFoyda) {
        toast.error("Maksimal zarar va foyda limitlarini kiriting");
        return;
      }
      if (!initialCapital || !targetProfit) {
        toast.error("Boshlang'ich depozit va rejadagi yakuniy balansni kiriting");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      createPlanMutation.mutate();
    }
  };

  const numbersArray = Array.from({ length: 60 }, (_, i) => i + 1);

  return (
    <Dialog open={isAdminPlanDialogOpen} onOpenChange={setIsAdminPlanDialogOpen}>
      <DialogContent className="max-h-[92vh] flex flex-col p-0 sm:max-w-lg overflow-hidden border-border/80">
        {/* Full-width Sticky Top Step Progress Line (no shadow) */}
        <div className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur-sm">
          <div className="grid grid-cols-4 h-1.5 w-full bg-muted/40">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full transition-all duration-300 ${
                  currentStep >= step
                    ? "bg-purple-600"
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleNextStep} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* STEP 1: IPHONE NATIVE STYLE WHEEL DATE PICKER */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Boshlanish sanasi
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 text-sm font-medium"
                  required
                />
              </div>

              {/* iPhone Native Wheel Date Picker Container (no shadow) */}
              <div className="space-y-2">
                <div className="relative select-none overflow-hidden rounded-3xl border border-border/80 bg-zinc-950/80 dark:bg-zinc-950 p-3">
                  {/* Subtle Column Separator */}
                  <div className="pointer-events-none absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-border/40" />

                  {/* iOS Native Selection Highlight Lens (no shadow) */}
                  <div className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 h-[44px] rounded-2xl bg-white/[0.08] dark:bg-white/[0.06] border border-white/10 backdrop-blur-md" />

                  {/* Top & Bottom iOS 3D Cylinder Gradient Overlays */}
                  <div className="pointer-events-none absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-zinc-950 via-zinc-950/80 to-transparent z-10" />
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent z-10" />

                  <div className="grid grid-cols-2 gap-2 relative z-20">
                    {/* Wheel Column 1: Numbers (1..60) */}
                    <div className="flex flex-col items-center">
                      {/* Arrow UP */}
                      <button
                        type="button"
                        onClick={() => stepNumber(-1)}
                        className="mb-1 p-1 text-zinc-400 hover:text-white transition-colors active:scale-90"
                        title="Kamaytirish"
                      >
                        <ChevronUp className="size-4" />
                      </button>

                      {/* Drum scroll viewport: 44px * 3 visible items = 132px height, py-44 ensures center alignment */}
                      <div
                        ref={numberScrollRef}
                        onScroll={handleNumberScroll}
                        className="h-[132px] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar py-[44px] text-center"
                      >
                        {numbersArray.map((num) => {
                          const isSelected = wheelNumber === num;
                          return (
                            <div
                              key={num}
                              onClick={() => {
                                setWheelNumber(num);
                                scrollToNumber(num, true);
                              }}
                              className={`h-[44px] flex items-center justify-center snap-center cursor-pointer transition-all duration-150 ${
                                isSelected
                                  ? "text-purple-400 font-extrabold text-2xl scale-110 tracking-tight"
                                  : "text-zinc-500 font-medium text-base hover:text-zinc-300"
                              }`}
                            >
                              {num}
                            </div>
                          );
                        })}
                      </div>

                      {/* Arrow DOWN */}
                      <button
                        type="button"
                        onClick={() => stepNumber(1)}
                        className="mt-1 p-1 text-zinc-400 hover:text-white transition-colors active:scale-90"
                        title="Oshirish"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>

                    {/* Wheel Column 2: Units ('kun' | 'oy' | 'yil') */}
                    <div className="flex flex-col items-center">
                      {/* Arrow UP */}
                      <button
                        type="button"
                        onClick={() => stepUnit(-1)}
                        className="mb-1 p-1 text-zinc-400 hover:text-white transition-colors active:scale-90"
                        title="Oldingisi"
                      >
                        <ChevronUp className="size-4" />
                      </button>

                      {/* Drum scroll viewport for units */}
                      <div
                        ref={unitScrollRef}
                        onScroll={handleUnitScroll}
                        className="h-[132px] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth no-scrollbar py-[44px] text-center"
                      >
                        {UNITS.map((unit) => {
                          const isSelected = wheelUnit === unit;
                          return (
                            <div
                              key={unit}
                              onClick={() => {
                                setWheelUnit(unit);
                                scrollToUnit(unit, true);
                              }}
                              className={`h-[44px] flex items-center justify-center snap-center cursor-pointer uppercase transition-all duration-150 ${
                                isSelected
                                  ? "text-purple-400 font-extrabold text-2xl scale-110 tracking-wider"
                                  : "text-zinc-500 font-medium text-base hover:text-zinc-300"
                              }`}
                            >
                              {unit}
                            </div>
                          );
                        })}
                      </div>

                      {/* Arrow DOWN */}
                      <button
                        type="button"
                        onClick={() => stepUnit(1)}
                        className="mt-1 p-1 text-zinc-400 hover:text-white transition-colors active:scale-90"
                        title="Keyingisi"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: WORK DAYS, SESSIONS & DYNAMIC TUGASH SANASI */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Weekday Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Haftaning ish kunlari
                  </Label>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {repeatDays.length} kun tanlangan
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isSelected = repeatDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleWeekday(day.id)}
                        className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-purple-600 bg-purple-600/15 text-purple-600 ring-1 ring-purple-600/30"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{day.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sessions (only London and New York, no times) */}
              <div className="space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sessiyalar
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3.5">
                    <span className="text-xs font-semibold">London Session</span>
                    <Switch checked={londonSession} onCheckedChange={setLondonSession} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3.5">
                    <span className="text-xs font-semibold">New York Session</span>
                    <Switch checked={newYorkSession} onCheckedChange={setNewYorkSession} />
                  </div>
                </div>
              </div>

              {/* Tugash sanasi & Savdo kunlari - SHOWN HERE AFTER CHOOSING WORK DAYS */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Reja tugash sanasi:</span>
                  <span className="font-bold text-foreground text-sm">
                    {endDate}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-purple-500/20">
                  <span className="text-muted-foreground font-medium">Faol savdo kunlari:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {tradingDayStats.tradingDays} ta savdo kuni
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REJA MAQSADI, DEPOZIT VA KUNLIK LIMITLAR */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* 1. Boshlang'ich depozit va Maqsadli yakuniy balans */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Target className="size-3.5 text-purple-600" />
                  Depozit va Rejadagi Yakuniy Maqsad
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Boshlang'ich depozit (Balans) */}
                  <div className="space-y-1.5 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Wallet className="size-3.5 text-purple-600" />
                      Boshlang&apos;ich depozit ($)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={initialCapital}
                      onChange={(e) => setInitialCapital(e.target.value)}
                      placeholder="400"
                      className="h-10 text-sm font-bold bg-background/80"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Ajratilgan savdo depoziti (masalan: $400)
                    </p>
                  </div>

                  {/* Rejadagi yakuniy balans maqsadi */}
                  <div className="space-y-1.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="size-3.5" />
                      Rejadagi yakuniy balans maqsadi ($)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={targetProfit}
                      onChange={(e) => setTargetProfit(e.target.value)}
                      placeholder="1000"
                      className="h-10 text-sm font-bold bg-background/80"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Kutilayotgan yakuniy balans (masalan: $1000)
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Reja natijasi va hisob-kitob kartasi */}
              {(() => {
                const cap = parseFloat(initialCapital) || 0;
                const target = parseFloat(targetProfit) || 0;
                // Target balance is the target itself (e.g. $1000), deposit is accounted inside it!
                const totalTarget = target > 0 ? target : cap;
                const netProfitNeeded = Math.max(totalTarget - cap, 0);
                const days = tradingDayStats.tradingDays || 1;
                const dailyAvg = (netProfitNeeded / days).toFixed(2);
                const roi = cap > 0 ? ((netProfitNeeded / cap) * 100).toFixed(0) : 0;

                return (
                  <div className="rounded-2xl border bg-muted/30 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground font-medium">
                      <span>Savdo davri:</span>
                      <span className="font-semibold text-foreground">{days} ta savdo kuni</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground font-medium">
                      <span>Kutilayotgan yakuniy balans:</span>
                      <span className="font-bold text-foreground text-sm">
                        ${totalTarget.toLocaleString()}{" "}
                        {netProfitNeeded > 0 && (
                          <span className="text-[11px] text-emerald-500 font-semibold">(+{roi}%)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground font-medium">
                      <span>Rejadagi sof foyda (o&apos;sish):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +${netProfitNeeded.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60 text-muted-foreground font-medium">
                      <span>Kunlik o&apos;rtacha foyda maqsadi:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +${dailyAvg} / kun
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Kunlik savdo limitlari */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Kunlik savdo limitlari (Daily Limits)
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Maksimal zarar */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                      <TrendingDown className="size-3.5" />
                      Kunlik max zarar ($)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={maxZarar}
                      onChange={(e) => setMaxZarar(e.target.value)}
                      placeholder="100"
                      required
                    />
                  </div>

                  {/* Maksimal foyda */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                      <TrendingUp className="size-3.5" />
                      Kunlik max foyda ($)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={maxFoyda}
                      onChange={(e) => setMaxFoyda(e.target.value)}
                      placeholder="300"
                      required
                    />
                  </div>

                  {/* Kunlik maksimal trade soni */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1 text-xs font-semibold text-indigo-500">
                      <Hash className="size-3.5" />
                      Kunlik max trade
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={maxTrades}
                      onChange={(e) => setMaxTrades(e.target.value)}
                      placeholder="3"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: QO'SHIMCHA MAYDONLAR */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Qo&apos;shimcha maydonlar
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="size-3.5" /> Maydon qo&apos;shish
                </Button>
              </div>

              {customFields.length === 0 ? (
                <div className="flex h-28 items-center justify-center rounded-xl border border-dashed bg-muted/10 text-xs text-muted-foreground">
                  Qo&apos;shimcha maydonlar qo&apos;shilmagan (Ixtiyoriy).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-2.5 sm:flex-row sm:items-center"
                    >
                      <Input
                        placeholder="Maydon nomi"
                        value={field.title}
                        onChange={(e) =>
                          updateCustomField(field.id, { title: e.target.value })
                        }
                        className="h-8 flex-1 text-xs"
                      />
                      <Select
                        value={field.fieldType}
                        onValueChange={(val) =>
                          updateCustomField(field.id, {
                            fieldType: val as FieldType,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NUMBER">Raqam (NUMBER)</SelectItem>
                          <SelectItem value="TEXT">Matn (TEXT)</SelectItem>
                          <SelectItem value="BOOLEAN">Ha/Yo&apos;q (BOOL)</SelectItem>
                          <SelectItem value="IMAGE">Rasm (IMAGE)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 shrink-0"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hidden submit trigger */}
          <button type="submit" className="hidden" />
        </form>

        {/* Sticky Footer */}
        <div className="border-t bg-card px-6 py-3.5 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep((prev) => (prev - 1) as any);
              } else {
                setIsAdminPlanDialogOpen(false);
              }
            }}
          >
            {currentStep > 1 ? (
              <>
                <ChevronLeft className="size-4 mr-1" /> Ortga
              </>
            ) : (
              "Bekor qilish"
            )}
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNextStep}
              className="bg-purple-600 text-white hover:bg-purple-700 font-semibold"
            >
              Keyingisi <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={createPlanMutation.isPending}
              onClick={handleNextStep}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold"
            >
              {createPlanMutation.isPending ? "Saqlanmoqda..." : "Rejani Saqlash"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
