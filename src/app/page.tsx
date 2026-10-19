import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchVerificationStatus } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function HomePage() {
  const session = await auth();
  const authId = session?.user?.googleId || session?.user?.telegramId || session?.user?.id;
  if (!authId) {
    redirect("/login");
  }

  const status = await fetchVerificationStatus(authId);
  if (!status.verified) {
    redirect("/onboarding");
  }

  const userId = status.userId || session.user.id || "";
  const role = status.role || (session.user.role as "ADMIN" | "USER") || "USER";

  return (
    <AppShell>
      <DashboardClient userId={userId} role={role} />
    </AppShell>
  );
}
