"use client";

import * as React from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarIcon,
  Check,
  Plus,
  Trash2,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import { CreateTaskTemplateDto, FieldType, FillPhase } from "@/types/trading";
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

  // Date range
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const initialDate = adminSelectedDate
    ? format(adminSelectedDate, "yyyy-MM-dd")
    : todayStr;

  const [startDate, setStartDate] = React.useState(initialDate);
  const [endDate, setEndDate] = React.useState(initialDate);

  // Weekdays (Default Monday to Friday: 1,2,3,4,5)
  const [repeatDays, setRepeatDays] = React.useState<number[]>([1, 2, 3, 4, 5]);

  // Limits
  const [maxZarar, setMaxZarar] = React.useState("100");
  const [maxFoyda, setMaxFoyda] = React.useState("300");
  const [maxTrades, setMaxTrades] = React.useState("3");

  // Sessions
  const [londonSession, setLondonSession] = React.useState(true);
  const [newYorkSession, setNewYorkSession] = React.useState(true);

  // Phase
  const [phase, setPhase] = React.useState<FillPhase>("MORNING");

  // Custom fields
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);

  React.useEffect(() => {
    if (adminSelectedDate) {
      const dt = format(adminSelectedDate, "yyyy-MM-dd");
      setStartDate(dt);
      setEndDate(dt);
    }
  }, [adminSelectedDate]);

  const toggleWeekday = (dayId: number) => {
    setRepeatDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort(),
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
      // Create primary limit templates
      const templatesToCreate: CreateTaskTemplateDto[] = [
        {
          title: "Maksimal zarar",
          fieldType: "INT" as FieldType,
          fillPhase: "MORNING" as FillPhase,
          isPrimary: true,
          startDate,
          endDate,
          repeatDays,
          defaultValue: maxZarar,
        },
        {
          title: "Maksimal foyda",
          fieldType: "INT" as FieldType,
          fillPhase: "MORNING" as FillPhase,
          isPrimary: true,
          startDate,
          endDate,
          repeatDays,
          defaultValue: maxFoyda,
        },
        {
          title: "Maksimal trade",
          fieldType: "INT" as FieldType,
          fillPhase: "MORNING" as FillPhase,
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: maxTrades,
        },
        {
          title: "London Session",
          fieldType: "BOOLEAN" as FieldType,
          fillPhase: "MORNING" as FillPhase,
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: String(londonSession),
        },
        {
          title: "New York Session",
          fieldType: "BOOLEAN" as FieldType,
          fillPhase: "MORNING" as FillPhase,
          isPrimary: false,
          startDate,
          endDate,
          repeatDays,
          defaultValue: String(newYorkSession),
        },
      ];

      // Add custom fields (all are plan tasks)
      for (const cf of customFields) {
        if (cf.title.trim()) {
          templatesToCreate.push({
            title: cf.title.trim(),
            fieldType: cf.fieldType,
            fillPhase: "MORNING" as FillPhase,
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
      toast.success("Yangi reja shablonlari muvaffaqiyatli saqlandi!");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["todayReport"] });
      setIsAdminPlanDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Reja yaratishda xatolik yuz berdi");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Boshlanish va tugash sanasini tanlang");
      return;
    }
    if (repeatDays.length === 0) {
      toast.error("Kamida bitta haftaning kunini tanlang");
      return;
    }
    createPlanMutation.mutate();
  };

  return (
    <Dialog open={isAdminPlanDialogOpen} onOpenChange={setIsAdminPlanDialogOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sliders className="size-5 text-purple-600" />
              Yangi Savdo Rejasi Yaratish (Admin Plan)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Maksimal xavf-xatarlar, foyda maqsadlari va kunlik savdo limitlarini
              belgilang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 1. Date Range */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reja davomiyligi (Sana oralig&apos;i)
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Boshlanish sanasi:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Tugash sanasi:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 2. Weekday Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Hafta kunlari (Takrorlanish)
                </Label>
                <span className="text-xs text-muted-foreground">
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
                          ? "border-purple-600 bg-purple-600/15 text-purple-600 shadow-sm"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{day.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 3. Limits Input */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Asosiy Limitlar (Trading Parameters)
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-xs text-rose-500 font-semibold">
                    <TrendingDown className="size-3.5" /> Maksimal zarar ($)
                  </span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={maxZarar}
                    onChange={(e) => setMaxZarar(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
                    <TrendingUp className="size-3.5" /> Maksimal foyda ($)
                  </span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="300"
                    value={maxFoyda}
                    onChange={(e) => setMaxFoyda(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-xs text-indigo-500 font-semibold">
                    <Hash className="size-3.5" /> Maksimal trade soni
                  </span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="3"
                    value={maxTrades}
                    onChange={(e) => setMaxTrades(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 4. Session Toggles */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Savdo Sessiyalari (Sessions)
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                  <div>
                    <p className="text-xs font-semibold">London Session</p>
                    <p className="text-[11px] text-muted-foreground">
                      Ertalabki yevropa sessiyasi
                    </p>
                  </div>
                  <Switch
                    checked={londonSession}
                    onCheckedChange={setLondonSession}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                  <div>
                    <p className="text-xs font-semibold">New York Session</p>
                    <p className="text-[11px] text-muted-foreground">
                      Kechki amerika sessiyasi
                    </p>
                  </div>
                  <Switch
                    checked={newYorkSession}
                    onCheckedChange={setNewYorkSession}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 5. Custom Fields Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Qo&apos;shimcha Maydonlar (Custom Fields)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Ixtiyoriy qoidalar, intizom shartlari yoki vazifalar
                  </p>
                </div>
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

              {customFields.length > 0 && (
                <div className="space-y-2.5">
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center"
                    >
                      <Input
                        placeholder="Maydon nomi (e.g. Risk/Reward)"
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
                          <SelectItem value="INT">Raqam (INT)</SelectItem>
                          <SelectItem value="TEXT">Matn (TEXT)</SelectItem>
                          <SelectItem value="BOOLEAN">Ha/Yo&apos;q (BOOL)</SelectItem>
                          <SelectItem value="IMAGE">Rasm (IMAGE)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdminPlanDialogOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={createPlanMutation.isPending}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              {createPlanMutation.isPending
                ? "Saqlanmoqda..."
                : "Rejani Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
