import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <AppShell>
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col gap-2 pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between py-2 border-b border-border/40">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>
          <div className="space-y-2.5">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
