"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const breadcrumbTitles: Record<string, string> = {
  "/": "Asosiy",
  "/calendar": "Rejalar",
  "/history": "Hisobotlar",
  "/chat": "Chat",
};

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const title = breadcrumbTitles[pathname] || "Asosiy";
  const role = (session?.user?.role as "ADMIN" | "USER") || "USER";
  const isAdmin = role === "ADMIN";

  return (
    <header className="hidden md:flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">Consistent Trading</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant={isAdmin ? "default" : "outline"}
          className={
            isAdmin
              ? "bg-purple-600 font-semibold text-white hover:bg-purple-600"
              : "border-muted-foreground/30 font-medium"
          }
        >
          {role}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="size-8"
          title="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
