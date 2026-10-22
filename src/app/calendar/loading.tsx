import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <AppShell>
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Skeleton className="h-7 w-36 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
