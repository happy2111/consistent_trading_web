import { create } from "zustand";
import { DailyReport, DayResult, ReportStatus } from "@/types/trading";

interface TradingStoreState {
  // Calendar & Month selection
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // Selected report for Dialog/Sheet review
  selectedReport: DailyReport | null;
  setSelectedReport: (report: DailyReport | null) => void;
  isReportSheetOpen: boolean;
  setIsReportSheetOpen: (open: boolean) => void;

  // History status filter
  statusFilter: ReportStatus | DayResult | "ALL";
  setStatusFilter: (filter: ReportStatus | DayResult | "ALL") => void;

  // Admin Plan creation dialog
  isAdminPlanDialogOpen: boolean;
  setIsAdminPlanDialogOpen: (open: boolean) => void;
  adminSelectedDate: Date | null;
  setAdminSelectedDate: (date: Date | null) => void;
}

export const useTradingStore = create<TradingStoreState>((set) => ({
  currentDate: new Date(),
  setCurrentDate: (date) => set({ currentDate: date }),

  selectedReport: null,
  setSelectedReport: (report) =>
    set({ selectedReport: report, isReportSheetOpen: Boolean(report) }),
  isReportSheetOpen: false,
  setIsReportSheetOpen: (open) =>
    set((state) => ({
      isReportSheetOpen: open,
      selectedReport: open ? state.selectedReport : null,
    })),

  statusFilter: "ALL",
  setStatusFilter: (filter) => set({ statusFilter: filter }),

  isAdminPlanDialogOpen: false,
  setIsAdminPlanDialogOpen: (open) => set({ isAdminPlanDialogOpen: open }),
  adminSelectedDate: null,
  setAdminSelectedDate: (date) => set({ adminSelectedDate: date }),
}));
