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

  const hasProof = (report: DailyReport) => {
    return report.values?.some(
      (v) =>
        v.template?.fieldType === "IMAGE" ||
        (v.value && (v.value.startsWith("http") || v.value.startsWith("data:image"))),
    );
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Kunlik Savdo Tarixi (Daily Reports)
          </CardTitle>
          <CardDescription className="text-xs">
            Barcha hisobotlar, reja va fakt natijalari
          </CardDescription>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 size-3.5 text-muted-foreground" />
          {(["ALL", "WIN", "STOP_LOSS", "MISSED"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter(filter)}
            >
              {filter === "ALL"
                ? "Barchasi"
                : filter === "WIN"
                ? "Win"
                : filter === "STOP_LOSS"
                ? "Stop Loss"
                : "O'tkazilgan"}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                  const proofAvailable = hasProof(report);
                  const isPositive = report.netHisob >= 0;

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
                        +${report.totalFoyda}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs text-rose-500">
                        -${report.totalZarar}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs">
                        <span
                          className={
                            isPositive ? "text-emerald-500" : "text-rose-500"
                          }
                        >
                          {isPositive ? "+" : ""}
                          ${report.netHisob}
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
                        {proofAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500">
                            <ImageIcon className="size-3.5" /> Bor
                          </span>
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
