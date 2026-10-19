"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PageHeaderProps {
  title: string;
  rightSlot?: React.ReactNode;
  mobileSlot?: React.ReactNode;
}

export function PageHeader({ title, rightSlot, mobileSlot }: PageHeaderProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CT";

  const avatarDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 outline-none transition-transform active:scale-95 hover:ring-2 hover:ring-primary/20"
        >
          <Avatar className="size-9 border border-border shadow-xs">
            {user?.image ? (
              <AvatarImage src={user.image} alt={user.name ?? "User"} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      } />
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-foreground">
              {user?.name ?? "Trader"}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-between cursor-pointer py-2 text-xs"
        >
          <span className="flex items-center gap-2">
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-500" />
            ) : (
              <Moon className="size-4 text-purple-500" />
            )}
            <span>Mavzu: {theme === "dark" ? "Qorong'i" : "Yorug'"}</span>
          </span>
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {theme === "dark" ? "Dark" : "Light"}
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 cursor-pointer py-2 text-xs text-rose-500 focus:bg-rose-500/10 focus:text-rose-600"
        >
          <LogOut className="size-4" />
          <span>Chiqish (Log out)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-col gap-2 pb-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>

        {/* Desktop: render rightSlot if present (replacing avatar), else show avatar */}
        <div className="hidden sm:flex items-center">
          {rightSlot ?? avatarDropdown}
        </div>

        {/* Mobile: avatar stays in top right */}
        <div className="sm:hidden flex items-center">
          {avatarDropdown}
        </div>
      </div>

      {/* Mobile: timer renders under title and avatar */}
      {mobileSlot && (
        <div className="sm:hidden flex items-center pt-1">
          {mobileSlot}
        </div>
      )}
    </div>
  );
}
