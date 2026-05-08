import * as React from "react"
import { 
  BarChart3, 
  Settings, 
  Terminal, 
  LayoutDashboard, 
  Package, 
  Workflow, 
  Database, 
  MessageSquare, 
  Settings2,
  Cpu,
  BookOpen,
  ChevronRight,
  Plus
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "./ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible"
import { Link, useLocation } from "react-router-dom"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Workbenches",
    icon: Package,
    isActive: true,
    items: [
      {
        title: "Agent",
        url: "/workbench/agent",
        icon: Cpu
      },
      {
        title: "Prompts",
        url: "/workbench/prompts",
        icon: Terminal
      },
      {
        title: "Skills",
        url: "/workbench/skills",
        icon: BookOpen
      },
      {
        title: "Workflows",
        url: "/workbench/workflows",
        icon: Workflow
      },
      {
        title: "Knowledge",
        url: "/workbench/knowledge",
        icon: Database
      }
    ]
  },
  {
    title: "Test Lab",
    url: "/workbench/chat",
    icon: MessageSquare,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  }
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                  GA
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">GitAgent</span>
                  <span className="text-xs text-muted-foreground">Workbench</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <React.Fragment key={item.title}>
                {item.items ? (
                  <Collapsible
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton asChild isActive={location.pathname === subItem.url}>
                                <Link to={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={location.pathname === item.url}>
                      <Link to={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </React.Fragment>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
         <div className="p-4 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
            v1.2.0
         </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
