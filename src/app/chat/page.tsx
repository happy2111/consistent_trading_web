import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchVerificationStatus } from "@/lib/api";
import { ChatClient } from "@/components/chat/chat-client";

export default async function ChatPage() {
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
  const userName = session.user.name || "Trader";
  const userEmail = session.user.email || "";
  const userImage = session.user.image || "";
  const userRole = (session?.user as any)?.role || status.role || "USER";
  const isAdmin = userRole === "ADMIN";

  return (
    <div className="h-dvh w-full flex flex-col bg-[#000000] text-foreground overflow-hidden">
      <ChatClient
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        isAdmin={isAdmin}
      />
    </div>
  );
}
