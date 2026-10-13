import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const verified = Boolean(req.auth?.user?.verified);
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isPublic =
    isAuthPage ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(
      new URL(verified ? "/dashboard" : "/onboarding", req.nextUrl.origin),
    );
  }

  // Unverified users cannot reach anything except onboarding + auth APIs
  if (isLoggedIn && !verified && !isOnboarding && !pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  // Verified users should not stay on onboarding
  if (isLoggedIn && verified && isOnboarding) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$).*)"],
};
