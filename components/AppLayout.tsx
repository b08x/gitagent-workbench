import * as React from "react"
import { cn } from "../lib/utils"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Separator } from "./ui/separator"
import { useLocation } from "react-router-dom"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-svh overflow-hidden bg-background">
        <main className="flex-1 h-full overflow-hidden flex flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
