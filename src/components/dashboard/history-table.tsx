"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Eye,
  Filter,
  ImageIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DailyReport, DayResult, ReportStatus } from "@/types/trading";
import { useTradingStore } from "@/lib/store";
import { parseDecimal } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

interface HistoryTableProps {
  reports: DailyReport[];
  isLoading?: boolean;
}

export function HistoryTable({ reports = [], isLoading }: HistoryTableProps) {
  const { setSelectedReport, statusFilter, setStatusFilter } =
    useTradingStore();

  const filteredReports = React.useMemo(() => {
    if (statusFilter === "ALL") return reports;
    return reports.filter((r) => {
      if (statusFilter === "WIN" || statusFilter === "STOP_LOSS" || statusFilter === "BREAKEVEN") {
        return r.dayResult === statusFilter;
      }
      return r.status === statusFilter;
    });
  }, [reports, statusFilter]);

  const getPlanLimits = (report: DailyReport) => {
    const maxZarar = report.values?.find((v) =>
      v.template?.title.toLowerCase().includes("maksimal zarar"),
    )?.value;
    const maxFoyda = report.values?.find((v) =>
      v.template?.title.toLowerCase().includes("maksimal foyda"),
    )?.value;

    if (!maxZarar && !maxFoyda) return "—";
    return `-$${maxZarar || "0"} / +$${maxFoyda || "0"}`;
  };

  const getProofImageUrl = (report: DailyReport): string | null => {
    const val = report.values?.find(
      (v) =>
        v.template?.fieldType === "IMAGE" ||
        v.template?.title.toLowerCase().includes("rasm") ||
        v.template?.title.toLowerCase().includes("proof") ||
        v.template?.title.toLowerCase().includes("skrinshot") ||
        (v.value && (v.value.startsWith("http") || v.value.startsWith("data:image"))),
    );
    return val?.value || null;
  };

  const hasProof = (report: DailyReport) => {
    return Boolean(getProofImageUrl(report));
  };

  const filterOptions = [
    { value: "ALL", label: "Barchasi" },
    { value: "WIN", label: "Win" },
    { value: "STOP_LOSS", label: "Stop Loss" },
  ] as const;

  const currentFilterLabel =
    filterOptions.find((f) => f.value === statusFilter)?.label || "Barchasi";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 sm:px-6">
        <div className="text-sm font-semibold text-muted-foreground">
          Jami: {filteredReports.length} ta
        </div>

        {/* Filter Popup Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
              <Filter className="size-3.5 text-muted-foreground" />
              <span>Filtr: {currentFilterLabel}</span>
            </Button>
          } />
          <DropdownMenuContent align="end" className="min-w-36">
            {filterOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className="flex items-center justify-between text-xs cursor-pointer"
              >
                <span>{opt.label}</span>
                {statusFilter === opt.value && <Check className="size-3.5 text-[#ff7a75]" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Yuklanmoqda...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Hech qanday hisobot topilmadi.
            </div>
          ) : (
            filteredReports.map((report) => {
              const proofImgUrl = getProofImageUrl(report);
              const totalFoyda = parseDecimal(report.totalFoyda);
              const totalZarar = parseDecimal(report.totalZarar);
              const netHisob = parseDecimal(report.netHisob);
              const isPositive = netHisob >= 0;

              return (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="p-4 space-y-2.5 cursor-pointer transition-colors active:bg-muted/60 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {report.date
                          ? format(new Date(report.date), "dd.MM.yyyy")
                          : "—"}
                      </span>
                      <Badge
                        variant={
                          report.dayResult === "WIN"
                            ? "default"
                            : report.dayResult === "STOP_LOSS"
                            ? "destructive"
                            : "secondary"
                        }
                        className={`text-[10px] ${
                          report.dayResult === "WIN"
                            ? "bg-emerald-600 text-white"
                            : ""
                        }`}
                      >
                        {report.dayResult || report.status}
                      </Badge>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      ${netHisob.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Reja limit: {getPlanLimits(report)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-medium">
                        +${totalFoyda.toFixed(2)}
                      </span>
                      <span>/</span>
                      <span className="text-rose-500 font-medium">
                        -${totalZarar.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Proof Image Preview */}
                  {proofImgUrl && (
                    <div className="relative mt-1 overflow-hidden rounded-lg border border-border/80 bg-muted/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofImgUrl}
                        alt="Proof preview"
                        className="h-28 w-full object-cover transition-transform active:scale-105"
                      />
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-background/85 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                        <ImageIcon className="size-3 text-blue-500" />
                        <span>Isbot</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[120px]">DATE</TableHead>
                <TableHead>PLAN (Zarar / Foyda)</TableHead>
                <TableHead className="text-right">ACTUAL FOYDA</TableHead>
                <TableHead className="text-right">ACTUAL ZARAR</TableHead>
                <TableHead className="text-right">HISOB (NET)</TableHead>
                <TableHead className="text-center">STATUS</TableHead>
                <TableHead className="text-center">PROOFS</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    Yuklanmoqda...
                  </TableCell>
                </TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    Hech qanday hisobot topilmadi.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const proofImgUrl = getProofImageUrl(report);
                  const totalFoyda = parseDecimal(report.totalFoyda);
                  const totalZarar = parseDecimal(report.totalZarar);
                  const netHisob = parseDecimal(report.netHisob);
                  const isPositive = netHisob >= 0;

                  return (
                    <TableRow
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="cursor-pointer transition-colors hover:bg-muted/60"
                    >
                      <TableCell className="font-medium text-xs">
                        {report.date
                          ? format(new Date(report.date), "dd.MM.yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {getPlanLimits(report)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-emerald-500">
                        +${totalFoyda.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-rose-500">
                        -${totalZarar.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        <span
                          className={
                            isPositive ? "text-emerald-500" : "text-rose-500"
                          }
                        >
                          {isPositive ? "+" : ""}
                          ${netHisob.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            report.dayResult === "WIN"
                              ? "default"
                              : report.dayResult === "STOP_LOSS"
                              ? "destructive"
                              : "secondary"
                          }
                          className={`text-[10px] ${
                            report.dayResult === "WIN"
                              ? "bg-emerald-600 text-white"
                              : ""
                          }`}
                        >
                          {report.dayResult || report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {proofImgUrl ? (
                          <div className="flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={proofImgUrl}
                              alt="Proof preview"
                              className="size-8 rounded-md border border-border object-cover shadow-2xs transition-transform hover:scale-125 hover:z-10"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Yo&apos;q
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(report);
                          }}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
