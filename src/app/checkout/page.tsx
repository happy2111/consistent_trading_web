import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchVerificationStatus } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default async function CheckoutPage() {
  const session = await auth();
  const authId = session?.user?.googleId || session?.user?.telegramId || session?.user?.id;
  if (!authId) {
    redirect("/login");
  }

  const status = await fetchVerificationStatus(authId);
  if (!status.verified) {
    redirect("/onboarding");
  }

  const userId = status.userId || session?.user?.id || "";

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Kunlik Hisobot (Daily Checkout)
          </h1>
          <p className="text-xs text-muted-foreground">
            Bugungi savdo intizomi, fakt natijalar va skrinshot isboti
          </p>
        </div>
        <CheckoutForm userId={userId} />
      </div>
    </AppShell>
  );
}
