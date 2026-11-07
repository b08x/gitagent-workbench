import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '@/app/context/AgentContext';
import { 
  ARCHITECTURE_PATTERNS, 
  PatternDefinition, 
  createManagementProposal,
  ToolPolicy
} from '@/lib/management';
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
  Sparkles, 
  ArrowRight, 
  Plus, 
  Check, 
  ShieldCheck, 
  Cpu, 
  Filter,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuidedManagerDialog } from '@/app/workbench/components/GuidedManagerDialog';

const ICON_MAP: Record<string, React.ElementType> = {
  UserCheck,
  Users,
  GitFork,
  CheckCircle2,
  Wrench,
  Database,
  Layers
};

export interface PatternRegistryProps {
  onSelectPattern?: (patternId: string) => void;
  onCreateWithPattern?: (pattern: PatternDefinition) => void;
  className?: string;
  hideHeader?: boolean;
}

/**
 * Extracts structured, human-readable required capabilities for a pattern.
 */
function getRequiredCapabilities(pattern: PatternDefinition): Array<{ label: string; detail: string; category: string }> {
  const capabilities: Array<{ label: string; detail: string; category: string }> = [];

  // 1. Subagents & Delegation
  if (pattern.supportsSubagents) {
    const minCount = (pattern.subagentPresets || []).length || 1;
    capabilities.push({
      label: `Subagents (${minCount}+ Roles)`,
      detail: pattern.subagentPresets?.map(s => s.role).join(', ') || 'Dedicated child or peer agents',
      category: 'subagents'
    });
    capabilities.push({
      label: `Delegation Mode: ${pattern.defaultDelegationMode.toUpperCase()}`,
      detail: pattern.defaultDelegationMode === 'auto' ? 'Autonomous task routing & handoffs' : 'Trigger-based peer review',
      category: 'delegation'
    });
  } else {
    capabilities.push({
      label: 'Single Execution Loop',
      detail: 'Isolated autonomy without subagent handoffs',
      category: 'delegation'
    });
  }

  // 2. Memory Capability
  if (pattern.recommendedMemoryStrategy !== 'ephemeral') {
    capabilities.push({
      label: `Memory: ${pattern.recommendedMemoryStrategy.toUpperCase()}`,
      detail: 'Persistent working context & archive layers (MEMORY.md)',
      category: 'memory'
    });
  } else {
    capabilities.push({
      label: 'Ephemeral State',
      detail: 'Clean slate per session; zero storage overhead',
      category: 'memory'
    });
  }

  // 3. Tool Policy & Execution
  if (pattern.defaultToolPolicyMode === 'allowlist') {
    capabilities.push({
      label: 'Gated Tool Allowlist',
      detail: 'Explicitly declared tool permissions & schemas',
      category: 'tools'
    });
  } else if (pattern.defaultToolPolicyMode === 'deny_all') {
    capabilities.push({
      label: 'Prompt-Only Mode',
      detail: 'Zero tool execution access (hermetic text processing)',
      category: 'tools'
    });
  } else {
    capabilities.push({
      label: 'Unrestricted Tooling',
      detail: 'Direct access to all runtime harness tools',
      category: 'tools'
    });
  }

  // 4. Governance & Verification Prerequisite
  if (pattern.id === 'chain_of_verification') {
    capabilities.push({
      label: 'Grounding Verification Passes',
      detail: 'Requires verification question generation & source checking',
      category: 'governance'
    });
  } else if (pattern.id === 'multi_agent_debate') {
    capabilities.push({
      label: 'Segregation of Duties',
      detail: 'Read-only adversarial critic + consensus synthesizer',
      category: 'governance'
    });
  } else if (pattern.id === 'tool_orchestrator') {
    capabilities.push({
      label: 'Schema & Read-Only Guardrails',
      detail: 'Strict parameter validation before external API invocation',
      category: 'governance'
    });
  } else if (pattern.id === 'hybrid_pipeline') {
    capabilities.push({
      label: 'Enterprise Audit Logging',
      detail: 'Multi-stage decision logging & structured JSON audit trails',
      category: 'governance'
    });
  }

  return capabilities;
}

