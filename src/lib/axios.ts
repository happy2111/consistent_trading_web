"use client";

import axios from "axios";
import { getSession } from "next-auth/react";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically attach x-google-id header for role-protected endpoints.
// The NestJS RolesGuard accepts this header to identify web users.
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.user?.googleId) {
    config.headers["x-google-id"] = session.user.googleId;
  }
  if (session?.user?.telegramId) {
    config.headers["x-telegram-id"] = session.user.telegramId;
  }
  if (session?.user?.id) {
    config.headers["x-user-id"] = session.user.id;
  }
  return config;
});
