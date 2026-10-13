import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchVerificationStatus } from "@/lib/api";
import { PassportForm } from "@/components/passport-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.googleId) {
    redirect("/login");
  }

  const status = await fetchVerificationStatus(session.user.googleId);
  if (status.verified) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <PassportForm />
      </div>
    </div>
  );
}
