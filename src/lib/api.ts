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

// Short in-memory cache to prevent waterfall roundtrips on rapid tab transitions
const verificationStatusCache = new Map<string, { data: VerificationStatus; expiresAt: number }>();

export function invalidateVerificationCache(identifier?: string) {
  if (identifier) {
    verificationStatusCache.delete(identifier);
  } else {
    verificationStatusCache.clear();
  }
}

/** Fetch from Nest DB with short-term memoization (30s) to eliminate navigation lag */
export async function fetchVerificationStatus(
  identifier: string,
): Promise<VerificationStatus> {
  const base = apiBase();
  if (!base || !identifier) {
    return { userId: null, verified: false, role: "USER" };
  }

  const cached = verificationStatusCache.get(identifier);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
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
      const fallbackData = (await fallbackRes.json()) as VerificationStatus;
      verificationStatusCache.set(identifier, {
        data: fallbackData,
        expiresAt: Date.now() + 30_000,
      });
      return fallbackData;
    }
    const data = (await res.json()) as VerificationStatus;
    const result: VerificationStatus = {
      googleId: data.googleId,
      telegramId: data.telegramId,
      userId: data.userId ?? null,
      verified: Boolean(data.verified),
      role: data.role || "USER",
    };

    verificationStatusCache.set(identifier, {
      data: result,
      expiresAt: Date.now() + 30_000,
    });

    return result;
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

export async function editChatMessage(messageId: string, content: string, userId: string) {
  const { data } = await apiClient.patch(
    `/api/chat/messages/${messageId}`,
    { content },
    { headers: { 'x-user-id': userId } },
  );
  return data;
}

export async function deleteChatMessage(messageId: string, userId: string) {
  const { data } = await apiClient.delete(`/api/chat/messages/${messageId}`, {
    headers: { 'x-user-id': userId },
  });
  return data;
}

/* ========================================================================== */
/* USER PROFILE & OVERALL PERFORMANCE API                                     */
/* ========================================================================== */

export type UserProfile = {
  id: string;
  telegramId?: string | number | null;
  googleId?: string | null;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  passportFrontUrl?: string | null;
  passportBackUrl?: string | null;
  jshshir?: string | null;
  documentNumber?: string | null;
  verified: boolean;
  role: "ADMIN" | "USER";
  createdAt: string;
  updatedAt: string;
};

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>(`/api/users/${userId}`);
  return data;
}

export async function updateUserProfile(
  userId: string,
  payload: { firstName?: string; lastName?: string; username?: string; image?: string },
): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>(`/api/users/${userId}/profile`, payload);
  return data;
}

export type OverallStatistics = {
  userId: string;
  umumiyFoyda: number;
  umumiyZarar: number;
  umumiyHisob: number;
  winCount: number;
  stopLossCount: number;
  breakevenCount: number;
  totalDays: number;
  winRate: number;
  balanceColorStatus: string;
  riskViolations: number;
};

export async function fetchOverallStatistics(userId: string): Promise<OverallStatistics> {
  const { data } = await apiClient.get<OverallStatistics>("/api/statistics/overall", {
    params: { userId },
  });
  return data;
}
