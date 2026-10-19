import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchVerificationStatus } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { HistoryClient } from "@/components/history/history-client";

export default async function HistoryPage() {
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

  return (
    <AppShell>
      <HistoryClient userId={userId} />
    </AppShell>
  );
}
