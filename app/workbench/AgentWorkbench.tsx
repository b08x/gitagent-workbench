import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assembleSystemPrompt } from '../../lib/gitagent/assembleSystemPrompt';
import { 
  History, 
  GitBranch, 
  Settings as SettingsIcon, 
  Terminal,
  Sparkles,
  ShieldCheck,
  Zap,
  Cpu,
  ChevronRight,
  LayoutDashboard,
  Save,
  Download,
  MessageSquare,
  Copy,
  Check,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Maximize2,
  Workflow,
  Database,
  Layers,
  Search,
  BookOpen,
  Eye,
  SlidersHorizontal,
  Code2
} from 'lucide-react';
import { AgentWizard } from './AgentWizard';
import { RuntimeFrameworkStep } from '../wizard/steps/RuntimeFrameworkStep';
import { IdentityStep } from '../wizard/steps/IdentityStep';
import { CapabilitiesStep } from '../wizard/steps/CapabilitiesStep';
import { ModelStep } from '../wizard/steps/ModelStep';
import { cn } from '@/lib/utils';

export function AgentWorkbench() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAgentWorkspace();
  const { settings, updateSettings } = useSettings();

  const activeTab = searchParams.get('tab') || 'target-runtime';
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showInspector, setShowInspector] = useState(true);

  const assembledPrompt = useMemo(() => assembleSystemPrompt(state), [state]);
  const tokenEstimate = Math.round(assembledPrompt.length / 4);

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const copySystemPrompt = () => {
    navigator.clipboard.writeText(assembledPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const hasAgentName = !!(state.manifest.name && state.manifest.name.trim().length > 0);
  const isKebabCaseValid = hasAgentName && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(state.manifest.name || '');

  const sections = [
    { 
      id: 'target-runtime', 
      title: 'Target Runtime', 
      icon: Layers, 
      badge: state.targetFramework ? (state.targetFramework.replace('_', ' ').toUpperCase()) : 'HERMES', 
      badgeType: 'success' as const,
      desc: 'Execution harness, canonical tools & rules',
      ready: true
    },
    { 
      id: 'architect', 
      title: 'AI Architect Studio', 
      icon: Sparkles, 
      badge: 'COMPUTE', 
      badgeType: 'info' as const,
      desc: 'Conversational agent generation & updates',
      ready: true
    },
    { 
      id: 'identity', 
      title: 'Identity & Soul', 
      icon: ShieldCheck, 
      badge: state.soul ? 'DEFINED' : 'PENDING', 
      badgeType: state.soul ? 'success' as const : 'warning' as const,
      desc: 'Core persona, communication style, values',
      ready: !!state.soul
    },
    { 
      id: 'capabilities', 
      title: 'Capabilities & Tools', 
      icon: Zap, 
      badge: (state.skillsList?.length || 0) > 0 ? `${state.skillsList.length} Skills` : '0 Skills', 
      badgeType: (state.skillsList?.length || 0) > 0 ? 'success' as const : 'warning' as const,
      desc: 'Tool permissions, custom skills & MCP',
      ready: (state.skillsList?.length || 0) > 0
    },
    { 
      id: 'runtime', 
      title: 'Model & Parameters', 
      icon: Cpu, 
      badge: settings.providerId || 'AUTO', 
      badgeType: 'neutral' as const,
      desc: 'LLM parameters, temperature, limits',
      ready: true
    },
    { 
      id: 'prompt', 
      title: 'Compiled System Prompt', 
      icon: Terminal, 
      badge: `${tokenEstimate} tok`, 
      badgeType: 'neutral' as const,
      desc: 'Live concatenated system instructions',
      ready: true
    }
  ];

  // Agent Health score checklist
  const healthChecklist = [
    {
      id: 'target-runtime',
      label: 'Target Runtime',
      tab: 'target-runtime',
      met: !!state.targetFramework,
      desc: state.targetFramework ? `Harness: ${state.targetFramework.replace('_', ' ').toUpperCase()}` : 'Select an execution harness'
    },
    {
      id: 'name',
      label: 'Agent Name',
      tab: 'identity',
      met: isKebabCaseValid,
      desc: hasAgentName ? (isKebabCaseValid ? `${state.manifest.name}` : 'Must be lowercase kebab-case') : 'Enter a valid kebab-case name'
    },
    {
      id: 'description',
      label: 'Purpose Description',
      tab: 'identity',
      met: !!(state.manifest.description && state.manifest.description.trim().length > 0),
      desc: state.manifest.description ? 'Description configured' : 'Define agent scope and purpose'
    },
    {
      id: 'soul',
      label: 'Identity & SOUL.md',
      tab: 'identity',
      met: !!(state.soul && state.soul.trim().length > 0),
      desc: state.soul ? 'Core persona and principles configured' : 'Define core identity and style'
    },
    {
      id: 'skills',
      label: 'Skills & Tools',
      tab: 'capabilities',
      met: (state.skillsList?.length || 0) > 0,
      desc: (state.skillsList?.length || 0) > 0 ? `${state.skillsList.length} skill(s) configured` : 'Add at least one skill'
    }
  ];

  const metCriteriaCount = healthChecklist.filter(item => item.met).length;
  const completeness = Math.round((metCriteriaCount / healthChecklist.length) * 100);

  const [showHealthBreakdown, setShowHealthBreakdown] = useState(true);

  const getBadgeClasses = (type: 'success' | 'warning' | 'info' | 'neutral', isActive: boolean) => {
    if (isActive) {
      if (type === 'success') return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      if (type === 'warning') return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      if (type === 'info') return 'bg-primary/20 text-primary border border-primary/30';
      return 'bg-muted text-foreground border border-border/80';
    }
    if (type === 'success') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
    if (type === 'warning') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold';
    if (type === 'info') return 'bg-primary/10 text-primary/90 border border-primary/20';
    return 'bg-muted/80 text-muted-foreground border border-border/60';
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-background text-foreground select-text">
      {/* Top Action & Breadcrumb Bar */}
      <div className="h-14 border-b border-border/80 bg-card/60 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <Cpu className="size-4.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm tracking-tight text-foreground">Agent Workbench</span>
            <span className="text-muted-foreground/60 text-xs">/</span>
            <span className="font-mono text-xs font-bold text-primary truncate">
              {state.manifest.name || "untitled-agent"}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono text-[9px] px-1.5 py-0 uppercase",
                completeness === 100 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
                  : "bg-warning/10 text-warning border-warning/30"
              )}
            >
              {completeness}% Configured
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-muted/40 border border-border/60 rounded-sm text-[11px] font-mono">
            <span className="text-muted-foreground">TOKENS: <strong className="text-foreground font-bold">{tokenEstimate.toLocaleString()}</strong></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">SKILLS: <strong className="text-primary font-bold">{state.manifest.skills?.length || 0}</strong></span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">RISK: <strong className="text-foreground font-bold">{state.manifest.compliance?.risk_tier || 'T1'}</strong></span>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/workbench/chat')}
            className="text-xs font-medium gap-1.5"
          >
            <MessageSquare className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Test in Lab</span>
          </Button>

          <Button 
            size="sm" 
            onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'Manual Save' })}
            className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs transition-all"
          >
            <Save className="size-3.5" />
            <span className="hidden sm:inline">Snapshot</span>
          </Button>

          <Button 
            variant="outline" 
            size="icon-sm" 
            onClick={() => navigate('/export')}
            title="Export Repository ZIP"
            className="text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => setShowInspector(prev => !prev)}
            title={showInspector ? "Hide Inspector Panel" : "Show Inspector Panel"}
            className={cn("text-muted-foreground hover:text-foreground", showInspector && "bg-muted/80 text-foreground")}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Horizontal Tabs Header Bar on Top */}
      <div className="h-11 border-b border-border/80 bg-card/40 px-5 flex items-center justify-between shrink-0 overflow-x-auto gap-3 select-none">
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeTab === sec.id;

            return (
              <button
                key={sec.id}
                onClick={() => handleTabChange(sec.id)}
                className={cn(
                  "h-8 px-3 rounded-sm text-xs font-medium transition-all flex items-center gap-2 shrink-0 border cursor-pointer",
                  isActive 
                    ? "bg-card border-primary/50 text-foreground font-semibold shadow-xs" 
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("size-3.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{sec.title}</span>
                <span className={cn(
                  "text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-sm transition-all",
                  getBadgeClasses(sec.badgeType, isActive)
                )}>
                  {sec.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Workbench Links */}
        <div className="hidden xl:flex items-center gap-2 shrink-0 pl-2 border-l border-border/60">
          <button
            onClick={() => navigate('/workbench/prompts')}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded-sm hover:bg-muted/50 transition-colors flex items-center gap-1"
          >
            <Terminal className="size-3 text-primary" /> Prompts
          </button>
          <button
            onClick={() => navigate('/workbench/skills')}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded-sm hover:bg-muted/50 transition-colors flex items-center gap-1"
          >
            <Zap className="size-3 text-primary" /> Skills
          </button>
          <button
            onClick={() => navigate('/workbench/workflows')}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded-sm hover:bg-muted/50 transition-colors flex items-center gap-1"
          >
            <Workflow className="size-3 text-primary" /> Pipelines
          </button>
          <button
            onClick={() => navigate('/workbench/knowledge')}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded-sm hover:bg-muted/50 transition-colors flex items-center gap-1"
          >
            <Database className="size-3 text-primary" /> Knowledge
          </button>
        </div>
      </div>

      {/* Main Work Area: Center Content + Right Inspector */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* Center Primary Viewport (Flex-1) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            {activeTab === 'architect' && (
              <div className="h-full min-h-[580px]">
                <AgentWizard onTabChange={handleTabChange} />
              </div>
            )}

            {activeTab === 'target-runtime' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-4 bg-muted/20 border border-border/80 rounded-md">
                  <RuntimeFrameworkStep />
                </div>
              </div>
            )}

            {activeTab === 'identity' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-4 bg-muted/20 border border-border/80 rounded-md">
                  <IdentityStep />
                </div>
              </div>
            )}

            {activeTab === 'capabilities' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-4 bg-muted/20 border border-border/80 rounded-md">
                  <CapabilitiesStep />
                </div>
              </div>
            )}

            {activeTab === 'runtime' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-4 bg-muted/20 border border-border/80 rounded-md">
                  <ModelStep hideGeneration={true} />
                </div>
              </div>
            )}

            {activeTab === 'prompt' && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between p-4 bg-card border border-border/80 rounded-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-4 text-primary" />
                      <h3 className="font-bold text-sm">Compiled System Instructions</h3>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {tokenEstimate} tokens
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is the final text injected into runtime models when executing agent requests.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copySystemPrompt}
                    className="gap-1.5 text-xs font-mono"
                  >
                    {copiedPrompt ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copiedPrompt ? "Copied" : "Copy Prompt"}
                  </Button>
                </div>

                <div className="p-4 bg-muted/20 border border-border/80 rounded-md overflow-x-auto">
                  <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap selection:bg-primary/20">
                    {assembledPrompt}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Inspector / Action Panel (~280px-320px) */}
        {showInspector && (
          <div className="w-80 shrink-0 border-l border-border/80 bg-card/40 flex flex-col overflow-hidden select-none">
            {/* Inspector Header */}
            <div className="h-11 px-4 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Sliders className="size-3 text-primary" /> Inspector & Specs
              </span>
              <button 
                onClick={() => setShowInspector(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            {/* Inspector Form Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Specification Health Interactive Checklist Card */}
              <div className="p-3 rounded-sm bg-card border border-border/80 space-y-2.5">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowHealthBreakdown(prev => !prev)}
                >
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    Specification Health
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-xs font-mono font-bold",
                      completeness === 100 ? "text-emerald-500" : completeness > 50 ? "text-primary" : "text-amber-500"
                    )}>
                      {completeness}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {showHealthBreakdown ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      completeness === 100 ? "bg-emerald-500" : "bg-primary terracotta-glow-sm"
                    )}
                    style={{ width: `${completeness}%` }}
                  />
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight">
                  {completeness === 100 
                    ? "✓ Full specification configured. Ready to export or deploy." 
                    : `${metCriteriaCount} of ${healthChecklist.length} requirements met. Click items to complete.`}
                </p>

                {showHealthBreakdown && (
                  <div className="pt-2 border-t border-border/60 space-y-1.5 animate-in fade-in duration-150">
                    {healthChecklist.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleTabChange(item.tab)}
                        className={cn(
                          "p-1.5 rounded text-[10px] font-mono flex items-center justify-between cursor-pointer transition-colors",
                          item.met 
                            ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" 
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {item.met ? (
                            <Check className="size-3 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="size-3 rounded-full border border-muted-foreground/40 shrink-0 inline-block" />
                          )}
                          <span className={cn("font-medium truncate", !item.met && "text-foreground")}>{item.label}</span>
                        </div>
                        <span className="text-[9px] opacity-75 shrink-0 ml-1">
                          {item.met ? "Pass" : "Missing →"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manifest Metadata */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Manifest Metadata
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-foreground">Agent Name</Label>
                    <span className={cn(
                      "text-[9px] font-mono font-bold uppercase",
                      !hasAgentName ? "text-muted-foreground" : isKebabCaseValid ? "text-emerald-500" : "text-destructive"
                    )}>
                      {!hasAgentName ? "Draft (Optional)" : isKebabCaseValid ? "Valid Kebab-Case" : "Invalid Format"}
                    </span>
                  </div>
                  <Input 
                    value={state.manifest.name || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { name: e.target.value }
                    })}
                    placeholder="my-agent-name"
                    className={cn(
                      "h-8 text-xs font-mono rounded-sm bg-background border-border/80",
                      hasAgentName && !isKebabCaseValid && "border-destructive focus-visible:ring-destructive/30"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-foreground">Version</Label>
                    <Input 
                      value={state.manifest.version || '1.0.0'} 
                      onChange={(e) => dispatch({
                        type: 'UPDATE_MANIFEST',
                        payload: { version: e.target.value }
                      })}
                      className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-foreground">Risk Tier</Label>
                    <Select 
                      value={state.manifest.compliance?.risk_tier || 'T1'}
                      onValueChange={(val) => dispatch({
                        type: 'UPDATE_MANIFEST',
                        payload: { compliance: { ...state.manifest.compliance, risk_tier: val as any } }
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T1">T1 (Low Risk)</SelectItem>
                        <SelectItem value="T2">T2 (Medium)</SelectItem>
                        <SelectItem value="T3">T3 (High Risk)</SelectItem>
                        <SelectItem value="T4">T4 (Autonomous)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-foreground">
                    Author <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input 
                    value={state.manifest.author || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { author: e.target.value }
                    })}
                    placeholder="Author name or team"
                    className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-foreground">Description</Label>
                  <Textarea 
                    value={state.manifest.description || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { description: e.target.value }
                    })}
                    placeholder="Brief description of the agent's responsibilities..."
                    className="min-h-[64px] text-xs resize-none rounded-sm bg-background border-border/80"
                  />
                </div>
              </div>

              <div className="h-px bg-border/80" />

              {/* Memory & Ingestion */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Memory & State
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-foreground">Memory Strategy</Label>
                  <Select 
                    value={state.manifest.memory?.strategy || 'ephemeral'}
                    onValueChange={(val) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { memory: { ...state.manifest.memory, strategy: val as any } }
                    })}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-border/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ephemeral">Ephemeral (Session)</SelectItem>
                      <SelectItem value="buffer">Buffer (Fixed Window)</SelectItem>
                      <SelectItem value="vector">Vector / Semantic</SelectItem>
                      <SelectItem value="summary">Rolling Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-foreground">Max Context Tokens</Label>
                  <Input 
                    type="number"
                    value={state.manifest.memory?.max_tokens || 8192} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { memory: { ...state.manifest.memory, max_tokens: parseInt(e.target.value) || 8192 } }
                    })}
                    className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                  />
                </div>
              </div>

              <div className="h-px bg-border/80" />

              {/* File Injection Slots Overview */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  File Injection Slots
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-sm bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileCode className="size-3 text-primary" /> SOUL.md
                    </span>
                    <Badge variant={state.soul ? "secondary" : "outline"} className="text-[9px]">
                      {state.soul ? `${Math.round(state.soul.length / 4)} tok` : 'EMPTY'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-sm bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileCode className="size-3 text-primary" /> RULES.md
                    </span>
                    <Badge variant={state.rules ? "secondary" : "outline"} className="text-[9px]">
                      {state.rules ? `${Math.round(state.rules.length / 4)} tok` : 'EMPTY'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-sm bg-muted/30 border border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileCode className="size-3 text-primary" /> PROMPT.md
                    </span>
                    <Badge variant={state.prompt_md ? "secondary" : "outline"} className="text-[9px]">
                      {state.prompt_md ? `${Math.round(state.prompt_md.length / 4)} tok` : 'EMPTY'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 space-y-2">
                <Button 
                  onClick={() => navigate('/editor')}
                  variant="outline" 
                  className="w-full h-8 rounded-sm text-xs font-medium gap-1.5 justify-center"
                >
                  <Code2 className="size-3.5 text-primary" />
                  <span>Open Full File Editor</span>
                </Button>

                <Button 
                  onClick={() => navigate('/export')}
                  className="w-full h-8.5 rounded-sm bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="size-3.5" />
                  <span>Export Agent Bundle</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
