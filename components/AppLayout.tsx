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
    <div className="h-screen w-screen overflow-hidden flex flex-row bg-paper-grid text-foreground select-text relative">
      {/* Collapsible Sidebar with 1px solid ink boundary */}
      <AppSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Canvas */}
      <main className="flex-1 h-screen overflow-hidden flex flex-col relative min-w-0 z-10 bg-transparent">
        {children}
      </main>
    </div>
  );
}
