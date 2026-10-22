"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowUpRight,
  CalendarDays,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  TrendingUp,
  Users,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user;

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
            <SidebarMenuButton size="lg" render={<Link href="/" prefetch={true} />}>
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-[#8c1511] text-white shadow-md shadow-[#8c1511]/30">
                <TrendingUp className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight text-foreground text-base">
                  Consistent Trading
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menyu</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                item.url === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.url);

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} prefetch={true} />}
                    isActive={isActive}
                    tooltip={item.title}
                    onMouseEnter={() => router.prefetch(item.url)}
                    onPointerDown={() => router.prefetch(item.url)}
                    className="transition-colors hover:bg-accent/80"
                  >
                    <item.icon className="size-4 shrink-0" />
                    <div className="flex flex-1 items-center justify-between">
                      <span className="font-medium">{item.title}</span>
                      {item.url === "/chat" && (
                        <ArrowUpRight className="size-3.5 text-muted-foreground/80 transition-transform group-hover/menu-button:translate-x-0.5 group-hover/menu-button:-translate-y-0.5" />
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {(user as any)?.role === "ADMIN" && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/admin/users" prefetch={true} />}
                  isActive={pathname?.startsWith("/admin/users")}
                  tooltip="Foydalanuvchilar"
                  onMouseEnter={() => router.prefetch("/admin/users")}
                  onPointerDown={() => router.prefetch("/admin/users")}
                  className="transition-colors hover:bg-accent/80"
                >
                  <Users className="size-4 shrink-0 text-amber-500" />
                  <div className="flex flex-1 items-center justify-between">
                    <span className="font-medium">Foydalanuvchilar</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between rounded-lg border bg-sidebar-accent/50 p-2">
              <Link
                href="/profile"
                prefetch={true}
                className="flex items-center gap-2.5 overflow-hidden flex-1 group transition-opacity hover:opacity-80"
                title="Mening profilim"
              >
                <Avatar className="size-8 rounded-lg border">
                  {user?.image ? (
                    <AvatarImage src={user.image} alt={user.name ?? "User"} />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                    {user?.name ?? "Trader"}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {user?.email ?? ""}
                  </span>
                </div>
              </Link>
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
