import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Terminal, 
  Zap, 
  Workflow, 
  Database, 
  MessageSquare, 
  FileCode, 
  History, 
  GitBranch, 
  Download, 
  UploadCloud, 
  Settings, 
  Sun, 
  Moon, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { useAgentWorkspace } from '../app/context/AgentContext';
import { useSettings } from '../app/context/SettingsContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppSidebar({
  collapsed,
  setCollapsed
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAgentWorkspace();
  const { settings, updateSettings } = useSettings();

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const navSections: NavSection[] = [
    {
      title: "OVERVIEW",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Documentation", url: "/docs", icon: BookOpen },
      ]
    },
    {
      title: "AGENT CORE",
      items: [
        { title: "Agent Builder", url: "/workbench/agent", icon: Cpu, badge: "Core" },
        { title: "Prompts", url: "/workbench/prompts", icon: Terminal },
        { title: "Skills", url: "/workbench/skills", icon: Zap, badge: `${state.manifest.skills?.length || 0}` },
        { title: "Workflows", url: "/workbench/workflows", icon: Workflow, badge: `${Object.keys(state.workflows || {}).length}` },
        { title: "Knowledge", url: "/workbench/knowledge", icon: Database, badge: `${state.knowledge?.documents?.length || 0}` },
      ]
    },
    {
      title: "EXECUTION & OPS",
      items: [
        { title: "Test Lab", url: "/workbench/chat", icon: MessageSquare },
        { title: "File Editor", url: "/editor", icon: FileCode },
        { title: "Version History", url: "/workbench/history", icon: History },
        { title: "Git Sync", url: "/workbench/git", icon: GitBranch },
        { title: "Export ZIP", url: "/export", icon: Download },
        { title: "Import Agent", url: "/import", icon: UploadCloud },
      ]
    }
  ];

  return (
    <aside
      className={cn(
        "h-screen shrink-0 border-r border-[#A0D2EB]/15 bg-gradient-to-b from-[#232323] to-[#1A2630] text-sidebar-foreground flex flex-col transition-all duration-200 z-30 select-none shadow-md",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand & Collapse Header */}
      <div className={cn(
        "h-14 border-b border-[#A0D2EB]/15 flex items-center px-3 gap-2.5",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed ? (
          <Link to="/dashboard" className="flex items-center gap-2.5 group overflow-hidden">
            <div className="size-8 rounded-sm bg-gradient-to-r from-[#E76F51] to-[#E9C46A] flex items-center justify-center text-[#141A20] font-mono font-black text-sm tracking-tighter warm-glow-sm shrink-0">
              GA
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-foreground font-sans">GitAgent</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#E76F51] px-1 py-0.2 bg-[#E76F51]/15 border border-[#E76F51]/30 rounded-sm">
                  OS
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#A0D2EB]/60 truncate">
                Workbench v1.4
              </span>
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" title="GitAgent Workbench">
            <div className="size-8 rounded-sm bg-gradient-to-r from-[#E76F51] to-[#E9C46A] flex items-center justify-center text-[#141A20] font-mono font-black text-sm tracking-tighter warm-glow-sm">
              GA
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "size-7 rounded-sm flex items-center justify-center text-[#A0D2EB]/60 hover:text-foreground hover:bg-[#A0D2EB]/10 transition-colors shrink-0",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      {/* When collapsed, a tiny uncollapse button strip */}
      {collapsed && (
        <div className="py-1 flex justify-center border-b border-[#A0D2EB]/10">
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="size-6 rounded-sm flex items-center justify-center text-[#A0D2EB]/60 hover:text-foreground hover:bg-[#A0D2EB]/10 transition-colors"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/50 flex items-center gap-1.5">
                <span className="text-[#A0D2EB]/40">$</span>
                <span>{section.title}</span>
              </div>
            )}

            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = location.pathname === item.url || (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-sm text-xs font-medium transition-all group relative font-sans",
                      collapsed ? "justify-center h-9 px-0" : "h-8.5 px-2.5",
                      isActive
                        ? "bg-[#A0D2EB]/10 text-foreground border-l-2 border-[#E76F51] font-semibold shadow-xs"
                        : "text-[#A0D2EB]/70 hover:text-foreground hover:bg-[#A0D2EB]/5"
                    )}
                  >
                    <Icon className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive ? "text-[#E76F51]" : "text-[#A0D2EB]/60 group-hover:text-foreground"
                    )} />
                    
                    {!collapsed && (
                      <span className="truncate flex-1">{item.title}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span className={cn(
                        "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm shrink-0",
                        isActive 
                          ? "bg-gradient-to-r from-[#E76F51]/20 to-[#E9C46A]/20 text-[#E76F51] border border-[#E76F51]/30" 
                          : "bg-[#A0D2EB]/10 text-[#A0D2EB]/80 border border-[#A0D2EB]/15 group-hover:text-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Pinned Utilities */}
      <div className="mt-auto border-t border-[#A0D2EB]/15 p-2 space-y-1.5 bg-[#172129]/60">
        {/* Active Agent Status Pill */}
        {!collapsed && (
          <div className="px-2.5 py-1.5 rounded-sm bg-[#1A2630]/90 border border-[#A0D2EB]/20 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate">
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A0D2EB]/60">Active Agent</p>
                <p className="text-xs font-mono font-semibold text-foreground truncate">
                  {state.manifest.name || "untitled-agent"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono font-bold text-[#E76F51] bg-[#E76F51]/10 border-[#E76F51]/30 px-1 py-0 uppercase">
              {state.manifest.compliance?.risk_tier || "T1"}
            </Badge>
          </div>
        )}

        {/* Global Actions */}
        <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={toggleTheme}
            title={settings.theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={cn(
              "text-[#A0D2EB]/70 hover:text-foreground hover:bg-[#A0D2EB]/10",
              !collapsed && "flex-1 justify-start gap-2 text-xs"
            )}
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="size-4 text-[#E9C46A]" />
                {!collapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <Moon className="size-4 text-[#E76F51]" />
                {!collapsed && <span>Dark Mode</span>}
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={() => navigate('/settings')}
            title="Settings"
            className={cn(
              "text-[#A0D2EB]/70 hover:text-foreground hover:bg-[#A0D2EB]/10",
              location.pathname === '/settings' && "bg-[#A0D2EB]/10 text-foreground border-l-2 border-[#E76F51]",
              !collapsed && "flex-1 justify-start gap-2 text-xs"
            )}
          >
            <Settings className="size-4" />
            {!collapsed && <span>Settings</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
