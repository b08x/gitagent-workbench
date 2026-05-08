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

interface SidebarItem {
  title: string
  url?: string
  icon?: React.ElementType
  isActive?: boolean
  items?: SidebarItem[]
}

const items: SidebarItem[] = [
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
        title: "Core Modules",
        icon: Cpu,
        isActive: true,
        items: [
          {
            title: "Agent",
            url: "/workbench/agent",
            icon: Cpu
          },
          {
            title: "Workflows",
            url: "/workbench/workflows",
            icon: Workflow
          }
        ]
      },
      {
        title: "Intelligence",
        icon: Database,
        items: [
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
            title: "Knowledge",
            url: "/workbench/knowledge",
            icon: Database
          }
        ]
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
    <Sidebar collapsible="icon" variant="inset">
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
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <Collapsible
                    asChild
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                  >
                    <div>
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
                            <SidebarMenuItem key={subItem.title}>
                              {subItem.items ? (
                                <Collapsible
                                  asChild
                                  defaultOpen={subItem.isActive}
                                  className="group/sub-collapsible"
                                >
                                  <div>
                                    <CollapsibleTrigger asChild>
                                      <SidebarMenuSubButton className="cursor-pointer">
                                        {subItem.icon && <subItem.icon className="h-4 w-4" />}
                                        <span>{subItem.title}</span>
                                        <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/sub-collapsible:rotate-90" />
                                      </SidebarMenuSubButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <SidebarMenuSub className="ml-2 border-l border-sidebar-border/50">
                                        {subItem.items.map((deepItem) => (
                                          <SidebarMenuSubItem key={deepItem.title}>
                                            <SidebarMenuSubButton asChild isActive={location.pathname === deepItem.url}>
                                              <Link to={deepItem.url || "#"}>
                                                {deepItem.icon && <deepItem.icon className="h-4 w-4" />}
                                                <span>{deepItem.title}</span>
                                              </Link>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </SidebarMenuSub>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              ) : (
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild isActive={location.pathname === subItem.url}>
                                    <Link to={subItem.url}>
                                      {subItem.icon && <subItem.icon className="h-4 w-4" />}
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )}
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ) : (
                  <SidebarMenuButton asChild tooltip={item.title} isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
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
