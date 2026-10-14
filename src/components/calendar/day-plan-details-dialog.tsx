"use client";

import * as React from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  DollarSign,
  Edit2,
  Hash,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TaskTemplate } from "@/types/trading";
import { deleteTaskTemplate, updateTaskTemplate } from "@/lib/api";
import { useTradingStore } from "@/lib/store";

interface DayPlanDetailsDialogProps {
  isAdmin?: boolean;
}

export function DayPlanDetailsDialog({ isAdmin = false }: DayPlanDetailsDialogProps) {
  const queryClient = useQueryClient();
  const {
    selectedPlanDate,
    selectedPlanTemplates,
    isPlanDetailsOpen,
    closePlanDetails,
    setIsAdminPlanDialogOpen,
    setAdminSelectedDate,
  } = useTradingStore();

  const [isEditing, setIsEditing] = React.useState(false);
  const [editedValues, setEditedValues] = React.useState<Record<string, string>>({});

  // Reset edited values when dialog opens with templates
  React.useEffect(() => {
    if (selectedPlanTemplates) {
      const initial: Record<string, string> = {};
      selectedPlanTemplates.forEach((t) => {
        initial[t.id] = t.defaultValue || "";
      });
      setEditedValues(initial);
      setIsEditing(false);
    }
  }, [selectedPlanTemplates]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Save changes for all modified templates
      for (const t of selectedPlanTemplates) {
        const newVal = editedValues[t.id];
        if (newVal !== undefined && newVal !== t.defaultValue) {
          await updateTaskTemplate(t.id, {
            defaultValue: newVal,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Reja muvaffaqiyatli yangilandi!");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["todayReport"] });
      setIsEditing(false);
      closePlanDetails();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Rejani yangilashda xatolik yuz berdi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTaskTemplate(id);
    },
    onSuccess: () => {
      toast.success("Shablon o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["todayReport"] });
      closePlanDetails();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "O'chirishda xatolik yuz berdi");
    },
  });

  const handleValueChange = (id: string, val: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleOpenAddMore = () => {
    if (selectedPlanDate) {
      setAdminSelectedDate(selectedPlanDate);
      setIsAdminPlanDialogOpen(true);
    }
    closePlanDetails();
  };

  if (!selectedPlanDate) return null;

  const dateFormatted = format(selectedPlanDate, "dd MMMM yyyy, EEEE");

  return (
    <Dialog open={isPlanDetailsOpen} onOpenChange={(open) => !open && closePlanDetails()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="size-5 text-purple-600" />
              {dateFormatted}
            </DialogTitle>
            <Badge className="bg-purple-600/15 text-purple-600 font-semibold border-purple-500/20">
              Rejali Kun
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Ushbu kunga belgilangan savdo limitlari va vazifalar ro&apos;yxati
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3.5 text-purple-600" /> Rejalar & Vazifalar (Plans & Tasks)
            </h4>
            <Badge variant="outline" className="text-[10px]">
              {selectedPlanTemplates.length} ta vazifa
            </Badge>
          </div>

          {selectedPlanTemplates.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {selectedPlanTemplates.map((t) => {
                const currentVal = editedValues[t.id] ?? (t.defaultValue || "");
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border bg-card p-3 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {t.fieldType}
                      </span>
                    </div>

                    {isEditing && isAdmin ? (
                      t.fieldType === "BOOLEAN" ? (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">Holat:</span>
                          <Switch
                            checked={currentVal === "true"}
                            onCheckedChange={(c) =>
                              handleValueChange(t.id, c ? "true" : "false")
                            }
                          />
                        </div>
                      ) : (
                        <Input
                          type={t.fieldType === "INT" ? "number" : "text"}
                          value={currentVal}
                          onChange={(e) => handleValueChange(t.id, e.target.value)}
                          className="h-8 text-xs"
                        />
                      )
                    ) : (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {t.title.toLowerCase().includes("zarar") ? (
                          <span className="text-sm font-bold text-rose-500">
                            -${currentVal || "0"}
                          </span>
                        ) : t.title.toLowerCase().includes("foyda") ? (
                          <span className="text-sm font-bold text-emerald-500">
                            +${currentVal || "0"}
                          </span>
                        ) : t.fieldType === "BOOLEAN" ? (
                          <Badge
                            variant="secondary"
                            className={
                              currentVal === "true"
                                ? "bg-emerald-500/15 text-emerald-600 font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {currentVal === "true" ? "Ha (Yoqilgan)" : "Yo'q"}
                          </Badge>
                        ) : (
                          <span className="text-sm font-bold text-foreground">
                            {currentVal || "—"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              Reja shablonlari belgilanmagan.
            </p>
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {isAdmin && !isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddMore}
                className="h-8 text-xs gap-1"
              >
                <Sliders className="size-3.5" /> Reja Qo&apos;shish
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            {isAdmin && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="h-8 text-xs"
                    >
                      Bekor qilish
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate()}
                      className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700 shadow-sm"
                    >
                      <Save className="size-3.5" />
                      {updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 gap-1.5 text-xs text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                  >
                    <Edit2 className="size-3.5" /> O&apos;zgartirish
                  </Button>
                )}
              </>
            )}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={closePlanDetails}
              className="h-8 text-xs"
            >
              Yopish
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
