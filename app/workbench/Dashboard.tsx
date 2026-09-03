import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { assembleSystemPrompt } from '../../lib/gitagent/assembleSystemPrompt';
import { cn } from '@/lib/utils';
import { 
  History, 
  GitBranch, 
  Package, 
  ArrowRight,
  Zap, 
  Shield, 
  Search, 
  Code, 
  Sparkles, 
  Terminal, 
  LayoutDashboard, 
  BookOpen,
  Cpu,
  Layers,
  FileCode,
  Download,
  Server,
  Workflow,
  Database,
  MessageSquare,
  Activity,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();

  const assembledPrompt = useMemo(() => assembleSystemPrompt(state), [state]);
  const tokenEstimate = Math.round(assembledPrompt.length / 4);

  const skillsCount = state.manifest.skills?.length || 0;
  const toolsCount = state.manifest.tools?.length || (skillsCount > 0 ? skillsCount * 3 : 0);
  const workflowsCount = Object.keys(state.workflows || {}).length;
  const docsCount = state.knowledge?.documents?.length || 0;
  const snapshotsCount = state.snapshots?.length || 1;

  // KPI / Stat Cards
  const kpiStats = [
    {
      label: 'SYSTEM TOKENS',
      value: tokenEstimate.toLocaleString(),
      subtext: 'Estimated system prompt payload',
      delta: tokenEstimate > 3000 ? 'High' : 'Optimal',
      deltaType: tokenEstimate > 3000 ? 'warning' : 'success',
      icon: Terminal,
      progress: Math.min(100, (tokenEstimate / 4000) * 100)
    },
    {
      label: 'ACTIVE SKILLS',
      value: skillsCount,
      subtext: `${toolsCount} permissioned tools attached`,
      delta: `+${skillsCount}`,
      deltaType: 'primary',
      icon: Zap,
      progress: Math.min(100, (skillsCount / 8) * 100)
    },
    {
      label: 'COMPLIANCE & RISK',
      value: (state.manifest.compliance?.risk_tier || 'Tier 1').toUpperCase(),
      subtext: 'Security & policy guardrails active',
      delta: 'Audited',
      deltaType: 'success',
      icon: Shield,
      progress: 100
    },
    {
      label: 'WORKFLOW PIPELINES',
      value: workflowsCount,
      subtext: `${docsCount} knowledge documents indexed`,
      delta: `${docsCount} Docs`,
      deltaType: 'primary',
      icon: Workflow,
      progress: Math.min(100, ((workflowsCount + docsCount) / 10) * 100)
    }
  ];

  // Quick Action Modules
  const actionModules = [
    {
      title: 'AI Architect Studio',
      description: 'Conversational agent builder & synthesizer with natural language',
      icon: Sparkles,
      action: () => navigate('/workbench/agent?tab=architect'),
      tag: 'COMPUTE',
      color: 'text-primary'
    },
    {
      title: 'Prompt Workbench',
      description: 'Manage, version, and refine structured system prompt templates',
      icon: Terminal,
      action: () => navigate('/workbench/prompts'),
      tag: 'SYSTEM',
      color: 'text-warning'
    },
    {
      title: 'Skills & Capabilities',
      description: 'Define allowed tools, executable scripts, and API integrations',
      icon: Zap,
      action: () => navigate('/workbench/skills'),
      tag: 'TOOLS',
      color: 'text-emerald-500'
    },
    {
      title: 'Pipelines & Workflows',
      description: 'Design DAG step pipelines and execution DAG graphs',
      icon: Workflow,
      action: () => navigate('/workbench/workflows'),
      tag: 'DAG',
      color: 'text-purple-500'
    },
    {
      title: 'Agent Test Lab',
      description: 'Live interactive chat execution with rule violation checks',
      icon: MessageSquare,
      action: () => navigate('/workbench/chat'),
      tag: 'RUNTIME',
      color: 'text-primary'
    },
    {
      title: 'Git Sync & History',
      description: 'View point-in-time snapshots and sync repository branches',
      icon: GitBranch,
      action: () => navigate('/workbench/git'),
      tag: 'VCS',
      color: 'text-blue-500'
    }
  ];

  // Recent snapshots stream
  const recentSnapshots = state.snapshots?.slice(0, 5) || [
    {
      id: 'init-001',
      name: 'Initial Workspace Scaffold',
      timestamp: 'Just now',
      author: 'AI Architect'
    }
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-transparent text-foreground p-6 md:p-8 space-y-8 select-text">
      {/* Overview Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#A0D2EB]/15 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground font-sans">
              GitAgent <span className="text-accent-warm font-mono font-black">WORKBENCH</span>
            </h1>
            <Badge variant="outline" className="font-mono text-[10px] text-[#A0D2EB] border-[#A0D2EB]/30 uppercase px-2 py-0.5 bg-[#A0D2EB]/5">
              CLI PRECISION v1.4
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-ice-overlay font-sans">
            Master control environment for assembling, inspecting, testing, and packaging production-grade GitAgents.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/docs')}
            className="text-xs gap-1.5 border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
          >
            <BookOpen className="size-3.5" /> Documentation
          </Button>

          <Button
            variant="warm"
            size="sm"
            onClick={() => navigate('/workbench/agent?tab=architect')}
            className="text-xs gap-1.5"
          >
            <Sparkles className="size-3.5" /> Open Agent Builder
          </Button>
        </div>
      </div>

      {/* TOP TIER: KPI / Stat Cards (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="bg-[#1E2833]/85 border-[#A0D2EB]/15 rounded-sm shadow-xs p-4 flex flex-col justify-between hover:border-[#E76F51]/50 transition-colors">
              <div className="flex items-center justify-between pb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/60">
                  {kpi.label}
                </span>
                <div className="size-7 rounded-sm bg-[#141A20]/60 border border-[#A0D2EB]/15 flex items-center justify-center text-[#E76F51]">
                  <Icon className="size-3.5" />
                </div>
              </div>

              <div className="space-y-1 my-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-mono font-black tracking-tight text-foreground">
                    {kpi.value}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[9px] font-mono font-bold uppercase px-1.5 py-0",
                      kpi.deltaType === 'success' && "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                      kpi.deltaType === 'warning' && "text-[#E9C46A] border-[#E9C46A]/30 bg-[#E9C46A]/10",
                      kpi.deltaType === 'primary' && "text-[#E76F51] border-[#E76F51]/30 bg-[#E76F51]/10"
                    )}
                  >
                    {kpi.delta}
                  </Badge>
                </div>
                <p className="text-[10px] font-mono text-[#A0D2EB]/60 truncate">{kpi.subtext}</p>
              </div>

              {/* Mini progress meter */}
              <div className="w-full h-1 bg-[#141A20] rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-gradient-to-r from-[#E76F51] to-[#E9C46A] rounded-full transition-all duration-500" 
                  style={{ width: `${kpi.progress}%` }} 
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* MIDDLE TIER: Primary Data / Visualizations (grid-cols-1 lg:grid-cols-3 gap-6) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Blueprint Breakdown (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[#E76F51]" />
              <h2 className="text-sm font-bold tracking-tight uppercase text-foreground font-sans">Core Architecture Modules</h2>
            </div>
            <span className="text-[10px] font-mono text-[#A0D2EB]/60 uppercase">
              Agent: <strong className="text-foreground">{state.manifest.name || "untitled-agent"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {actionModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <div
                  key={idx}
                  onClick={mod.action}
                  className="group cursor-pointer bg-[#1E2833]/85 border border-[#A0D2EB]/15 hover:border-[#E76F51]/60 rounded-sm p-4 flex flex-col justify-between transition-all hover:shadow-[0_0_16px_rgba(231,111,81,0.12)]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="size-8 rounded-sm bg-[#141A20]/70 border border-[#A0D2EB]/15 flex items-center justify-center text-[#E76F51] group-hover:text-[#E9C46A] transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/70 px-1.5 py-0.5 bg-[#A0D2EB]/10 border border-[#A0D2EB]/15 rounded-sm">
                        {mod.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-foreground group-hover:text-[#E76F51] transition-colors font-sans">{mod.title}</h3>
                      <p className="text-[11px] text-ice-overlay leading-relaxed mt-1 line-clamp-2 font-sans">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#E76F51] pt-3 mt-2 border-t border-[#A0D2EB]/10">
                    <span>LAUNCH</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live System State & Specs Card (Span 1) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#E76F51]" />
              <h2 className="text-sm font-bold tracking-tight uppercase text-foreground font-sans">Runtime Engine State</h2>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              READY
            </Badge>
          </div>

          <Card className="bg-[#1E2833]/85 border-[#A0D2EB]/15 rounded-sm p-4 space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/60">Manifest Identity</span>
                <span className="text-xs font-mono font-semibold text-[#E76F51]">{state.manifest.name || "untitled"}</span>
              </div>
              <p className="text-xs text-ice-overlay line-clamp-2 font-sans">
                {state.manifest.description || "No description set. Use the AI Architect to synthesize the purpose."}
              </p>
            </div>

            <div className="h-px bg-[#A0D2EB]/15" />

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-[#A0D2EB]/10">
                <span className="text-[#A0D2EB]/60">ACTIVE PROVIDER:</span>
                <span className="font-bold uppercase text-foreground">{settings.providerId || 'Google Gemini'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#A0D2EB]/10">
                <span className="text-[#A0D2EB]/60">RISK CLASSIFICATION:</span>
                <span className="font-bold uppercase text-foreground">{state.manifest.compliance?.risk_tier || 'Tier 1 (Low)'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#A0D2EB]/10">
                <span className="text-[#A0D2EB]/60">ATTACHED SKILLS:</span>
                <span className="font-bold text-[#E76F51]">{skillsCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#A0D2EB]/60">TOKEN ESTIMATE:</span>
                <span className="font-bold text-foreground">~{tokenEstimate}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button 
                variant="warm"
                className="w-full h-8 rounded-sm text-xs"
                onClick={() => navigate('/workbench/chat')}
              >
                <MessageSquare className="size-3.5 mr-1.5" /> Launch Chat Test Lab
              </Button>

              <Button 
                variant="outline"
                className="w-full h-8 rounded-sm text-xs border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
                onClick={() => navigate('/export')}
              >
                <Download className="size-3.5 mr-1.5" /> Export Downloadable ZIP
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM TIER: Secondary Tables / Activity Logs */}
      <div className="space-y-4 border-t border-[#A0D2EB]/15 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#E76F51]" />
            <h2 className="text-sm font-bold tracking-tight uppercase text-foreground font-sans">Recent Snapshots & Activity Stream</h2>
          </div>
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={() => navigate('/workbench/history')}
            className="text-[10px] font-mono uppercase tracking-wider text-[#A0D2EB]/70 hover:text-foreground"
          >
            View Full Log →
          </Button>
        </div>

        <div className="border border-[#A0D2EB]/15 rounded-sm bg-[#1E2833]/85 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141A20]/70 border-b border-[#A0D2EB]/15 text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/60">
                <tr>
                  <th className="py-2.5 px-4">Snapshot / Event</th>
                  <th className="py-2.5 px-4">Target Agent</th>
                  <th className="py-2.5 px-4">Tokens</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#A0D2EB]/10 font-mono">
                {recentSnapshots.map((snap: any, i: number) => (
                  <tr key={i} className="hover:bg-[#A0D2EB]/5 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                      <span>{snap.name || `Snapshot #${i + 1}`}</span>
                    </td>
                    <td className="py-2.5 px-4 text-ice-overlay">{state.manifest.name || "untitled-agent"}</td>
                    <td className="py-2.5 px-4 text-[#E76F51] font-bold">{tokenEstimate}</td>
                    <td className="py-2.5 px-4 text-[#A0D2EB]/60">{snap.timestamp || 'Recent'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="xs"
                        onClick={() => navigate('/workbench/history')}
                        className="text-[10px] font-mono text-[#E76F51] hover:text-[#E9C46A]"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
