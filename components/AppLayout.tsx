import * as React from "react"
import { cn } from "../lib/utils"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Separator } from "./ui/separator"
import { useLocation } from "react-router-dom"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  
  // Simple breadcrumb logic
  const paths = location.pathname.split("/").filter(Boolean)
  
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-svh overflow-hidden">
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
