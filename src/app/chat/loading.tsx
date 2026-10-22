import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="h-dvh w-full flex bg-[#000000] text-foreground overflow-hidden p-0 sm:p-2.5 gap-2.5">
      {/* Left Chat List Skeleton */}
      <aside className="w-full md:w-80 lg:w-96 flex flex-col shrink-0 border-r border-[#400907]/40 bg-[#000000] p-2 sm:p-3">
        {/* Header with back button and title */}
        <div className="flex items-center justify-between pb-3 border-b border-[#400907]/40 mb-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full bg-[#190a09]/80" />
            <Skeleton className="h-5 w-24 rounded-md bg-[#190a09]/80" />
          </div>
          <Skeleton className="size-8 rounded-full bg-[#190a09]/80" />
        </div>

        {/* Search Bar */}
        <Skeleton className="h-10 w-full rounded-2xl bg-[#190a09]/70 mb-3" />

        {/* Tabs (Direct / Group) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#190a09]/60 rounded-xl border border-[#400907]/30 mb-3">
          <Skeleton className="h-8 rounded-lg bg-[#290a08]" />
          <Skeleton className="h-8 rounded-lg bg-transparent" />
        </div>

        {/* Room / User List items */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden mt-1">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#120505]/40 border border-[#400907]/20"
            >
              <Skeleton className="size-11 rounded-full shrink-0 bg-[#290a08]/80" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded bg-[#290a08]/70" />
                  <Skeleton className="h-3 w-10 rounded bg-[#290a08]/50" />
                </div>
                <Skeleton className="h-3.5 w-3/4 rounded bg-[#290a08]/40" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right Chat Main Window Skeleton (hidden on small mobile, visible on md+) */}
      <main className="hidden md:flex flex-1 flex-col h-full rounded-3xl border border-[#400907]/40 bg-[#000000] overflow-hidden p-3 justify-between">
        {/* Chat Header */}
        <div className="p-3 bg-[#190a09]/90 rounded-2xl border border-[#400907]/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full bg-[#290a08]" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded bg-[#290a08]" />
              <Skeleton className="h-3 w-16 rounded bg-[#290a08]/60" />
            </div>
          </div>
          <Skeleton className="size-8 rounded-full bg-[#290a08]" />
        </div>

        {/* Messages placeholder */}
        <div className="flex-1 flex flex-col justify-end gap-3 p-4">
          <div className="flex items-end gap-2 max-w-[60%]">
            <Skeleton className="size-8 rounded-full shrink-0 bg-[#290a08]" />
            <Skeleton className="h-12 w-48 rounded-2xl bg-[#190a09]/70" />
          </div>
          <div className="flex items-end justify-end gap-2 self-end max-w-[60%]">
            <Skeleton className="h-10 w-56 rounded-2xl bg-[#400907]/60" />
          </div>
          <div className="flex items-end gap-2 max-w-[60%]">
            <Skeleton className="size-8 rounded-full shrink-0 bg-[#290a08]" />
            <Skeleton className="h-14 w-64 rounded-2xl bg-[#190a09]/70" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-2 bg-[#190a09]/80 rounded-2xl border border-[#400907]/40 flex items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl bg-[#290a08]/50" />
          <Skeleton className="size-10 rounded-xl bg-[#610d08]/80" />
        </div>
      </main>
    </div>
  );
}
