"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <SidebarInset className="min-w-0 overflow-x-hidden bg-background">
        <AppHeader />
        <main className="flex-1 p-3 sm:p-5 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
