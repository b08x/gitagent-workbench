import React, { useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ga_sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ga_sidebar_collapsed", JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-geometric-mesh text-foreground select-text relative">
      {/* Command-line precision grid overlay */}
      <div className="absolute inset-0 bg-cli-grid pointer-events-none opacity-50 z-0" />

      {/* Collapsible Sidebar */}
      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area: Zero outer scrolling, child views control their own scroll areas */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col relative min-w-0 z-10">
        {children}
      </main>
    </div>
  );
}
