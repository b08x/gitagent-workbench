import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { assembleSystemPrompt } from '../../lib/gitagent/assembleSystemPrompt';
import { cn } from '@/lib/utils';
import { 
  History, 
  GitBranch, 
  Package, 
  ArrowRight,
  Zap, 
  Shield, 
  Terminal, 
  BookOpen, 
  Cpu, 
  Layers, 
  Download, 
  Workflow, 
  MessageSquare, 
  Activity, 
  CheckCircle2, 
  Clock, 
  FileCode,
  Sparkles
} from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { state } = useAgentWorkspace();
  const { settings } = useSettings();

  const assembledPrompt = useMemo(() => assembleSystemPrompt(state), [state]);
  const tokenEstimate = Math.round(assembledPrompt.length / 4);

  const skillsCount = state.manifest.skills?.length || 0;
  const toolsCount = state.manifest.tools?.length || (skillsCount > 0 ? skillsCount * 3 : 0);
  const workflowsCount = Object.keys(state.workflows || {}).length;
  const docsCount = state.knowledge?.documents?.length || 0;

  // KPI / Stat Cards
  const kpiStats = [
    {
      label: 'SYSTEM TOKENS',
      value: tokenEstimate.toLocaleString(),
      subtext: 'Estimated system prompt payload',
      delta: tokenEstimate > 3000 ? 'ELEVATED' : 'OPTIMAL',
      deltaVariant: tokenEstimate > 3000 ? 'destructive' : 'olive',
      icon: Terminal,
      progress: Math.min(100, (tokenEstimate / 4000) * 100)
    },
    {
      label: 'ACTIVE SKILLS',
      value: skillsCount,
      subtext: `${toolsCount} permissioned tools attached`,
      delta: `+${skillsCount} ATTACHED`,
      deltaVariant: 'maroon',
      icon: Zap,
      progress: Math.min(100, (skillsCount / 8) * 100)
    },
    {
      label: 'COMPLIANCE & RISK',
      value: (state.manifest.compliance?.risk_tier || 'Tier 1').toUpperCase(),
      subtext: 'Security & policy guardrails active',
      delta: 'AUDITED',
      deltaVariant: 'default',
      icon: Shield,
      progress: 100
    },
    {
      label: 'REPOSITORY STATE',
      value: state.git?.isInitialized ? (state.git.currentBranch || 'main') : 'LOCAL',
      subtext: state.git?.isInitialized ? 'Git repository active' : 'Unversioned scratchpad',
      delta: state.git?.isInitialized ? 'VERSIONED' : 'STANDALONE',
      deltaVariant: state.git?.isInitialized ? 'olive' : 'secondary',
      icon: GitBranch,
      progress: state.git?.isInitialized ? 100 : 25
    }
  ];

  // Quick Action / Core Modules
  const actionModules = [
    {
      title: 'Agent Builder',
      description: 'Define manifest identity, roles, system instructions, and compliance specifications.',
      icon: Cpu,
      action: () => navigate('/workbench/agent?tab=architect'),
      tag: 'MANIFEST'
    },
    {
      title: 'Skills & Tools Workbench',
      description: 'Configure executable functions, parameters, environment credentials, and schema.',
      icon: Zap,
      action: () => navigate('/workbench/skills'),
      tag: 'CAPABILITY'
    },
    {
      title: 'Knowledge Vault',
      description: 'Attach domain documents, engineering guidelines, and reference schemas.',
      icon: BookOpen,
      action: () => navigate('/workbench/knowledge'),
      tag: 'CONTEXT'
    },
    {
      title: 'Workflow DAGs',
      description: 'Assemble multi-step deterministic pipelines and sequential routing graphs.',
      icon: Workflow,
      action: () => navigate('/workbench/workflows'),
      tag: 'PIPELINE'
    },
    {
      title: 'Agent Test Lab',
      description: 'Live interactive chat execution with simulated tool calling and compliance inspection.',
      icon: MessageSquare,
      action: () => navigate('/workbench/chat'),
      tag: 'RUNTIME'
    },
    {
      title: 'Git Sync & Remote',
      description: 'Track branch commits, manage origins, push patches, and configure GitHub tokens.',
      icon: GitBranch,
      action: () => navigate('/workbench/git'),
      tag: 'VCS'
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="type-headline-md text-foreground">
              GitAgent <span className="text-muted-foreground font-normal">Workbench</span>
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              SPEC v1.4
            </Badge>
            <Badge variant="maroon" className="text-[10px]">
              PAPER & INK
            </Badge>
          </div>
          <p className="type-body-sm text-muted-foreground max-w-3xl">
            High-density technical documentation and precision engineering workbench for assembling, inspecting, and packaging GitAgent repositories.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/docs')}
            className="text-xs gap-1.5"
          >
            <BookOpen className="size-3.5" /> Documentation
          </Button>

          <Button
            variant="maroon"
            size="sm"
            onClick={() => navigate('/workbench/agent?tab=architect')}
            className="text-xs gap-1.5"
          >
            <Sparkles className="size-3.5" /> Agent Builder
          </Button>
        </div>
      </div>

      {/* TOP TIER: KPI / Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className="bg-card border border-border p-4 flex flex-col justify-between hover:bg-surface-container-low transition-none"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="type-label-sm text-muted-foreground">
                  {kpi.label}
                </span>
                <div className="size-6 border border-border bg-surface-container flex items-center justify-center text-foreground">
                  <Icon className="size-3" />
                </div>
              </div>

              <div className="space-y-1 my-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {kpi.value}
                  </span>
                  <Badge 
                    variant={kpi.deltaVariant as any} 
                    className="text-[9px]"
                  >
                    {kpi.delta}
                  </Badge>
                </div>
                <p className="type-body-sm text-xs text-muted-foreground truncate">{kpi.subtext}</p>
              </div>

              {/* Physical progress meter: stepped ink gauge */}
              <div className="w-full h-1.5 bg-surface-container-high border border-border/60 overflow-hidden">
                <div 
                  className="h-full bg-[#171611] transition-none" 
                  style={{ width: `${kpi.progress}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* MIDDLE TIER: Architecture Modules & System Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Blueprint Breakdown (Span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[#a03e3d]" />
              <h2 className="type-headline-sm text-sm uppercase">Core Architecture Modules</h2>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              MANIFEST: <strong className="text-foreground">{state.manifest.name || "untitled-agent"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionModules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <div
                  key={idx}
                  onClick={mod.action}
                  className="group cursor-pointer bg-card border border-border hover:border-2 hover:border-[#171611] p-3.5 flex flex-col justify-between transition-none"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="size-7 border border-border bg-surface-container flex items-center justify-center text-foreground group-hover:bg-[#171611] group-hover:text-[#fcf9f2] transition-none">
                        <Icon className="size-3.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1 py-0.5 border border-border bg-surface-container-low">
                        {mod.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-xs text-foreground group-hover:text-[#a03e3d] transition-none">{mod.title}</h3>
                      <p className="type-body-sm text-[11px] text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-[#a03e3d] pt-2.5 mt-2 border-t border-border/40">
                    <span>LAUNCH</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live System State & Specs Card (Span 1) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#a03e3d]" />
              <h2 className="type-headline-sm text-sm uppercase">Runtime Specs</h2>
            </div>
            <Badge variant="olive" className="text-[9px]">
              VERIFIED
            </Badge>
          </div>

          <Card className="bg-card border border-border p-4 space-y-4">
            <div className="space-y-1.5 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="type-label-sm text-muted-foreground">IDENTIFIER</span>
                <span className="font-mono text-xs font-bold text-[#a03e3d]">{state.manifest.name || "untitled"}</span>
              </div>
              <p className="type-body-sm text-xs text-muted-foreground line-clamp-2">
                {state.manifest.description || "No description set. Configure in Agent Builder."}
              </p>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">PROVIDER:</span>
                <span className="font-bold text-foreground">{settings.providerId || 'Google Gemini'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">RISK TIER:</span>
                <span className="font-bold text-foreground">{state.manifest.compliance?.risk_tier || 'Tier 1 (Low)'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">SKILLS ATTACHED:</span>
                <span className="font-bold text-[#a03e3d]">{skillsCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">PAYLOAD TOKENS:</span>
                <span className="font-bold text-foreground">~{tokenEstimate}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Button 
                variant="maroon"
                className="w-full h-8 text-xs"
                onClick={() => navigate('/workbench/chat')}
              >
                <MessageSquare className="size-3.5 mr-1.5" /> Launch Chat Test Lab
              </Button>

              <Button 
                variant="outline"
                className="w-full h-8 text-xs"
                onClick={() => navigate('/export')}
              >
                <Download className="size-3.5 mr-1.5" /> Export Repository ZIP
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* BOTTOM TIER: Secondary Activity Log Table */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#a03e3d]" />
            <h2 className="type-headline-sm text-sm uppercase">Recent Snapshots & Activity Stream</h2>
          </div>
          <Button 
            variant="ghost" 
            size="xs" 
            onClick={() => navigate('/workbench/history')}
            className="font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
          >
            Full History Log →
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot / Event</TableHead>
              <TableHead>Target Agent</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSnapshots.map((snap: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#1f2f00] shrink-0" />
                  <span>{snap.name || `Snapshot #${i + 1}`}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{state.manifest.name || "untitled-agent"}</TableCell>
                <TableCell className="text-[#a03e3d] font-bold">{tokenEstimate}</TableCell>
                <TableCell className="text-muted-foreground">{snap.timestamp || 'Recent'}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="xs"
                    onClick={() => navigate('/workbench/history')}
                    className="font-mono text-[10px] text-[#a03e3d] hover:bg-surface-container-high"
                  >
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
