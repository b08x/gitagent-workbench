import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { assembleSystemPrompt } from '../../lib/gitagent/assembleSystemPrompt';
import { cn } from '@/lib/utils';
import { 
  GitBranch, 
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
  Sparkles,
  SlidersHorizontal
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

  // (3) Restructured Entity-First Modules (Replacing arbitrary hero metric numbers)
  const systemEntities = [
    {
      id: 'ENT-01',
      entity: 'System Prompt Weight',
      category: 'PAYLOAD',
      detail: `${tokenEstimate.toLocaleString()} tokens`,
      benchmark: '8,192 tok target',
      description: 'Assembled manifest payload composed of persona directives, tool schemas, and operational guardrails.',
      status: tokenEstimate > 3000 ? 'Elevated capacity' : 'Optimal density',
      statusVariant: tokenEstimate > 3000 ? 'amber' : 'green',
      icon: Terminal,
      percentage: Math.min(100, Math.round((tokenEstimate / 8192) * 100))
    },
    {
      id: 'ENT-02',
      entity: 'Capability Harness',
      category: 'INTEGRATIONS',
      detail: `${skillsCount} skills · ${toolsCount} tools`,
      benchmark: 'Permissioned runtime',
      description: 'Active executable interfaces with declared schemas, parameter validation, and environment requirements.',
      status: skillsCount > 0 ? 'Harness active' : 'Awaiting skills',
      statusVariant: skillsCount > 0 ? 'green' : 'amber',
      icon: Zap,
      percentage: Math.min(100, (skillsCount / 6) * 100)
    },
    {
      id: 'ENT-03',
      entity: 'Governance Policy',
      category: 'AUDIT',
      detail: `${state.manifest.compliance?.risk_tier || 'Tier 1'} Specification`,
      benchmark: 'Pre-flight verified',
      description: 'Declared safety restrictions, content boundaries, and sandboxed execution privileges.',
      status: 'Audited policy',
      statusVariant: 'green',
      icon: Shield,
      percentage: 100
    },
    {
      id: 'ENT-04',
      entity: 'Repository Anchor',
      category: 'STORAGE',
      detail: state.git?.isInitialized ? `Branch: ${state.git.currentBranch || 'main'}` : 'Local Workspace',
      benchmark: state.git?.isInitialized ? 'Version-controlled' : 'Unversioned scratchpad',
      description: 'Local and remote commit state, repository root synchronization, and persistent manifest tracking.',
      status: state.git?.isInitialized ? 'Versioned' : 'Local draft',
      statusVariant: state.git?.isInitialized ? 'green' : 'secondary',
      icon: GitBranch,
      percentage: state.git?.isInitialized ? 100 : 25
    }
  ];

  // (7) Core Architecture Modules
  const actionModules = [
    {
      modId: 'MOD-01',
      title: 'Agent Builder',
      description: 'Formalize manifest identity, SOUL persona directives, system instructions, and compliance standards.',
      icon: Cpu,
      action: () => navigate('/workbench/agent?tab=architect'),
      tag: 'MANIFEST'
    },
    {
      modId: 'MOD-02',
      title: 'Skills & Tools Workbench',
      description: 'Declare executable functions, parameter validation rules, and third-party API integration points.',
      icon: Zap,
      action: () => navigate('/workbench/skills'),
      tag: 'CAPABILITY'
    },
    {
      modId: 'MOD-03',
      title: 'Knowledge Vault',
      description: 'Attach engineering references, domain documents, and technical context manuals to agent scope.',
      icon: BookOpen,
      action: () => navigate('/workbench/knowledge'),
      tag: 'CONTEXT'
    },
    {
      modId: 'MOD-04',
      title: 'Workflow DAGs',
      description: 'Assemble multi-step deterministic pipelines, sequential tool routes, and decision topologies.',
      icon: Workflow,
      action: () => navigate('/workbench/workflows'),
      tag: 'PIPELINE'
    },
    {
      modId: 'MOD-05',
      title: 'Agent Test Lab',
      description: 'Execute live interactive test conversations with full tool calling traces and compliance telemetry.',
      icon: MessageSquare,
      action: () => navigate('/workbench/chat'),
      tag: 'RUNTIME'
    },
    {
      modId: 'MOD-06',
      title: 'Git Sync & Remote',
      description: 'Track branch commits, inspect structured diffs, push patches, and configure GitHub credentials.',
      icon: GitBranch,
      action: () => navigate('/workbench/git'),
      tag: 'VCS'
    }
  ];

  // Recent snapshots stream
  const recentSnapshots = state.snapshots?.slice(0, 5) || [
    {
      id: 'SNAP-001',
      name: 'Initial Workspace Scaffold',
      timestamp: 'Just now',
      author: 'AI Architect'
    }
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-6 md:p-8 space-y-8 select-text">
      {/* Overview Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-xl md:text-2xl font-bold tracking-tight text-foreground">
              GitAgent <span className="font-sans font-normal text-muted-foreground text-lg">/ Workbench</span>
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono">
              SPEC v1.4
            </Badge>
            <Badge variant="amber" className="text-[10px]">
              PAPER & INK
            </Badge>
          </div>
          <p className="type-doc text-xs md:text-sm text-muted-foreground max-w-3xl leading-relaxed">
            High-density technical workbench for assembling, validating, and publishing GitAgent repositories with mathematically consistent structure.
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
            variant="amber"
            size="sm"
            onClick={() => navigate('/workbench/agent?tab=architect')}
            className="text-xs gap-1.5 font-semibold"
          >
            <Sparkles className="size-3.5" /> Agent Builder
          </Button>
        </div>
      </div>

      {/* (3) TOP TIER: Entity-First System Specifications */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            SYSTEM // ENTITY ALLOCATION & CAPACITY
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            RATIO: <strong className="text-foreground">85% INK · 10% AMBER · 3% GREEN · 2% RED</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemEntities.map((ent) => {
            const Icon = ent.icon;
            return (
              <div 
                key={ent.id} 
                className="bg-card border border-border flex flex-col justify-between hover:bg-muted/40 transition-none"
              >
                {/* Module Header */}
                <div className="bg-muted border-b border-border px-3 py-1.5 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    {ent.id} // {ent.category}
                  </span>
                  <Badge variant={ent.statusVariant as any} className="text-[9px] px-1 py-0">
                    {ent.status}
                  </Badge>
                </div>

                {/* Entity & Specification (Entity emphasized over raw numbers) */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-6 border border-border bg-background flex items-center justify-center text-foreground shrink-0">
                      <Icon className="size-3" />
                    </div>
                    <h3 className="font-mono text-xs font-bold text-foreground truncate">
                      {ent.entity}
                    </h3>
                  </div>

                  <div className="pt-1">
                    <p className="font-mono text-sm font-bold text-foreground">
                      {ent.detail}
                    </p>
                    <p className="font-sans text-[11px] text-muted-foreground mt-0.5">
                      {ent.benchmark}
                    </p>
                  </div>

                  <p className="type-doc text-[11px] text-muted-foreground line-clamp-2 pt-1 border-t border-border/50">
                    {ent.description}
                  </p>
                </div>

                {/* Stepped ink gauge */}
                <div className="w-full h-1 bg-muted border-t border-border overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-none" 
                    style={{ width: `${ent.percentage}%` }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* (7) MIDDLE TIER: Architecture Modules & Live Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Architecture Modules (Span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-foreground" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Core Architecture Modules
              </h2>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              MANIFEST: <strong className="text-foreground">{state.manifest.name || "untitled-agent"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.modId}
                  onClick={mod.action}
                  className="group cursor-pointer bg-card border border-border hover:border-primary p-3.5 flex flex-col justify-between transition-none"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="size-7 border border-border bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-none">
                        <Icon className="size-3.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 border border-border bg-background">
                        {mod.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-xs text-foreground group-hover:text-[#b45309] transition-none">
                        {mod.title}
                      </h3>
                      <p className="type-doc text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/50">
                    <span className="font-mono text-[9px] text-muted-foreground">{mod.modId}</span>
                    <div className="flex items-center gap-1 font-sans text-[11px] font-semibold text-[#b45309] group-hover:underline">
                      <span>CONFIGURE</span>
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Runtime Specs Module (Span 1) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-[#b45309]" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Runtime Specifications
              </h2>
            </div>
            <Badge variant="green" className="text-[9px]">
              VERIFIED
            </Badge>
          </div>

          <div className="bg-card border border-border p-4 space-y-4">
            <div className="space-y-1.5 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">IDENTIFIER</span>
                <span className="font-mono text-xs font-bold text-[#b45309]">{state.manifest.name || "untitled"}</span>
              </div>
              <p className="type-doc text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {state.manifest.description || "No description set. Configure in Agent Builder."}
              </p>
            </div>

            {/* 3 Linguistic Layers: Machine / Operations / Documentation */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">PROVIDER //</span>
                <span className="font-bold text-foreground">{settings.providerId || 'Google Gemini'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">RISK TIER //</span>
                <span className="font-bold text-foreground">{state.manifest.compliance?.risk_tier || 'Tier 1 (Low)'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">SKILLS ATTACHED //</span>
                <span className="font-bold text-[#b45309]">{skillsCount}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">PAYLOAD ESTIMATE //</span>
                <span className="font-bold text-foreground">~{tokenEstimate} tok</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <Button 
                variant="amber"
                className="w-full h-8 text-xs font-semibold"
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
          </div>
        </div>
      </div>

      {/* BOTTOM TIER: Secondary Activity Log Table */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Recent Snapshots & Audit Log
            </h2>
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
              <TableHead>Payload Tokens</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentSnapshots.map((snap: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-[#1f6a38] shrink-0" />
                  <span className="font-mono text-xs">{snap.name || `Snapshot #${i + 1}`}</span>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{state.manifest.name || "untitled-agent"}</TableCell>
                <TableCell className="font-mono text-xs font-bold text-foreground">{tokenEstimate}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{snap.timestamp || 'Recent'}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="xs"
                    onClick={() => navigate('/workbench/history')}
                    className="font-mono text-[10px] text-foreground hover:bg-muted"
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
