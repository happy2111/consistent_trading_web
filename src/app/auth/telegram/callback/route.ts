import { NextRequest, NextResponse } from "next/server";
import { authTelegramUser } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const hash = searchParams.get("hash");

  if (!id || !hash) {
    return NextResponse.redirect(new URL("/login?error=telegram_invalid", req.url));
  }

  const payload = {
    id,
    first_name: searchParams.get("first_name") || undefined,
    last_name: searchParams.get("last_name") || undefined,
    username: searchParams.get("username") || undefined,
    photo_url: searchParams.get("photo_url") || undefined,
    auth_date: searchParams.get("auth_date") || undefined,
    hash,
  };

  try {
    const user = await authTelegramUser(payload);
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=telegram_failed", req.url));
    }

    // Redirect to login or home with telegram auto-auth
    return NextResponse.redirect(new URL("/", req.url));
  } catch (err) {
    console.error("Telegram callback error:", err);
    return NextResponse.redirect(new URL("/login?error=telegram_error", req.url));
  }
}
