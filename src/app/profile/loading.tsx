import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <AppShell>
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-2 pb-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col items-center gap-4">
            <Skeleton className="size-24 rounded-full" />
            <Skeleton className="h-6 w-36 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <div className="md:col-span-2 rounded-2xl border border-border/60 bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-32 rounded" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
