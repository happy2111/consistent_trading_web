"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DailyReport } from "@/types/trading";
import { useTradingStore } from "@/lib/store";

export function ReportDetailDialog() {
  const { selectedReport, isReportSheetOpen, setIsReportSheetOpen } =
    useTradingStore();

  if (!selectedReport) return null;

  const dateFormatted = selectedReport.date
    ? format(new Date(selectedReport.date), "dd MMMM yyyy, EEEE")
    : "";

  // Extract reflection text from evening values
  const reflectionValue = selectedReport.values?.find(
    (v) =>
      v.template?.fieldType === "TEXT" ||
      v.template?.title.toLowerCase().includes("tahlil") ||
      v.template?.title.toLowerCase().includes("reflection") ||
      v.template?.title.toLowerCase().includes("xulosa"),
  )?.value;

  // Extract proof image from values
  const proofImageUrl = selectedReport.values?.find(
    (v) =>
      v.template?.fieldType === "IMAGE" ||
      v.template?.title.toLowerCase().includes("rasm") ||
      v.template?.title.toLowerCase().includes("proof") ||
      v.template?.title.toLowerCase().includes("skrinshot") ||
      (v.value && (v.value.startsWith("http") || v.value.startsWith("data:image"))),
  )?.value;

  // Other numeric and boolean values
  const otherValues = selectedReport.values?.filter(
    (v) => v.value !== reflectionValue && v.value !== proofImageUrl,
  );

  return (
    <Dialog open={isReportSheetOpen} onOpenChange={setIsReportSheetOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Calendar className="size-5 text-muted-foreground" />
              {dateFormatted}
            </DialogTitle>
            <Badge
              variant={
                selectedReport.dayResult === "WIN"
                  ? "default"
                  : selectedReport.dayResult === "STOP_LOSS"
                  ? "destructive"
                  : "secondary"
              }
              className={
                selectedReport.dayResult === "WIN"
                  ? "bg-emerald-600 text-white"
                  : ""
              }
            >
              {selectedReport.dayResult || selectedReport.status}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Kunlik hisobot tafsilotlari, fotosurat va tahlil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Summary Banner */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/40 p-3 text-center">
            <div>
              <p className="text-[11px] text-muted-foreground">Foyda</p>
              <p className="text-sm font-bold text-emerald-500">
                +${selectedReport.totalFoyda}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Zarar</p>
              <p className="text-sm font-bold text-rose-500">
                -${selectedReport.totalZarar}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Net Hisob</p>
              <p
                className={`text-sm font-bold ${
                  selectedReport.netHisob >= 0
                    ? "text-emerald-500"
                    : "text-rose-500"
                }`}
              >
                {selectedReport.netHisob >= 0 ? "+" : ""}
                ${selectedReport.netHisob}
              </p>
            </div>
          </div>

          {/* Risk violation alert */}
          {selectedReport.isRiskViolated && (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                <strong>Diqqat:</strong> Ushbu kunda maksimal zarar yoki risk
                limiti buzilgan!
              </span>
            </div>
          )}

          {/* Kun yakuniy tahlil (Reflection) */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3.5" /> Kun yakuniy tahlil
            </h4>
            <div className="rounded-xl border bg-card p-3.5 text-sm leading-relaxed text-foreground/90">
              {reflectionValue ? (
                <p className="whitespace-pre-wrap">{reflectionValue}</p>
              ) : (
                <p className="italic text-muted-foreground">
                  Tahlil matni yozilmagan.
                </p>
              )}
            </div>
          </div>

          {/* Proof Screenshot */}
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ImageIcon className="size-3.5" /> Savdo isboti (Proof Photo)
            </h4>
            {proofImageUrl ? (
              <div className="group relative overflow-hidden rounded-xl border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofImageUrl}
                  alt="Proof screenshot"
                  className="max-h-72 w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <a
                  href={proofImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur transition-opacity hover:bg-background"
                >
                  <ExternalLink className="size-3" /> To&apos;liq ochish
                </a>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed bg-muted/20 text-xs text-muted-foreground">
                Isbot rasmi biriktirilmagan.
              </div>
            )}
          </div>

          {/* Parameters & Custom Fields */}
          {otherValues && otherValues.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Parametrlar va Rejalar
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {otherValues.map((v) => (
                  <div
                    key={v.id || v.templateId}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 p-2"
                  >
                    <span className="text-muted-foreground truncate">
                      {v.template?.title ?? "Parametr"}:
                    </span>
                    <span className="font-semibold text-foreground">
                      {v.value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
