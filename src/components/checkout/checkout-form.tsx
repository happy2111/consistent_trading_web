"use client";

import * as React from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Hash,
  ImagePlus,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  fetchTodayReport,
  submitDailyReport,
  uploadProofFile,
} from "@/lib/api";
import { TaskValue } from "@/types/trading";

interface CheckoutFormProps {
  userId: string;
}

export function CheckoutForm({ userId }: CheckoutFormProps) {
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ["todayReport", userId],
    queryFn: () => fetchTodayReport(userId),
    enabled: Boolean(userId),
  });

  // Primary form states
  const [factFoyda, setFactFoyda] = React.useState("");
  const [factZarar, setFactZarar] = React.useState("");
  const [factTrades, setFactTrades] = React.useState("");
  const [extraProfit, setExtraProfit] = React.useState("");
  const [reflection, setReflection] = React.useState("");
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = React.useState<string>("");
  const [isUploadingProof, setIsUploadingProof] = React.useState(false);

  // Dynamic custom values state: mapping templateId -> value
  const [customValues, setCustomValues] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Unified custom fields and limits
  const { customFieldsList, limits } = React.useMemo(() => {
    if (!report?.values) {
      return {
        customFieldsList: [] as TaskValue[],
        limits: { maxZarar: 0, maxFoyda: 0, maxTrades: 0, hasLimits: false },
      };
    }

    let maxZ = 0;
    let maxF = 0;
    let maxT = 0;
    let foundLimits = false;

    const customList: TaskValue[] = [];

    for (const v of report.values) {
      const title = v.template?.title?.toLowerCase() || "";

      // Extract limits if primary/standard
      if (title.includes("maksimal zarar")) {
        const val = parseInt(v.value || v.template?.defaultValue || "0", 10);
        if (!isNaN(val) && val > 0) {
          maxZ = val;
          foundLimits = true;
        }
      } else if (title.includes("maksimal foyda")) {
        const val = parseInt(v.value || v.template?.defaultValue || "0", 10);
        if (!isNaN(val) && val > 0) {
          maxF = val;
          foundLimits = true;
        }
      } else if (title.includes("maksimal trade")) {
        const val = parseInt(v.value || v.template?.defaultValue || "0", 10);
        if (!isNaN(val) && val > 0) {
          maxT = val;
          foundLimits = true;
        }
      }

      // Check if it's a built-in field handled by dedicated UI inputs
      // Only qo'shimcha foyda/profit is a builtin — other qo'shimcha fields (malumot, maydon) are custom
      const isQoshimchaProfit =
        (title.includes("qo'shimcha") || title.includes("qoshimcha")) &&
        (title.includes("foyda") || title.includes("profit"));

      const isBuiltinField =
        title.includes("maksimal zarar") ||
        title.includes("maksimal foyda") ||
        title.includes("maksimal trade") ||
        title.includes("boshlang'ich kapital") ||
        title.includes("boshlangich kapital") ||
        title.includes("kapital") ||
        title.includes("investitsiya") ||
        title.includes("maqsadli umumiy foyda") ||
        title.includes("rejadagi umumiy foyda") ||
        title.includes("maqsadli foyda") ||
        (title.includes("foyda") && !title.includes("qo'shimcha") && !title.includes("qoshimcha")) ||
        (title.includes("zarar") && !title.includes("maksimal")) ||
        title.includes("fact trade") ||
        title.includes("faktik trade") ||
        (title.includes("trade soni") && !title.includes("maksimal")) ||
        isQoshimchaProfit ||
        title.includes("tahlil") ||
        title.includes("reflection") ||
        title.includes("rasm") ||
        title.includes("proof");

      if (!isBuiltinField) {
        customList.push(v);
      }
    }

    return {
      customFieldsList: customList,
      limits: {
        maxZarar: maxZ,
        maxFoyda: maxF,
        maxTrades: maxT,
        hasLimits: foundLimits,
      },
    };
  }, [report]);

  // Initialize values when report loads
  React.useEffect(() => {
    if (!report?.values) return;

    const initialCustoms: Record<string, string> = {};

    for (const v of report.values) {
      const title = v.template?.title?.toLowerCase() || "";
      const val = v.value || v.template?.defaultValue || "";

      if (
        title.includes("foyda") &&
        !title.includes("qo'shimcha") &&
        !title.includes("qoshimcha") &&
        !title.includes("maksimal") &&
        !title.includes("maqsadli") &&
        !title.includes("umumiy")
      ) {
        if (v.value && !factFoyda) setFactFoyda(v.value);
      } else if (title.includes("zarar") && !title.includes("maksimal")) {
        if (v.value && !factZarar) setFactZarar(v.value);
      } else if (title.includes("fact trade") || title.includes("faktik trade") || (title.includes("trade soni") && !title.includes("maksimal"))) {
        if (v.value && !factTrades) setFactTrades(v.value);
      } else if ((title.includes("qo'shimcha") || title.includes("qoshimcha") || title.includes("extra")) && (title.includes("foyda") || title.includes("profit"))) {
        if (v.value && !extraProfit) setExtraProfit(v.value);
      } else if (title.includes("tahlil") || title.includes("reflection") || v.template?.fieldType === "TEXT") {
        if (v.value && !reflection) setReflection(v.value);
      } else if (v.template?.fieldType === "IMAGE" || title.includes("rasm") || title.includes("proof")) {
        if (v.value && !proofPreviewUrl) setProofPreviewUrl(v.value);
      }

      if (v.templateId) {
        initialCustoms[v.templateId] = val;
      }
    }

    setCustomValues((prev) => ({ ...initialCustoms, ...prev }));
  }, [report]);

  const handleCustomChange = (templateId: string, value: string) => {
    setCustomValues((prev) => ({
      ...prev,
      [templateId]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Faqat rasm fayllari (JPG, PNG, WEBP) qabul qilinadi");
      return;
    }

    setProofFile(file);
    const localUrl = URL.createObjectURL(file);
    setProofPreviewUrl(localUrl);
    toast.success("Skrinshot tanlandi");
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!report) throw new Error("Hisobot topilmadi");

      let uploadedUrl = proofPreviewUrl;

      // 1. Upload file if newly selected
      if (proofFile) {
        setIsUploadingProof(true);
        try {
          uploadedUrl = await uploadProofFile(proofFile);
        } catch {
          toast.warning("Serverga yuklashda xatolik, rasm saqlanmadi");
        } finally {
          setIsUploadingProof(false);
        }
      }

      // 2. Prepare submit payload matching task values
      const valuesToSubmit = report.values.map((v) => {
        const title = v.template?.title?.toLowerCase() || "";
        let val = customValues[v.templateId] ?? (v.value || "");

        if (title.includes("foyda") && !title.includes("qo'shimcha") && !title.includes("qoshimcha") && !title.includes("maksimal")) {
          val = factFoyda;
        } else if (title.includes("zarar") && !title.includes("maksimal")) {
          val = factZarar;
        } else if (title.includes("fact trade") || title.includes("faktik trade") || (title.includes("trade soni") && !title.includes("maksimal"))) {
          val = factTrades;
        } else if ((title.includes("qo'shimcha") || title.includes("qoshimcha") || title.includes("extra")) && (title.includes("foyda") || title.includes("profit"))) {
          val = extraProfit;
        } else if (title.includes("tahlil") || title.includes("reflection") || (v.template?.fieldType === "TEXT" && !customValues[v.templateId])) {
          val = reflection;
        } else if (v.template?.fieldType === "IMAGE" || title.includes("rasm") || title.includes("proof")) {
          val = uploadedUrl;
        }

        return {
          templateId: v.templateId,
          value: val,
        };
      });

      return submitDailyReport({
        reportId: report.id,
        values: valuesToSubmit,
        totalFoyda: factFoyda ? parseFloat(factFoyda) || 0 : 0,
        totalZarar: factZarar ? parseFloat(factZarar) || 0 : 0,
        finalize: true,
      });
    },
    onSuccess: () => {
      toast.success("Kunlik hisobot muvaffaqiyatli topshirildi!");
      queryClient.invalidateQueries({ queryKey: ["todayReport"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Hisobotni topshirishda xatolik yuz berdi");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!factFoyda.trim() && !factZarar.trim()) {
      toast.error("Fact Foyda yoki Fact Zarar qiymatini kiriting");
      return;
    }

    if (!proofPreviewUrl && !proofFile) {
      toast.error("Savdo natijasi skrinshotini (proof photo) yuklash majburiy!");
      return;
    }

    submitMutation.mutate();
  };

  const isCompleted = report?.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 1. Current Plan Card */}
      <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold">
                Bugungi Savdo Rejasi & Limitlar
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {format(new Date(), "dd MMMM yyyy")}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Ushbu limitlarga qat&apos;iy amal qilish shart
            </CardDescription>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-24 rounded-full" />
          ) : isCompleted ? (
            <Badge className="bg-emerald-600 text-white font-semibold">
              <CheckCircle2 className="mr-1 size-3.5" /> Topshirilgan
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Maksimal Zarar */}
            <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
                <ArrowDownRight className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Maksimal Zarar</p>
                {isLoading ? (
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-8 rounded" />
                    <span className="text-sm font-bold text-rose-500/40 animate-pulse">-$100</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-rose-500">
                    {limits.hasLimits || limits.maxZarar > 0 ? `-$${limits.maxZarar}` : "Belgilanmagan"}
                  </p>
                )}
              </div>
            </div>

            {/* Maksimal Foyda */}
            <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                <ArrowUpRight className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Maksimal Foyda</p>
                {isLoading ? (
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-8 rounded" />
                    <span className="text-sm font-bold text-emerald-500/40 animate-pulse">+$500</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-emerald-500">
                    {limits.hasLimits || limits.maxFoyda > 0 ? `+$${limits.maxFoyda}` : "Belgilanmagan"}
                  </p>
                )}
              </div>
            </div>

            {/* Max Savdolar */}
            <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
                <Hash className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Max Savdolar (Trades)</p>
                {isLoading ? (
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-5 w-8 rounded" />
                    <span className="text-sm font-bold text-foreground/40 animate-pulse">3 ta</span>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-foreground">
                    {limits.hasLimits || limits.maxTrades > 0 ? `${limits.maxTrades} ta` : "Belgilanmagan"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reja Ma'lumotlari (Plan Details) */}
          {isLoading ? (
            <div className="pt-2">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : customFieldsList.length > 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Kunlik Reja Ma&apos;lumotlari (Plan Details):</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {customFieldsList.map((v) => (
                  <div key={v.id || v.templateId} className="rounded-lg border bg-card/60 px-2.5 py-1.5 text-xs">
                    <span className="text-[11px] text-muted-foreground block truncate">
                      {v.template?.title}
                    </span>
                    <span className="font-semibold text-foreground">
                      {v.template?.fieldType === "BOOLEAN"
                        ? v.value === "true" || v.template?.defaultValue === "true"
                          ? "Ha (Yoqilgan)"
                          : "Yo'q"
                        : v.value || v.template?.defaultValue || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 2. Evening Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Kechki Savdo Natijalari (Evening Checkout)
            </CardTitle>
            <CardDescription className="text-xs">
              Bugungi savdo faktlari, foyda, zarar va tahlilingizni kiriting
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                {/* Numeric inputs */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="factFoyda" className="text-xs font-semibold text-emerald-500">
                      Fact Foyda ($)
                    </Label>
                    <Input
                      id="factFoyda"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={factFoyda}
                      onChange={(e) => setFactFoyda(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="factZarar" className="text-xs font-semibold text-rose-500">
                      Fact Zarar ($)
                    </Label>
                    <Input
                      id="factZarar"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={factZarar}
                      onChange={(e) => setFactZarar(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="factTrades" className="text-xs font-semibold text-indigo-500">
                      Fact Trade soni
                    </Label>
                    <Input
                      id="factTrades"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={factTrades}
                      onChange={(e) => setFactTrades(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="extraProfit" className="text-xs font-semibold text-muted-foreground">
                      Qo&apos;shimcha Profit ($)
                    </Label>
                    <Input
                      id="extraProfit"
                      type="number"
                      placeholder="0"
                      value={extraProfit}
                      onChange={(e) => setExtraProfit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Dinamik Qo'shimcha Maydonlar */}
                {customFieldsList.length > 0 && (
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="size-3.5 text-indigo-500" />
                      <span>Qo&apos;shimcha Maydonlar (Custom Fields)</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {customFieldsList.map((field) => {
                        const templateId = field.templateId;
                        const template = field.template;
                        const currentVal = customValues[templateId] ?? (field.value || "");

                        if (template?.fieldType === "BOOLEAN") {
                          const checked = currentVal === "true";
                          return (
                            <div
                              key={templateId}
                              className="flex items-center justify-between rounded-lg border bg-card p-3"
                            >
                              <Label htmlFor={`custom-${templateId}`} className="text-xs font-medium cursor-pointer">
                                {template.title}
                              </Label>
                              <Switch
                                id={`custom-${templateId}`}
                                checked={checked}
                                onCheckedChange={(val) =>
                                  handleCustomChange(templateId, val ? "true" : "false")
                                }
                              />
                            </div>
                          );
                        }

                        if (template?.fieldType === "NUMBER" || (template?.fieldType as string) === "INT") {
                          return (
                            <div key={templateId} className="space-y-1.5">
                              <Label htmlFor={`custom-${templateId}`} className="text-xs font-medium">
                                {template.title}
                              </Label>
                              <Input
                                id={`custom-${templateId}`}
                                type="number"
                                step="any"
                                placeholder={template.defaultValue || "0.00"}
                                value={currentVal}
                                onChange={(e) => handleCustomChange(templateId, e.target.value)}
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={templateId} className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor={`custom-${templateId}`} className="text-xs font-medium">
                              {template?.title}
                            </Label>
                            <Input
                              id={`custom-${templateId}`}
                              type="text"
                              placeholder={template?.defaultValue || "Kiriting..."}
                              value={currentVal}
                              onChange={(e) => handleCustomChange(templateId, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Reflection Textarea */}
                <div className="space-y-1.5">
                  <Label htmlFor="reflection" className="flex items-center gap-1.5 text-xs font-semibold">
                    <FileText className="size-3.5 text-muted-foreground" /> Kun yakuniy tahlil (Reflection)
                  </Label>
                  <Textarea
                    id="reflection"
                    rows={4}
                    placeholder="Bugun nima yaxshi bo'ldi? Qaysi xatolarga yo'l qo'yildi? Rejaga amal qilindimi? Psixologik holat qanday edi?"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>

                <Separator />

                {/* Mandatory Proof Photo Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <ImagePlus className="size-3.5" /> Savdo Isboti (Proof Photo / Skrinshot) *
                    </Label>
                    <span className="text-[11px] text-rose-500 font-medium">Majburiy</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {proofPreviewUrl ? (
                    <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofPreviewUrl}
                        alt="Proof preview"
                        className="max-h-60 w-full rounded-lg object-contain"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="truncate text-xs text-muted-foreground">
                          {proofFile?.name || "Yuklangan rasm"}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 gap-1 text-xs"
                        >
                          <RefreshCw className="size-3" /> Rasmni almashtirish
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center transition-colors hover:bg-muted/40"
                    >
                      <div className="rounded-full bg-muted p-3 text-muted-foreground">
                        <Upload className="size-5" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold">Skrinshotni yuklang</span>
                        <p className="text-xs text-muted-foreground">
                          Terminal yoki hisob natijasi (JPG, PNG, WEBP)
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading || submitMutation.isPending || isUploadingProof}
            className="w-full sm:w-auto bg-emerald-600 px-8 text-white hover:bg-emerald-700 shadow-md"
          >
            {submitMutation.isPending || isUploadingProof ? (
              "Yuborilmoqda..."
            ) : (
              <span className="flex items-center gap-2">
                <Send className="size-4" /> Hisobotni topshirish
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
