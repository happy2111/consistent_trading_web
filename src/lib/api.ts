import { apiClient } from "./axios";
import {
  CreateTaskTemplateDto,
  DailyReport,
  Statistics,
  SubmitReportDto,
  TaskTemplate,
} from "@/types/trading";

const apiBase = () =>
  process.env.API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "";

export type VerificationStatus = {
  googleId?: string;
  telegramId?: string;
  userId: string | null;
  verified: boolean;
  role?: "ADMIN" | "USER";
};

export async function upsertGoogleUser(payload: {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string;
}) {
  const base = apiBase();
  if (!base) return null;

  const res = await fetch(`${base}/api/users/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function authTelegramUser(payload: {
  id: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string | number;
  hash: string;
}) {
  const base = apiBase();
  if (!base) return null;

  const res = await fetch(`${base}/api/users/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Telegram authentication failed");
  }
  return res.json();
}

/** Always fetch from Nest DB — never trust client/localStorage */
export async function fetchVerificationStatus(
  identifier: string,
): Promise<VerificationStatus> {
  const base = apiBase();
  if (!base || !identifier) {
    return { userId: null, verified: false, role: "USER" };
  }

  try {
    const res = await fetch(
      `${base}/api/users/status/${encodeURIComponent(identifier)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      // Fallback for older server builds
      const fallbackRes = await fetch(
        `${base}/api/users/google/${encodeURIComponent(identifier)}/status`,
        { cache: "no-store" },
      );
      if (!fallbackRes.ok) {
        return { userId: null, verified: false, role: "USER" };
      }
      return (await fallbackRes.json()) as VerificationStatus;
    }
    const data = (await res.json()) as VerificationStatus;
    return {
      googleId: data.googleId,
      telegramId: data.telegramId,
      userId: data.userId ?? null,
      verified: Boolean(data.verified),
      role: data.role || "USER",
    };
  } catch {
    return { userId: null, verified: false, role: "USER" };
  }
}

/* ========================================================================== */
/* FINANCIAL & DISCIPLINE TRACKING API                                        */
/* ========================================================================== */

export async function fetchStatistics(
  userId: string,
  year: number,
  month: number,
): Promise<Statistics> {
  const { data } = await apiClient.get<Statistics>("/api/statistics", {
    params: { userId, year, month },
  });
  return data;
}

export async function fetchTodayReport(
  userId: string,
  phase?: "MORNING" | "EVENING",
): Promise<DailyReport> {
  const { data } = await apiClient.get<DailyReport>("/api/reports/today", {
    params: { userId, phase },
  });
  return data;
}

export async function fetchReportHistory(
  userId: string,
  year?: number,
  month?: number,
): Promise<DailyReport[]> {
  const { data } = await apiClient.get<DailyReport[]>("/api/reports/history", {
    params: { userId, year, month },
  });
  return data;
}

export async function submitDailyReport(
  payload: SubmitReportDto,
): Promise<DailyReport> {
  const { data } = await apiClient.post<DailyReport>(
    "/api/reports/submit",
    payload,
  );
  return data;
}

export async function uploadProofFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ url: string }>(
    "/api/reports/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.url;
}

export async function fetchTaskTemplates(
  activeOnly: boolean = false,
): Promise<TaskTemplate[]> {
  const { data } = await apiClient.get<TaskTemplate[]>("/api/templates", {
    params: { activeOnly: activeOnly ? "true" : undefined },
  });
  return data;
}

export async function createTaskTemplate(
  payload: CreateTaskTemplateDto,
): Promise<TaskTemplate> {
  const { data } = await apiClient.post<TaskTemplate>(
    "/api/templates",
    payload,
  );
  return data;
}

export async function updateTaskTemplate(
  id: string,
  payload: Partial<CreateTaskTemplateDto>,
): Promise<TaskTemplate> {
  const { data } = await apiClient.patch<TaskTemplate>(
    `/api/templates/${id}`,
    payload,
  );
  return data;
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  await apiClient.delete(`/api/templates/${id}`);
}

export async function fetchChatRooms(userId: string) {
  const { data } = await apiClient.get('/api/chat/rooms', {
    headers: { 'x-user-id': userId },
  });
  return data;
}

export async function fetchChatUsers(userId: string) {
  const { data } = await apiClient.get('/api/chat/users', {
    headers: { 'x-user-id': userId },
  });
  return data;
}

export async function createDirectChat(userId: string, targetUserId: string) {
  const { data } = await apiClient.post(
    '/api/chat/rooms/direct',
    { targetUserId },
    { headers: { 'x-user-id': userId } },
  );
  return data;
}

export async function createGroupChat(
  userId: string,
  name: string,
  memberUserIds: string[],
) {
  const { data } = await apiClient.post(
    '/api/chat/rooms/group',
    { name, memberUserIds },
    { headers: { 'x-user-id': userId } },
  );
  return data;
}

export async function fetchChatMessages(chatId: string, cursor?: string, limit = 30) {
  const { data } = await apiClient.get(`/api/chat/rooms/${chatId}/messages`, {
    params: { cursor, limit },
  });
  return data;
}
