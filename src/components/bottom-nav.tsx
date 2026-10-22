"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, History, LayoutDashboard, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "Asosiy",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Rejalar",
    url: "/calendar",
    icon: CalendarDays,
  },
  {
    title: "Hisobotlar",
    url: "/history",
    icon: History,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#400907]/80 bg-[#190a09]/95 backdrop-blur-md px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around gap-1">
        {items.map((item) => {
          const isActive =
            item.url === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.url);

          return (
            <Link
              key={item.url}
              href={item.url}
              prefetch={true}
              onTouchStart={() => router.prefetch(item.url)}
              onMouseEnter={() => router.prefetch(item.url)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-[#ff7a75] font-bold bg-[#8c1511]/20 border border-[#8c1511]/40 shadow-xs"
                  : "text-[#a88a89] hover:text-white hover:bg-[#290a08]/50",
              )}
            >
              <item.icon className="size-5" />
              <span className="flex items-center gap-0.5">
                {item.title}
                {item.url === "/chat" && (
                  <ArrowUpRight className="size-2.5 opacity-70" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
