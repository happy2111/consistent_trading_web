import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchVerificationStatus } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { CalendarClient } from "@/components/calendar/calendar-client";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.googleId) {
    redirect("/login");
  }

  const status = await fetchVerificationStatus(session.user.googleId);
  if (!status.verified) {
    redirect("/onboarding");
  }

  const userId = status.userId || session.user.id || "";
  const role = status.role || (session.user.role as "ADMIN" | "USER") || "USER";

  return (
    <AppShell>
      <CalendarClient userId={userId} role={role} />
    </AppShell>
  );
}
