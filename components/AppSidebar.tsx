import * as React from "react"
import { 
  LayoutDashboard, 
  Bot, 
  Workflow, 
  Database, 
  MessageSquare, 
  Settings2,
  Terminal,
  BookOpen,
  Sparkles,
  Download,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Shield,
  Layers
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar"
import { Link, useLocation } from "react-router-dom"
import { cn } from "../lib/utils"

export function AppSidebar() {
  const location = useLocation()
  const { toggleSidebar, state } = useSidebar()
  const isCollapsed = state === "collapsed"

  const mainNav = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Agent Builder", url: "/workbench/agent", icon: Bot, badge: "Main" },
    { title: "Workflows", url: "/workbench/workflows", icon: Workflow },
  ]

  const intelligenceNav = [
    { title: "Skills Library", url: "/workbench/skills", icon: Sparkles },
    { title: "Prompt Studio", url: "/workbench/prompts", icon: Terminal },
    { title: "Knowledge Base", url: "/workbench/knowledge", icon: Database },
  ]

  const testingNav = [
    { title: "Test Lab", url: "/workbench/chat", icon: MessageSquare },
    { title: "Git & Versioning", url: "/workbench/git", icon: GitBranch },
  ]

  const systemNav = [
    { title: "Import Agent", url: "/import", icon: UploadCloud },
    { title: "Export Agent", url: "/export", icon: Download },
    { title: "Settings", url: "/settings", icon: Settings2 },
    { title: "Documentation", url: "/docs", icon: BookOpen },
  ]

  const renderNavGroup = (label: string, items: typeof mainNav) => (
    <SidebarGroup className="py-2">
      <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-3">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1 px-1">
          {items.map((item) => {
            const isActive = location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url) && item.url !== "/workbench/agent" && item.url !== "/dashboard");
            const isAgentActive = item.url === "/workbench/agent" && (location.pathname === "/workbench/agent" || location.pathname === "/");
            const active = isActive || isAgentActive;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  tooltip={item.title} 
                  isActive={active}
                  className={cn(
                    "h-9 px-3 rounded-lg text-xs font-medium transition-all duration-150",
                    active 
                      ? "bg-primary/15 text-primary font-semibold border border-primary/20 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="flex-1 truncate">{item.title}</span>
                    {item.badge && !isCollapsed && (
                      <span className="text-[9px] font-mono uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/60 bg-sidebar select-none shrink-0"
    >
      <SidebarHeader className="border-b border-border/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/workbench/agent" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black shadow-md shadow-primary/25 shrink-0 group-hover:scale-105 transition-transform">
              GA
            </div>
            <div className="flex flex-col leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="font-bold text-sm tracking-tight truncate flex items-center gap-1.5">
                GitAgent
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 bg-primary/15 text-primary rounded">
                  v2.0
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground truncate">Orchestration Studio</span>
            </div>
          </Link>
          
          <button 
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors group-data-[collapsible=icon]:hidden"
            title="Toggle Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {renderNavGroup("Core Architecture", mainNav)}
        {renderNavGroup("Intelligence & Data", intelligenceNav)}
        {renderNavGroup("Testing & Ops", testingNav)}
        {renderNavGroup("Tools & System", systemNav)}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono">Gateway Ready</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 hidden" />}
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
