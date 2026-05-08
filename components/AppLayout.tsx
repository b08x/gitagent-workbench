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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-svh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 px-4 border-b bg-background/50 backdrop-blur-md sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1 flex items-center justify-between overflow-hidden">
              <nav aria-label="Breadcrumb" className="overflow-hidden">
                <ol className="flex items-center gap-1.5 break-words text-sm text-muted-foreground whitespace-nowrap overflow-hidden">
                  <li className="inline-flex items-center gap-1.5 shrink-0">
                    <span className="transition-colors hover:text-foreground cursor-default uppercase font-bold tracking-wider text-[10px] text-muted-foreground/60">GitAgent</span>
                  </li>
                  {paths.length > 0 && (
                    <li className="shrink-0 text-muted-foreground/20">/</li>
                  )}
                  {paths.map((path, i) => (
                    <React.Fragment key={path}>
                      <li className="inline-flex items-center gap-1.5 min-w-0">
                        <span className={cn(
                          "truncate transition-colors",
                          i === paths.length - 1 ? "font-medium text-foreground" : "hover:text-foreground"
                        )}>
                          {path.charAt(0).toUpperCase() + path.slice(1)}
                        </span>
                      </li>
                      {i < paths.length - 1 && (
                        <li className="shrink-0 text-muted-foreground/20">/</li>
                      )}
                    </React.Fragment>
                  ))}
                </ol>
              </nav>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
