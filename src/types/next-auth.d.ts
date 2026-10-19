import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      googleId?: string;
      telegramId?: string;
      verified: boolean;
      role?: "ADMIN" | "USER";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string;
    telegramId?: string;
    userId?: string | null;
    verified?: boolean;
    role?: "ADMIN" | "USER";
  }
}
