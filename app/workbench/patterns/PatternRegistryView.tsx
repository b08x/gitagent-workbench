import React, { useState, useMemo } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { 
  ARCHITECTURE_PATTERNS, 
  PatternDefinition, 
  PatternPrerequisiteRequirement,
  createManagementProposal,
  ToolPolicy
} from '../../../lib/management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  GitFork, 
  CheckCircle2, 
  Wrench, 
  Database, 
  Layers, 
  UserCheck, 
  Search, 
  SlidersHorizontal, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Info, 
  HelpCircle,
  Table as TableIcon,
  LayoutGrid,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuidedManagerDialog } from '../components/GuidedManagerDialog';
import { PatternRegistry } from '@/src/app/workbench/agent/PatternRegistry';

const ICON_MAP: Record<string, React.ElementType> = {
  UserCheck,
  Users,
  GitFork,
  CheckCircle2,
  Wrench,
  Database,
  Layers
};

export function PatternRegistryView() {
  const { state, dispatch } = useAgentWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopology, setSelectedTopology] = useState<string>('all');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'create' | 'grid' | 'matrix'>('create');
  const [expandedPatternId, setExpandedPatternId] = useState<string | null>(null);
  const [appliedFeedbackPattern, setAppliedFeedbackPattern] = useState<string | null>(null);
  const [managerPatternId, setManagerPatternId] = useState<string | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Filtered patterns
  const filteredPatterns = useMemo(() => {
    return ARCHITECTURE_PATTERNS.filter(pattern => {
      const matchesSearch = 
        pattern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pattern.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pattern.badge.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTopology = 
        selectedTopology === 'all' || pattern.topology === selectedTopology;

      const matchesComplexity = 
        selectedComplexity === 'all' || pattern.complexityLevel.toLowerCase() === selectedComplexity.toLowerCase();

      return matchesSearch && matchesTopology && matchesComplexity;
    });
  }, [searchQuery, selectedTopology, selectedComplexity]);

  // Check if a pattern is active on the current workspace
  const isPatternActive = (pattern: PatternDefinition): boolean => {
    const rulesMatch = !!(state.rules && String(state.rules).includes(pattern.name));
    const subagentsMatch = !pattern.supportsSubagents || (state.subAgentsList || []).length > 0;
    return rulesMatch && subagentsMatch;
  };

  // Evaluate prerequisites for a pattern against active workspace
  const evaluatePatternReadiness = (pattern: PatternDefinition) => {
    const results = pattern.prerequisites.map(prereq => ({
      ...prereq,
      result: prereq.check(state)
    }));
    const metCount = results.filter(r => r.result.met).length;
    const totalCount = results.length;
    const isReady = metCount === totalCount;
    return { results, metCount, totalCount, isReady };
  };

  // Direct Apply action: creates and applies a versioned proposal atomically
  const handleApplyPattern = (pattern: PatternDefinition) => {
    const subagentPatches = (pattern.subagentPresets || []).map(preset => ({
      operation: 'create' as const,
      name: preset.name,
      role: preset.role,
      description: preset.description,
      permissions: preset.permissions
    }));

    const toolPolicyPatch: ToolPolicy = {
      mode: pattern.defaultToolPolicyMode,
      allowedTools: state.toolPolicy?.allowedTools || (state.toolsList || []).map(t => t.name),
      disabledTools: state.toolPolicy?.disabledTools || [],
      perToolPermissions: state.toolPolicy?.perToolPermissions || {}
    };

    const parentPatch: Record<string, any> = {
      selectedTemplate: pattern.recommendedTemplate,
      delegation: { mode: pattern.defaultDelegationMode }
    };

    if (pattern.recommendedMemoryStrategy !== 'ephemeral') {
      parentPatch.manifest = {
        ...(state.manifest || {}),
        memory: {
          strategy: pattern.recommendedMemoryStrategy
        }
      };
    }

    const proposal = createManagementProposal({
      action: 'edit',
      workspace: state,
      patternId: pattern.id,
      inversionPrefixEnabled: true,
      parentPatch,
      subagentPatches: (state.subAgentsList || []).length === 0 ? subagentPatches : [],
      toolPolicyPatch,
      summary: `Applied Architecture Pattern: ${pattern.name}`
    });

    dispatch({ type: 'APPLY_MANAGEMENT_PROPOSAL', payload: proposal });
    setAppliedFeedbackPattern(pattern.id);
    setTimeout(() => setAppliedFeedbackPattern(null), 3000);
  };

  const handleOpenInManager = (patternId: string) => {
    setManagerPatternId(patternId);
    setIsManagerOpen(true);
  };

  return (
    <div className="h-full w-full overflow-y-auto p-5 md:p-8 space-y-6 bg-background text-foreground select-text">
      
      {/* Top Banner & Header */}
      <div className="border border-border bg-card p-6 rounded-none relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider text-primary border-primary/40">
                Pattern Registry
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                Verified Autonomous Topologies
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Architecture Base Patterns
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Explore 7 foundational agent topologies adapted from the Mistral Vibe manager architecture. 
              Each pattern defines bounded orchestration loops, delegation triggers, memory boundaries, and prerequisite requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex bg-muted p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setViewMode('create')}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer",
                  viewMode === 'create' ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className="size-3.5 text-primary" /> Create Registry
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer",
                  viewMode === 'grid' ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-3.5" /> Prerequisites Audit
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={cn(
                  "px-3 py-1.5 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer",
                  viewMode === 'matrix' ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TableIcon className="size-3.5" /> Comparison Matrix
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManagerPatternId('single_agent');
                setIsManagerOpen(true);
              }}
              className="text-xs font-mono gap-1.5 border-primary/50 text-foreground hover:bg-muted"
            >
              <SlidersHorizontal className="size-3.5 text-primary" /> Guided Manager
            </Button>
          </div>
        </div>

        {/* Live Workspace Readiness Summary Strip */}
        <div className="mt-5 pt-4 border-t border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Active Agent:</span>
            <strong className="text-foreground">{state.manifest?.name || 'untitled-agent'}</strong>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Template:</span>
            <Badge variant="outline" className="text-[10px]">{state.selectedTemplate}</Badge>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Subagents:</span>
            <strong className="text-foreground">{(state.subAgentsList || []).length}</strong>
            <span className="text-border">|</span>
            <span className="text-muted-foreground">Tools Mode:</span>
            <Badge variant="outline" className="text-[10px] uppercase">
              {state.toolPolicy?.mode || (state.toolsList?.length ? 'allowlist' : 'unrestricted')}
            </Badge>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="size-3 text-primary" />
            <span>Prerequisites evaluate live against your active agent specifications.</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Topology Filters */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
            <span className="text-muted-foreground text-[10px] uppercase mr-1">Topology:</span>
            {[
              { id: 'all', label: 'All (7)' },
              { id: 'isolated', label: 'Isolated' },
              { id: 'peer-to-peer', label: 'Peer-to-Peer' },
              { id: 'hierarchical', label: 'Hierarchical' },
              { id: 'pipeline', label: 'Pipeline' },
              { id: 'centralized', label: 'Centralized' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTopology(item.id)}
                className={cn(
                  "px-2.5 py-1 border transition-colors cursor-pointer",
                  selectedTopology === item.id 
                    ? "border-primary bg-primary/20 text-foreground font-bold" 
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Complexity Filter */}
          <div className="flex items-center gap-1 text-xs font-mono ml-0 sm:ml-2">
            <span className="text-muted-foreground text-[10px] uppercase mr-1">Complexity:</span>
            {['all', 'Low', 'Medium', 'High', 'Enterprise'].map(comp => (
              <button
                key={comp}
                type="button"
                onClick={() => setSelectedComplexity(comp)}
                className={cn(
                  "px-2 py-0.5 border text-[11px] transition-colors cursor-pointer",
                  selectedComplexity === comp
                    ? "border-primary bg-primary/20 text-foreground font-bold"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search pattern or keyword..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs font-mono rounded-none bg-card border-border"
          />
        </div>
      </div>

      {/* VIEW 0: CREATE PATTERN REGISTRY VIEW */}
      {viewMode === 'create' && (
        <PatternRegistry hideHeader={true} />
      )}

      {/* VIEW 1: CARD GRID VIEW (PREREQUISITES AUDIT) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredPatterns.map(pattern => {
            const Icon = ICON_MAP[pattern.iconName] || Layers;
            const readiness = evaluatePatternReadiness(pattern);
            const active = isPatternActive(pattern);
            const isExpanded = expandedPatternId === pattern.id;

            return (
              <Card 
                key={pattern.id} 
                className={cn(
                  "border rounded-none bg-card transition-all flex flex-col justify-between",
                  active ? "border-primary ring-1 ring-primary/40 bg-primary/[0.03]" : "border-border hover:border-primary/50"
                )}
              >
                <div>
                  {/* Card Header Strip */}
                  <CardHeader className="p-5 pb-3 border-b border-border bg-muted/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-sm font-mono font-bold text-foreground">
                              {pattern.name}
                            </CardTitle>
                            {active && (
                              <Badge variant="green" className="text-[9px] font-mono py-0 px-1.5">
                                Active on Workspace
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[9px] font-mono uppercase">
                              {pattern.topology}
                            </Badge>
                            <Badge 
                              variant={pattern.complexityLevel === 'Low' ? 'outline' : pattern.complexityLevel === 'Medium' ? 'amber' : 'destructive'} 
                              className="text-[9px] font-mono"
                            >
                              {pattern.complexityLevel} Complexity
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              Overhead: {pattern.estimatedTokenOverhead}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Readiness Meter Badge */}
                      <Badge 
                        variant={readiness.isReady ? "green" : "amber"} 
                        className="text-[10px] font-mono py-1 px-2 shrink-0 flex items-center gap-1"
                        title={`${readiness.metCount} of ${readiness.totalCount} prerequisites satisfied`}
                      >
                        {readiness.isReady ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            <span>100% Ready</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="size-3" />
                            <span>{readiness.metCount}/{readiness.totalCount} Prerequisites</span>
                          </>
                        )}
                      </Badge>
                    </div>

                    <CardDescription className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      {pattern.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    {/* Key Benefits */}
                    {pattern.keyBenefits && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                          Key Architecture Benefits
                        </span>
                        <div className="space-y-1">
                          {pattern.keyBenefits.map((benefit, bIdx) => (
                            <div key={bIdx} className="text-xs flex items-start gap-2 text-foreground/90">
                              <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prerequisite Requirements Block */}
                    <div className="border border-border p-3.5 bg-background space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-primary" /> Prerequisite Requirements
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {readiness.metCount} of {readiness.totalCount} Met
                        </span>
                      </div>

                      <div className="space-y-2">
                        {readiness.results.map((prereq) => (
                          <div 
                            key={prereq.id} 
                            className={cn(
                              "p-2.5 border text-xs font-mono space-y-1 transition-colors",
                              prereq.result.met 
                                ? "border-[#1f6a38]/30 bg-[#1f6a38]/5 text-foreground" 
                                : "border-amber-500/40 bg-amber-500/5 text-foreground"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold flex items-center gap-1.5 text-foreground">
                                {prereq.result.met ? (
                                  <CheckCircle2 className="size-3 text-[#1f6a38] shrink-0" />
                                ) : (
                                  <AlertTriangle className="size-3 text-amber-500 shrink-0" />
                                )}
                                {prereq.label}
                              </span>
                              <Badge 
                                variant={prereq.result.met ? "green" : "amber"} 
                                className="text-[9px] uppercase px-1.5 py-0"
                              >
                                {prereq.category}
                              </Badge>
                            </div>

                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {prereq.description}
                            </p>

                            <div className="pt-1 flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">
                                Current: <strong className={prereq.result.met ? "text-[#1f6a38]" : "text-amber-500"}>{prereq.result.currentSummary}</strong>
                              </span>
                              {!prereq.result.met && prereq.result.fixHint && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  💡 {prereq.result.fixHint}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pre-configured Subagents Preview (if any) */}
                    {pattern.subagentPresets && pattern.subagentPresets.length > 0 && (
                      <div className="border border-border p-3 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Users className="size-3 text-primary" /> Pre-Configured Subagents ({pattern.subagentPresets.length})
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono">Bundled Presets</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {pattern.subagentPresets.map((sub, sIdx) => (
                            <div key={sIdx} className="p-2 border border-border bg-background font-mono text-xs">
                              <div className="flex items-center justify-between">
                                <strong className="text-foreground">{sub.name}</strong>
                                <Badge variant="secondary" className="text-[9px]">{sub.role}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                                {sub.description}
                              </p>
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {sub.permissions.map(p => (
                                  <Badge key={p} variant="outline" className="text-[8px] uppercase font-mono">{p}</Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collapsible Rules & Demeanor Additions */}
                    <div className="border border-border p-3 bg-muted/10">
                      <button
                        type="button"
                        onClick={() => setExpandedPatternId(isExpanded ? null : pattern.id)}
                        className="w-full flex items-center justify-between text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                          {isExpanded ? <ChevronDown className="size-3 text-primary" /> : <ChevronRight className="size-3 text-primary" />}
                          Inspect Injected Rules & SOUL Demeanor ({pattern.rulesAdditions.length + pattern.soulAdditions.length})
                        </span>
                        <span className="text-[10px] underline">{isExpanded ? 'Collapse' : 'Expand'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3 pt-2 border-t border-border font-mono text-xs animate-in slide-in-from-top-1">
                          <div>
                            <span className="text-[10px] font-bold text-primary block uppercase">Rules Additions (RULES.md):</span>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-1 text-[11px]">
                              {pattern.rulesAdditions.map((rule, rIdx) => (
                                <li key={rIdx}>{rule}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-primary block uppercase">SOUL Demeanor (SOUL.md):</span>
                            <p className="text-[11px] text-muted-foreground mt-1 italic">
                              "{pattern.soulAdditions.join(' ')}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenInManager(pattern.id)}
                      className="text-xs font-mono gap-1 text-foreground hover:bg-muted"
                    >
                      <SlidersHorizontal className="size-3" /> Guided Wizard
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {appliedFeedbackPattern === pattern.id ? (
                      <Badge variant="green" className="text-xs py-1 px-2 flex items-center gap-1 font-mono">
                        <Check className="size-3" /> Pattern Applied!
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleApplyPattern(pattern)}
                        className="text-xs font-mono gap-1.5 shadow-xs"
                      >
                        <Zap className="size-3.5" /> Apply Pattern to Workspace
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* VIEW 2: COMPARISON MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <Card className="border border-border rounded-none bg-card overflow-hidden">
          <CardHeader className="p-4 border-b border-border bg-muted/20">
            <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
              <TableIcon className="size-4 text-primary" /> Architectural Topology Comparison Matrix
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Compare base patterns side-by-side by delegation, memory constraints, subagent capacity, and workspace readiness.
            </CardDescription>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] uppercase text-muted-foreground">
                  <th className="p-3">Pattern Name</th>
                  <th className="p-3">Topology</th>
                  <th className="p-3">Complexity</th>
                  <th className="p-3">Subagents</th>
                  <th className="p-3">Delegation</th>
                  <th className="p-3">Memory Strategy</th>
                  <th className="p-3">Tool Policy</th>
                  <th className="p-3">Prerequisites</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPatterns.map(pattern => {
                  const readiness = evaluatePatternReadiness(pattern);
                  const active = isPatternActive(pattern);

                  return (
                    <tr 
                      key={pattern.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        active ? "bg-primary/[0.04]" : ""
                      )}
                    >
                      <td className="p-3 font-bold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{pattern.name}</span>
                          {active && <Badge variant="green" className="text-[8px]">Active</Badge>}
                        </div>
                      </td>
                      <td className="p-3 uppercase text-[10px]">{pattern.topology}</td>
                      <td className="p-3">
                        <Badge 
                          variant={pattern.complexityLevel === 'Low' ? 'outline' : pattern.complexityLevel === 'Medium' ? 'amber' : 'destructive'} 
                          className="text-[9px]"
                        >
                          {pattern.complexityLevel}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {pattern.supportsSubagents ? (
                          <span className="text-primary font-bold">Yes ({(pattern.subagentPresets || []).length} presets)</span>
                        ) : (
                          <span className="text-muted-foreground">None (Single)</span>
                        )}
                      </td>
                      <td className="p-3 uppercase text-[10px]">{pattern.defaultDelegationMode}</td>
                      <td className="p-3 capitalize">{pattern.recommendedMemoryStrategy}</td>
                      <td className="p-3 uppercase text-[10px]">{pattern.defaultToolPolicyMode}</td>
                      <td className="p-3">
                        <Badge variant={readiness.isReady ? "green" : "amber"} className="text-[9px]">
                          {readiness.metCount}/{readiness.totalCount} Met
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="xs"
                          onClick={() => handleApplyPattern(pattern)}
                          className="text-[10px] font-mono"
                        >
                          Apply Pattern
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Guided Manager Dialog Integration */}
      <GuidedManagerDialog
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        defaultAction="inspect"
      />

    </div>
  );
}
