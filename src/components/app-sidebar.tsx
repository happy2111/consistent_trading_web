"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  CalendarDays,
  ClipboardPenLine,
  History,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  {
    title: "Overview",
    url: "/",
    icon: LayoutDashboard,
    description: "Financial KPI & Activity",
  },
  {
    title: "Plan Calendar",
    url: "/calendar",
    icon: CalendarDays,
    description: "Daily limits & planning",
  },
  {
    title: "Daily Checkout",
    url: "/checkout",
    icon: ClipboardPenLine,
    description: "Evening results submission",
  },
  {
    title: "History & Reports",
    url: "/history",
    icon: History,
    description: "Detailed logs & reflections",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const userRole = (user?.role as "ADMIN" | "USER") || "USER";
  const isAdmin = userRole === "ADMIN";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "TG";

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md">
                <TrendingUp className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight text-foreground">
                  TradeGuard
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Reja & Discipline Control
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                item.url === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.url);

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive}
                    tooltip={item.title}
                    className="transition-colors hover:bg-accent/80"
                  >
                    <item.icon className="size-4 shrink-0" />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="font-medium">{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Status</SidebarGroupLabel>
          <div className="rounded-lg border bg-card/60 p-3 text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verification:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                <UserCheck className="size-3.5" /> ID Verified
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">System Mode:</span>
              <Badge
                variant={isAdmin ? "default" : "secondary"}
                className={
                  isAdmin
                    ? "bg-purple-600 text-white hover:bg-purple-600"
                    : "text-xs"
                }
              >
                {userRole}
              </Badge>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between rounded-lg border bg-sidebar-accent/50 p-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="size-8 rounded-lg border">
                  {user?.image ? (
                    <AvatarImage src={user.image} alt={user.name ?? "User"} />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-semibold text-foreground">
                    {user?.name ?? "Trader"}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {user?.email ?? ""}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Chiqish (Sign out)"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
