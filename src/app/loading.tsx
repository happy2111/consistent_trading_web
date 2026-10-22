import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <AppShell>
      <div className="space-y-6 animate-pulse">
        {/* Page Header (Matches PageHeader: title + right timer slot) */}
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-36 sm:w-44 rounded-xl" />
          </div>
        </div>

        <div className="space-y-5">
          {/* 1. Selector Skeleton */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-full sm:w-[260px] rounded-lg" />
          </div>

          {/* 2. 4 Plan Statistic Blocks (Grid 2 cols on mobile, 4 on sm+) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2 shadow-xs"
              >
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-7 w-28 rounded" />
              </div>
            ))}
          </div>

          {/* 3. Balance Chart Skeleton Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3.5 w-60 rounded" />
              </div>
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-64 sm:h-72 w-full rounded-xl" />
          </div>

          {/* 4. History Table Skeleton Card */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
            <div className="space-y-2 pt-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="h-4 w-28 rounded" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
