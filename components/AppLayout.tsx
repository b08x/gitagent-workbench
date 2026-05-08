import * as React from "react"
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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1 flex items-center justify-between">
              <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5">
                  <li className="inline-flex items-center gap-1.5">
                    <span className="transition-colors hover:text-foreground">GitAgent</span>
                  </li>
                  {paths.map((path, i) => (
                    <React.Fragment key={path}>
                      <li className="[&>svg]:size-3.5 text-muted-foreground/50">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.1584 3.1356C6.35366 2.94034 6.67024 2.94034 6.86551 3.1356L10.2319 6.502C10.4271 6.69726 10.4271 7.01384 10.2319 7.2091L6.86551 10.5755C6.67024 10.7708 6.35366 10.7708 6.1584 10.5755C5.96314 10.3802 5.96314 10.0637 6.1584 9.8684L9.17119 6.8556L6.1584 3.84271C5.96314 3.64745 5.96314 3.33086 6.1584 3.1356Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                      </li>
                      <li className="inline-flex items-center gap-1.5">
                        <span className={i === paths.length - 1 ? "font-normal text-foreground" : ""}>
                          {path.charAt(0).toUpperCase() + path.slice(1)}
                        </span>
                      </li>
                    </React.Fragment>
                  ))}
                </ol>
              </nav>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