export function PatternRegistry({
  onSelectPattern,
  onCreateWithPattern,
  className,
  hideHeader = false
}: PatternRegistryProps) {
  const navigate = useNavigate();
  const { state, dispatch } = useAgentWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all');
  const [selectedTopology, setSelectedTopology] = useState<string>('all');
  const [managerPatternId, setManagerPatternId] = useState<string | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [createdFeedbackPattern, setCreatedFeedbackPattern] = useState<string | null>(null);

  // Filtered patterns
  const filteredPatterns = useMemo(() => {
    return ARCHITECTURE_PATTERNS.filter(pattern => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        pattern.name.toLowerCase().includes(query) ||
        pattern.description.toLowerCase().includes(query) ||
        pattern.badge.toLowerCase().includes(query) ||
        (pattern.keyBenefits || []).some(b => b.toLowerCase().includes(query));

      const matchesComplexity = 
        selectedComplexity === 'all' || pattern.complexityLevel.toLowerCase() === selectedComplexity.toLowerCase();

      const matchesTopology = 
        selectedTopology === 'all' || pattern.topology === selectedTopology;

      return matchesSearch && matchesComplexity && matchesTopology;
    });
  }, [searchQuery, selectedComplexity, selectedTopology]);

  // Initiate the 'create' workflow using the selected pattern
  const handleInitiateCreate = (pattern: PatternDefinition) => {
    if (onCreateWithPattern) {
      onCreateWithPattern(pattern);
      return;
    }

    if (onSelectPattern) {
      onSelectPattern(pattern.id);
      return;
    }

    // Default: Reset workspace into new draft specification initialized with the pattern
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
      delegation: { mode: pattern.defaultDelegationMode },
      manifest: {
        ...(state.manifest || {}),
        name: `${pattern.id.replace(/_/g, '-')}-agent`,
        description: `New agent built on the ${pattern.name} pattern.`,
        memory: {
          strategy: pattern.recommendedMemoryStrategy
        }
      }
    };

    const proposal = createManagementProposal({
      action: 'create',
      workspace: state,
      patternId: pattern.id,
      inversionPrefixEnabled: true,
      parentPatch,
      subagentPatches,
      toolPolicyPatch,
      summary: `Initiate Create: ${pattern.name} agent pattern`
    });

    dispatch({ type: 'APPLY_MANAGEMENT_PROPOSAL', payload: proposal });
    setCreatedFeedbackPattern(pattern.id);

    setTimeout(() => {
      setCreatedFeedbackPattern(null);
      // Navigate to Step 2 (Identity & Persona) or AI Architect
      navigate('/workbench/agent?tab=identity');
    }, 800);
  };

  return (
    <div className={cn("space-y-6 select-text text-foreground", className)}>
      
      {/* Optional Top Header */}
      {!hideHeader && (
        <div className="border border-border bg-card p-5 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono uppercase text-primary border-primary/40">
                Pattern Registry
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                {ARCHITECTURE_PATTERNS.length} Base Patterns
              </Badge>
            </div>
            <h2 className="text-xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" /> Agent Architecture Base Patterns
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Select a foundational agent pattern to initialize a new agent with verified orchestration loops, delegation boundaries, and required capabilities.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManagerPatternId('single_agent');
                setIsManagerOpen(true);
              }}
              className="text-xs font-mono gap-1.5 border-primary/50 text-foreground hover:bg-muted font-bold"
            >
              <Cpu className="size-3.5 text-primary" /> Guided Manager Dialog
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Topology Filters */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono">
            <span className="text-muted-foreground text-[10px] uppercase mr-1 flex items-center gap-1">
              <Filter className="size-3" /> Topology:
            </span>
            {[
              { id: 'all', label: 'All' },
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
          <div className="flex items-center gap-1 text-xs font-mono">
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

        {/* Search Bar */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Filter patterns..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs font-mono rounded-none bg-card border-border"
          />
        </div>
      </div>

      {/* Patterns List / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPatterns.map(pattern => {
          const Icon = ICON_MAP[pattern.iconName] || Layers;
          const capabilities = getRequiredCapabilities(pattern);
          const isCreating = createdFeedbackPattern === pattern.id;

          return (
            <Card 
              key={pattern.id}
              className="border border-border bg-card rounded-none flex flex-col justify-between hover:border-primary/60 transition-colors"
            >
              <div>
                {/* Header Strip */}
                <CardHeader className="p-4 pb-3 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-mono font-bold text-foreground">
                          {pattern.name}
                        </CardTitle>
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
                            {pattern.estimatedTokenOverhead}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] font-mono uppercase shrink-0">
                      {pattern.badge}
                    </Badge>
                  </div>

                  <CardDescription className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    {pattern.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Required Capabilities Section */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="size-3 text-primary" /> Required Capabilities & Invariants
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {capabilities.map((cap, cIdx) => (
                        <div 
                          key={cIdx} 
                          className="p-2 border border-border bg-background font-mono text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-[11px] flex items-center gap-1">
                              <CheckSquare className="size-3 text-primary shrink-0" />
                              {cap.label}
                            </span>
                            <Badge variant="outline" className="text-[8px] uppercase font-mono px-1 py-0">
                              {cap.category}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            {cap.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bundled Subagent Presets (if applicable) */}
                  {pattern.subagentPresets && pattern.subagentPresets.length > 0 && (
                    <div className="border border-border p-2.5 bg-muted/20 space-y-1.5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Users className="size-3 text-primary" /> Included Subagent Presets:
                        </span>
                        <span className="text-[10px] text-primary font-bold">
                          {pattern.subagentPresets.length} roles
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pattern.subagentPresets.map(preset => (
                          <Badge key={preset.name} variant="secondary" className="text-[9px] font-mono px-1.5 py-0.5">
                            {preset.name} ({preset.role})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Benefits */}
                  {pattern.keyBenefits && pattern.keyBenefits.length > 0 && (
                    <div className="space-y-1">
                      {pattern.keyBenefits.slice(0, 2).map((benefit, bIdx) => (
                        <div key={bIdx} className="text-[11px] flex items-start gap-1.5 text-muted-foreground">
                          <Check className="size-3 text-primary shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Action Bar */}
              <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3 font-mono text-xs">
                <span className="text-[10px] text-muted-foreground">
                  Template: <strong className="text-foreground">{pattern.recommendedTemplate}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setManagerPatternId(pattern.id);
                      setIsManagerOpen(true);
                    }}
                    className="text-xs font-mono text-foreground hover:bg-muted"
                  >
                    Inspect
                  </Button>

                  {isCreating ? (
                    <Badge variant="green" className="text-xs py-1 px-2 flex items-center gap-1 font-mono">
                      <Check className="size-3" /> Initializing...
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleInitiateCreate(pattern)}
                      className="text-xs font-mono gap-1.5 font-bold shadow-xs cursor-pointer"
                    >
                      <Plus className="size-3.5" /> Create with Pattern <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Guided Manager Dialog Integration */}
      <GuidedManagerDialog
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        defaultAction="create"
      />

    </div>
  );
}

export default PatternRegistry;
