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

  let isVerified = Boolean(session.user?.verified);
  let userId = session.user.id || "";
  let role = (session.user.role as "ADMIN" | "USER") || "USER";

  if (!isVerified) {
    const status = await fetchVerificationStatus(authId);
    if (!status.verified) {
      redirect("/onboarding");
    }
    userId = status.userId || userId;
    role = status.role || role;
  }

  return (
    <AppShell>
      <DashboardClient userId={userId} role={role} />
    </AppShell>
  );
}
