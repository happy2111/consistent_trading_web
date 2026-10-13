import { create } from "zustand";
import { DailyReport, DayResult, ReportStatus, TaskTemplate } from "@/types/trading";

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

  // Day Plan Details / Edit dialog
  selectedPlanDate: Date | null;
  selectedPlanTemplates: TaskTemplate[];
  isPlanDetailsOpen: boolean;
  openPlanDetails: (date: Date, templates: TaskTemplate[]) => void;
  closePlanDetails: () => void;
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

  selectedPlanDate: null,
  selectedPlanTemplates: [],
  isPlanDetailsOpen: false,
  openPlanDetails: (date, templates) =>
    set({
      selectedPlanDate: date,
      selectedPlanTemplates: templates,
      isPlanDetailsOpen: true,
    }),
  closePlanDetails: () =>
    set({
      selectedPlanDate: null,
      selectedPlanTemplates: [],
      isPlanDetailsOpen: false,
    }),
}));
