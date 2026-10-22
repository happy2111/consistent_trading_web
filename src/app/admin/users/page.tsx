import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AdminUsersClient } from "@/components/admin/admin-users-client";

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any)?.role || "USER";
  if (role !== "ADMIN") {
    // Only Admin can access this page
    redirect("/");
  }

  const currentAdminId = session.user.id || "";

  return (
    <AppShell>
      <AdminUsersClient currentAdminId={currentAdminId} />
    </AppShell>
  );
}
