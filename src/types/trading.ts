export type Role = "ADMIN" | "USER";

export type FieldType = "INT" | "TEXT" | "BOOLEAN" | "IMAGE";

export type FillPhase = "MORNING" | "EVENING";

export type ReportStatus = "PENDING" | "COMPLETED" | "MISSED";

export type DayResult = "WIN" | "STOP_LOSS" | "BREAKEVEN";

export type BalanceColor = "GREEN" | "YELLOW" | "RED";

export interface TaskTemplate {
  id: string;
  title: string;
  fieldType: FieldType;
  fillPhase: FillPhase;
  isPrimary: boolean;
  startDate: string;
  endDate: string;
  repeatDays: number[];
  defaultValue?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskValue {
  id: string;
  dailyReportId: string;
  templateId: string;
  template: TaskTemplate;
  value: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string;
  status: ReportStatus;
  totalFoyda: number;
  totalZarar: number;
  netHisob: number;
  isRiskViolated: boolean;
  values: TaskValue[];
  dayResult?: DayResult | null;
  morning?: TaskValue[];
  evening?: TaskValue[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DailySummary {
  date: string;
  foyda: number;
  zarar: number;
  hisob: number;
  status: ReportStatus;
  dayResult: DayResult | null;
  isRiskViolated: boolean;
}

export interface Statistics {
  userId: string;
  year: number;
  month: number;
  umumiyFoyda: number;
  umumiyZarar: number;
  umumiyHisob: number;
  winCount: number;
  stopLossCount: number;
  breakevenCount: number;
  totalDays: number;
  winRate: number;
  balanceColorStatus: BalanceColor;
  riskViolations: number;
  daily: DailySummary[];
}

export interface CreateTaskTemplateDto {
  title: string;
  fieldType: FieldType;
  fillPhase: FillPhase;
  isPrimary?: boolean;
  startDate: string;
  endDate: string;
  repeatDays: number[];
  defaultValue?: string;
}

export interface SubmitTaskValueDto {
  templateId: string;
  value?: string;
}

export interface SubmitReportDto {
  reportId: string;
  values: SubmitTaskValueDto[];
  finalize?: boolean;
}
