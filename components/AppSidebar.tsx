import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Sun, 
  Moon, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  History, 
  GitBranch, 
  Download, 
  UploadCloud, 
  MessageSquare, 
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
      title: "Workspace",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Agent Builder", url: "/workbench/agent", icon: Cpu, badge: "SPEC" },
        { title: "Test Lab", url: "/workbench/chat", icon: MessageSquare },
        { title: "Release & Export", url: "/export", icon: Download },
      ]
    },
    {
      title: "Repository",
      items: [
        { title: "Version History", url: "/workbench/history", icon: History },
        { 
          title: "Git Repository", 
          url: "/workbench/git", 
          icon: GitBranch, 
          badge: state.git?.isInitialized 
            ? (state.git.sync.ahead > 0 ? `↑${state.git.sync.ahead} ${state.git.currentBranch}` : state.git.currentBranch)
            : undefined 
        },
        { title: "Import Agent", url: "/import", icon: UploadCloud },
      ]
    },
    {
      title: "Preferences",
      items: [
        { title: "Settings", url: "/settings", icon: Settings },
        { title: "Documentation", url: "/docs", icon: BookOpen },
      ]
    }
  ];

  return (
    <aside
      className={cn(
        "h-screen shrink-0 border-r border-border bg-background text-foreground flex flex-col transition-none z-30 select-none",
        collapsed ? "w-14" : "w-60"
      )}
    >
      {/* Brand & Collapse Header - Seamless Paper Canvas */}
      <div className={cn(
        "h-12 border-b border-border flex items-center px-3 gap-2 bg-background",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed ? (
          <Link to="/dashboard" className="flex items-center gap-2 group overflow-hidden">
            <div className="size-7 bg-primary border border-primary flex items-center justify-center text-primary-foreground font-mono font-bold text-xs tracking-tighter shrink-0">
              GA
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight text-foreground font-sans">GitAgent</span>
                <span className="text-[9px] font-mono text-muted-foreground px-1 py-0.2 bg-muted border border-border">
                  SPEC
                </span>
              </div>
              <span className="text-[9px] font-mono text-muted-foreground truncate">
                Workbench v1.4
              </span>
            </div>
          </Link>
        ) : (
          <Link to="/dashboard" title="GitAgent Workbench">
            <div className="size-7 bg-primary border border-primary flex items-center justify-center text-primary-foreground font-mono font-bold text-xs tracking-tighter">
              GA
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "size-6 border border-border flex items-center justify-center text-foreground hover:bg-muted transition-none shrink-0 cursor-pointer bg-background",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>

      {/* When collapsed, a tiny uncollapse button strip */}
      {collapsed && (
        <div className="py-1 flex justify-center border-b border-border bg-background">
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="size-6 border border-border flex items-center justify-center text-foreground hover:bg-muted transition-none cursor-pointer bg-background"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2 pb-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}

            <div className="space-y-1">
              {section.items.map(item => {
                const isActive = location.pathname === item.url || (item.url !== '/dashboard' && location.pathname.startsWith(item.url));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-2.5 text-xs font-sans font-medium transition-none group relative",
                      collapsed ? "justify-center h-8 px-0" : "h-7.5 px-2.5",
                      isActive
                        ? "bg-primary text-primary-foreground border border-primary font-semibold"
                        : "text-foreground hover:bg-muted border border-transparent"
                    )}
                  >
                    <Icon className={cn(
                      "size-3.5 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    
                    {!collapsed && (
                      <span className="truncate flex-1">{item.title}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span className={cn(
                        "text-[9px] font-mono font-medium px-1 py-0.2 shrink-0 border",
                        isActive 
                          ? "bg-[#b45309] text-white border-[#b45309]" 
                          : "bg-muted text-muted-foreground border-border"
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
      <div className="mt-auto border-t border-border p-2 space-y-2 bg-background">
        {/* Active Agent Status Card */}
        {!collapsed && (
          <div className="p-2 border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-2 bg-[#1f6a38] border border-[#2c2a25] status-circle shrink-0" />
              <div className="truncate">
                <p className="text-[9px] font-mono uppercase text-muted-foreground">ACTIVE MANIFEST</p>
                <p className="text-xs font-mono font-bold text-foreground truncate">
                  {state.manifest.name || "untitled-agent"}
                </p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-[#b45309] bg-[#fef3c7] dark:bg-[#332712] px-1.5 py-0.5 border border-[#b45309]/40">
              {state.manifest.compliance?.risk_tier || "T1"}
            </span>
          </div>
        )}

        {/* Global Actions */}
        <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
          <Button
            variant="outline"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={toggleTheme}
            title={settings.theme === 'dark' ? "Switch to Paper & Ink Light Mode" : "Switch to Inverse Charcoal Mode"}
            className={cn(
              "border-border bg-background text-foreground hover:bg-muted",
              !collapsed && "flex-1 justify-start gap-1.5 text-xs font-sans h-7"
            )}
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="size-3.5 text-[#b45309]" />
                {!collapsed && <span>Paper Mode</span>}
              </>
            ) : (
              <>
                <Moon className="size-3.5 text-[#171611]" />
                {!collapsed && <span>Ink Mode</span>}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={() => navigate('/settings')}
            title="Settings"
            className={cn(
              "border-border bg-background text-foreground hover:bg-muted",
              location.pathname === '/settings' && "bg-primary text-primary-foreground border-primary",
              !collapsed && "flex-1 justify-start gap-1.5 text-xs font-sans h-7"
            )}
          >
            <Settings className="size-3.5" />
            {!collapsed && <span>Settings</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
