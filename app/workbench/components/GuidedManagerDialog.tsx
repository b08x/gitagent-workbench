import React, { useState, useMemo } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { 
  ManagementAction, 
  ArtifactKind, 
  ToolPolicy, 
  ManagementProposal, 
  PromptSpecialistDependency,
  computeFingerprint,
  inspectWorkspaceForEditing,
  createManagementProposal,
  validateBatchProposal,
  computeArtifactEvidence,
  ARCHITECTURE_PATTERNS,
  DISCOVERY_QUESTIONS,
  scorePatterns,
  PatternDefinition
} from '../../../lib/management';
import { AGENT_FRAMEWORK_TOOLS, AGENT_FRAMEWORK_OPTIONS } from '../../../lib/gitagent/constants';
import { AgentFramework } from '../../../lib/gitagent/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Sparkles, 
  Wrench, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  GitFork, 
  Database, 
  HelpCircle, 
  X, 
  Check, 
  FileCode, 
  Cpu, 
  SlidersHorizontal,
  ChevronRight,
  Clock,
  History,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuidedManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAction?: ManagementAction;
}

export function GuidedManagerDialog({ isOpen, onClose, defaultAction = 'inspect' }: GuidedManagerDialogProps) {
  const { state, dispatch } = useAgentWorkspace();

  const [activeAction, setActiveAction] = useState<ManagementAction>(defaultAction);
  const [managerTab, setManagerTab] = useState<'action' | 'patterns' | 'proposal' | 'journal'>('action');

  // Inspection prefill state (bounded edit state)
  const inspection = useMemo(() => inspectWorkspaceForEditing(state, 'parent_agent'), [state]);

  // Pattern discovery questionnaire answers
  const [discoveryAnswers, setDiscoveryAnswers] = useState<Record<string, string>>({
    task_complexity: 'focused',
    subagent_need: 'no',
    memory_continuity: 'ephemeral',
    inversion_preference: 'recommended'
  });

  const scoredPatterns = useMemo(() => scorePatterns(discoveryAnswers), [discoveryAnswers]);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('single_agent');
  const [enableInversionPrefix, setEnableInversionPrefix] = useState<boolean>(true);

  // Bounded field edits
  const [editName, setEditName] = useState(state.manifest?.name || '');
  const [editDescription, setEditDescription] = useState(state.manifest?.description || '');
  const [editAuthor, setEditAuthor] = useState(state.manifest?.author || '');
  const [editToolsMode, setEditToolsMode] = useState<'unrestricted' | 'allowlist' | 'deny_all'>(
    state.toolPolicy?.mode || (state.toolsList?.length ? 'allowlist' : 'unrestricted')
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    state.toolPolicy?.allowedTools?.length ? state.toolPolicy.allowedTools : (state.toolsList || []).map(t => t.name)
  );

  // New subagent draft in proposal
  const [includeChildSubagent, setIncludeChildSubagent] = useState(false);
  const [childSubagentName, setChildSubagentName] = useState('research-specialist');
  const [childSubagentRole, setChildSubagentRole] = useState('Research Analyst');
  const [childSubagentDesc, setChildSubagentDesc] = useState('Conducts deep-dive investigations and cites primary sources.');
  const [childSubagentPerms, setChildSubagentPerms] = useState<string[]>(['read_only', 'workspace_search']);

  // Prompt Specialist Dependency simulation (truthful state)
  const [specialistOption, setSpecialistOption] = useState<'none' | 'pending' | 'supplied' | 'fallback'>('fallback');
  const [suppliedSpecialistPrompt, setSuppliedSpecialistPrompt] = useState('');

  // Active Proposal state
  const [currentProposal, setCurrentProposal] = useState<ManagementProposal | null>(null);

  const activeFramework: AgentFramework = (state.targetFramework as AgentFramework) || 'hermes_agent';
  const availableHarnessTools = AGENT_FRAMEWORK_TOOLS[activeFramework] || [];

  if (!isOpen) return null;

  const handleBuildProposal = () => {
    const parentPatch: Record<string, any> = {};

    if (editName !== state.manifest?.name || editDescription !== state.manifest?.description || editAuthor !== state.manifest?.author) {
      parentPatch.manifest = {
        name: editName || state.manifest?.name || 'my-agent',
        description: editDescription || state.manifest?.description || '',
        author: editAuthor || state.manifest?.author || ''
      };
    }

    const toolPolicyPatch: ToolPolicy = {
      mode: editToolsMode,
      allowedTools: editToolsMode === 'allowlist' ? selectedTools : [],
      disabledTools: editToolsMode === 'deny_all' ? [...availableHarnessTools] : [],
      perToolPermissions: {}
    };

    const subagentPatches: any[] = [];
    if (includeChildSubagent && childSubagentName.trim()) {
      subagentPatches.push({
        operation: 'create',
        name: childSubagentName.trim(),
        role: childSubagentRole.trim() || 'Specialist',
        description: childSubagentDesc.trim(),
        permissions: childSubagentPerms
      });
    }

    let specialistDependency: PromptSpecialistDependency | undefined;
    if (specialistOption !== 'none') {
      specialistDependency = {
        taskId: `spec-task-${Date.now()}`,
        targetField: 'rules',
        status: specialistOption,
        requestedRole: 'Prompt Engineering Specialist',
        suppliedPrompt: specialistOption === 'supplied' ? suppliedSpecialistPrompt : undefined,
        fallbackPrompt: `## Specialist Instructions (Fallback)\nOperate as a disciplined, high-fidelity specialist adhering strictly to JSON and markdown contracts.`,
        notes: specialistOption === 'fallback' 
          ? 'Specialist work resolved via deterministic fallback rule generator.' 
          : specialistOption === 'supplied'
          ? 'Specialist supplied verified prompt block.'
          : 'Awaiting async specialist completion.'
      };
    }

    const proposal = createManagementProposal({
      action: activeAction,
      workspace: state,
      patternId: selectedPatternId,
      inversionPrefixEnabled: enableInversionPrefix,
      parentPatch: Object.keys(parentPatch).length > 0 ? parentPatch : undefined,
      subagentPatches,
      toolPolicyPatch,
      specialistDependency,
      summary: `${activeAction.toUpperCase()}: Pattern '${selectedPatternId}' with ${editToolsMode} tools policy`
    });

    setCurrentProposal(proposal);
    dispatch({ type: 'SET_ACTIVE_PROPOSAL', payload: proposal });
    setManagerTab('proposal');
  };

  const handleApplyProposal = () => {
    if (!currentProposal) return;
    dispatch({ type: 'APPLY_MANAGEMENT_PROPOSAL', payload: currentProposal });
    setCurrentProposal(null);
    onClose();
  };

  const handleRollback = (proposalId: string) => {
    dispatch({ type: 'ROLLBACK_MANAGEMENT_PROPOSAL', payload: proposalId });
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName) ? prev.filter(t => t !== toolName) : [...prev, toolName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-background border border-border w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl rounded-none text-foreground">
        
        {/* Modal Header */}
        <div className="h-14 border-b border-border px-5 flex items-center justify-between shrink-0 bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold">
              <SlidersHorizontal className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider">Agent Manager</h2>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Base Rev #{state.revision || 1}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Guided agent, subagent, and pattern management with transactional proposals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-muted p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setManagerTab('action')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer",
                  managerTab === 'action' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                1. Action & Scope
              </button>
              <button
                type="button"
                onClick={() => setManagerTab('patterns')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer",
                  managerTab === 'patterns' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                2. Pattern Registry
              </button>
              <button
                type="button"
                onClick={() => setManagerTab('proposal')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer relative",
                  managerTab === 'proposal' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                3. Proposal & Diff
                {currentProposal && (
                  <span className="size-2 rounded-full bg-primary absolute top-1 right-1" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setManagerTab('journal')}
                className={cn(
                  "px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer",
                  managerTab === 'journal' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                4. History & Undo ({state.managementJournal?.length || 0})
              </button>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: ACTION & SCOPE */}
          {managerTab === 'action' && (
            <div className="space-y-6">
              <div>
                <Label className="text-xs uppercase font-mono text-muted-foreground">Select Explicit Management Action</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                  {[
                    { id: 'create', label: 'Create Agent', desc: 'Initialize new architecture or subagent', icon: Sparkles },
                    { id: 'inspect', label: 'Inspect & Edit', desc: 'Inspect existing spec; bounded update', icon: Wrench },
                    { id: 'import', label: 'Import Artifact', desc: 'Import portable skill or subagent bundle', icon: FileCode },
                    { id: 'validate', label: 'Validate Batch', desc: 'Run schema, policy, and tool audit', icon: ShieldCheck }
                  ].map(act => (
                    <div
                      key={act.id}
                      onClick={() => setActiveAction(act.id as ManagementAction)}
                      className={cn(
                        "p-3.5 border cursor-pointer transition-all flex flex-col justify-between",
                        activeAction === act.id 
                          ? "border-primary bg-primary/10 text-foreground" 
                          : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <act.icon className={cn("size-4", activeAction === act.id ? "text-primary" : "text-muted-foreground")} />
                        {activeAction === act.id && <Check className="size-3.5 text-primary" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold font-mono text-foreground">{act.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{act.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inspection Summary Block */}
              <Card className="border-border bg-card">
                <CardHeader className="py-3 px-4 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="size-3.5 text-primary" /> Current Specification Inspection
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Fingerprint: {inspection.baseFingerprint.slice(0, 12)}...
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">NAME</span>
                    <strong className="text-foreground">{inspection.existingName || '(untitled)'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">TEMPLATE</span>
                    <strong className="text-foreground">{inspection.existingTemplate}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">RUNTIME</span>
                    <strong className="text-foreground">{inspection.existingFramework}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">CHILD SUBAGENTS</span>
                    <strong className="text-foreground">{inspection.existingSubagentsCount}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">TOOL POLICY MODE</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{inspection.existingToolsMode}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">SKILLS ATTACHED</span>
                    <strong className="text-foreground">{inspection.existingSkillsCount}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">SOUL PERSONA</span>
                    <strong className="text-foreground">{inspection.hasSoul ? 'Configured' : 'Empty'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">RULES SPEC</span>
                    <strong className="text-foreground">{inspection.hasRules ? 'Configured' : 'Empty'}</strong>
                  </div>
                </CardContent>
              </Card>

              {/* Bounded Configuration Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="m-agent-name" className="text-xs font-mono">Agent Name (kebab-case)</Label>
                    <Input
                      id="m-agent-name"
                      value={editName}
                      onChange={e => setEditName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="font-mono text-xs mt-1"
                      placeholder="e.g. data-synthesizer"
                    />
                  </div>

                  <div>
                    <Label htmlFor="m-agent-desc" className="text-xs font-mono">Description / Purpose</Label>
                    <Textarea
                      id="m-agent-desc"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      rows={2}
                      className="text-xs mt-1"
                      placeholder="High-level mission and operational scope"
                    />
                  </div>

                  <div>
                    <Label htmlFor="m-agent-author" className="text-xs font-mono">Author / Team</Label>
                    <Input
                      id="m-agent-author"
                      value={editAuthor}
                      onChange={e => setEditAuthor(e.target.value)}
                      className="text-xs mt-1"
                      placeholder="Optional author attribution"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-mono">Explicit Tool Policy Mode</Label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      Prevents the empty array trap. Unrestricted allows all harness tools; allowlist gates execution.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['unrestricted', 'allowlist', 'deny_all'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setEditToolsMode(mode)}
                          className={cn(
                            "py-2 px-2 text-center text-xs font-mono border uppercase transition-colors cursor-pointer",
                            editToolsMode === mode 
                              ? "border-primary bg-primary/20 text-foreground font-bold" 
                              : "border-border bg-card text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {mode.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editToolsMode === 'allowlist' && (
                    <div className="border border-border p-3 bg-muted/20">
                      <Label className="text-[11px] font-mono block mb-2 text-foreground">
                        Select Allowed Tools ({selectedTools.length} selected of {availableHarnessTools.length})
                      </Label>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {availableHarnessTools.map(tName => {
                          const active = selectedTools.includes(tName);
                          return (
                            <button
                              key={tName}
                              type="button"
                              onClick={() => toggleTool(tName)}
                              className={cn(
                                "text-[10px] font-mono px-2 py-0.5 border cursor-pointer transition-colors",
                                active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {tName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Child Subagent Option */}
                  <div className="border border-border p-3 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-mono flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeChildSubagent}
                          onChange={e => setIncludeChildSubagent(e.target.checked)}
                          className="mr-1"
                        />
                        Include Child Subagent in Batch
                      </Label>
                      <Badge variant="outline" className="text-[10px] font-mono">Hierarchy</Badge>
                    </div>

                    {includeChildSubagent && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <Input
                          placeholder="subagent-name"
                          value={childSubagentName}
                          onChange={e => setChildSubagentName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="font-mono text-xs h-7"
                        />
                        <Input
                          placeholder="Specialist Role"
                          value={childSubagentRole}
                          onChange={e => setChildSubagentRole(e.target.value)}
                          className="text-xs h-7"
                        />
                        <div className="col-span-2">
                          <Input
                            placeholder="Subagent brief description"
                            value={childSubagentDesc}
                            onChange={e => setChildSubagentDesc(e.target.value)}
                            className="text-xs h-7"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={() => setManagerTab('patterns')}
                  className="gap-2 font-mono text-xs"
                >
                  Configure Architecture Pattern <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: PATTERNS REGISTRY & DISCOVERY */}
          {managerTab === 'patterns' && (
            <div className="space-y-6">
              {/* Discovery Questionnaire */}
              <Card className="border-border bg-card">
                <CardHeader className="py-3 px-4 border-b border-border bg-muted/30">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="size-3.5 text-primary" /> Architectural Discovery Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {DISCOVERY_QUESTIONS.map(q => (
                    <div key={q.id} className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">{q.prompt}</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map(opt => (
                          <div
                            key={opt.value}
                            onClick={() => setDiscoveryAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                            className={cn(
                              "p-2.5 border cursor-pointer transition-colors text-left",
                              discoveryAnswers[q.id] === opt.value
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="text-xs font-mono font-bold">{opt.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pattern Recommendations */}
              <div>
                <Label className="text-xs uppercase font-mono text-muted-foreground">
                  Select Architectural Pattern (Ranked by Discovery Affinity)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                  {scoredPatterns.map(({ pattern, score }) => (
                    <div
                      key={pattern.id}
                      onClick={() => setSelectedPatternId(pattern.id)}
                      className={cn(
                        "p-4 border cursor-pointer transition-all flex flex-col justify-between relative",
                        selectedPatternId === pattern.id
                          ? "border-primary bg-primary/15 text-foreground ring-1 ring-primary"
                          : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold font-mono text-foreground">{pattern.name}</span>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono">
                            {pattern.badge}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {pattern.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">Match Score: {score}</span>
                        {pattern.supportsSubagents ? (
                          <span className="text-primary font-bold">Subagents Supported</span>
                        ) : (
                          <span className="text-muted-foreground">Single Loop</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inversion Prefix & Specialist Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableInversionPrefix}
                        onChange={e => setEnableInversionPrefix(e.target.checked)}
                        className="mr-1"
                      />
                      Phase 0 Requirement Inversion
                    </Label>
                    <Badge variant="outline" className="text-[9px] font-mono">Recommended</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Injects strict Phase 0 elicitation rules into RULES.md. Forces the agent to clarify missing parameters before taking destructive or speculative action.
                  </p>
                </Card>

                <Card className="border-border bg-card p-4 space-y-2">
                  <Label className="text-xs font-mono font-bold">Prompt Specialist Dependency</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Resumable prompt-specialist dependency with truthful fallback status.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { id: 'fallback', label: 'Fallback', desc: 'Deterministic' },
                      { id: 'supplied', label: 'Supplied', desc: 'Custom Block' },
                      { id: 'pending', label: 'Pending', desc: 'Async Gate' }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSpecialistOption(item.id as any)}
                        className={cn(
                          "py-1.5 px-2 text-center text-xs font-mono border transition-colors cursor-pointer",
                          specialistOption === item.id 
                            ? "border-primary bg-primary/20 text-foreground font-bold" 
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {specialistOption === 'supplied' && (
                    <Textarea
                      placeholder="Paste supplied prompt specialist text..."
                      value={suppliedSpecialistPrompt}
                      onChange={e => setSuppliedSpecialistPrompt(e.target.value)}
                      rows={2}
                      className="text-xs font-mono mt-2"
                    />
                  )}
                </Card>
              </div>

              {/* Generate Proposal Button */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" onClick={() => setManagerTab('action')} className="font-mono text-xs">
                  Back to Scope
                </Button>
                <Button 
                  onClick={handleBuildProposal}
                  className="gap-2 font-mono text-xs"
                >
                  Build Transactional Proposal <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: PROPOSAL & DIFF */}
          {managerTab === 'proposal' && (
            <div className="space-y-6">
              {!currentProposal ? (
                <div className="text-center py-12 border border-dashed border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground font-mono">
                    No active proposal constructed yet.
                  </p>
                  <Button 
                    onClick={handleBuildProposal}
                    className="mt-3 font-mono text-xs"
                  >
                    Generate Proposal from Configuration
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Proposal Summary Strip */}
                  <div className="p-4 border border-border bg-card flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{currentProposal.id}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Status: {currentProposal.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Base Rev #{currentProposal.baseRevision}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentProposal.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCurrentProposal(null);
                          dispatch({ type: 'SET_ACTIVE_PROPOSAL', payload: null });
                          setManagerTab('action');
                        }}
                        className="font-mono text-xs"
                      >
                        Discard
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyProposal}
                        disabled={currentProposal.diagnostics.some(d => d.severity === 'error')}
                        className="font-mono text-xs gap-1.5"
                      >
                        <Check className="size-3.5" /> Apply Proposal Batch
                      </Button>
                    </div>
                  </div>

                  {/* Diagnostics Panel */}
                  {currentProposal.diagnostics.length > 0 && (
                    <div className="border border-border p-3 space-y-2 bg-muted/20">
                      <Label className="text-xs font-mono font-bold uppercase tracking-wider block">
                        Proposal Diagnostics ({currentProposal.diagnostics.length})
                      </Label>
                      {currentProposal.diagnostics.map((diag, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "p-2 border text-xs font-mono flex items-start gap-2",
                            diag.severity === 'error' ? "border-destructive/50 bg-destructive/10 text-destructive" :
                            diag.severity === 'warning' ? "border-amber-500/50 bg-amber-500/10 text-amber-500" :
                            "border-border bg-card text-muted-foreground"
                          )}
                        >
                          {diag.severity === 'error' ? <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> : <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />}
                          <div>
                            <span className="font-bold">[{diag.code}]</span> {diag.message}
                            {diag.path && <span className="text-[10px] text-muted-foreground block">Target: {diag.path}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Truthful Evidence Level & Native Loader Card */}
                  <Card className="border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" />
                        <span className="text-xs font-mono font-bold">Artifact Evidence & Loader Verification</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Truthful Verification
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs font-mono">
                      <div className="p-2 border border-border bg-background">
                        <span className="text-muted-foreground block text-[10px]">EVIDENCE LEVEL</span>
                        <strong className="text-primary font-bold">structurally_valid</strong>
                      </div>
                      <div className="p-2 border border-border bg-background">
                        <span className="text-muted-foreground block text-[10px]">HARNESS COMPATIBILITY</span>
                        <strong className="text-foreground">{activeFramework}</strong>
                      </div>
                      <div className="p-2 border border-border bg-background">
                        <span className="text-muted-foreground block text-[10px]">NATIVE LOADER STATUS</span>
                        <span className="text-muted-foreground italic">Not checked by native runtime loader</span>
                      </div>
                    </div>
                  </Card>

                  {/* Diff Entries List */}
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block mb-2">
                      Proposed Artifact Diffs ({currentProposal.diffs.length})
                    </Label>
                    <div className="space-y-2">
                      {currentProposal.diffs.map((diff, i) => (
                        <div key={i} className="p-3 border border-border bg-card font-mono text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-foreground">{diff.path}</span>
                            <Badge 
                              variant={diff.changeType === 'added' ? 'green' : diff.changeType === 'removed' ? 'destructive' : 'amber'} 
                              className="text-[9px] uppercase"
                            >
                              {diff.changeType}
                            </Badge>
                          </div>
                          {diff.beforeSummary && (
                            <div className="text-[11px] text-muted-foreground">
                              Before: {diff.beforeSummary}
                            </div>
                          )}
                          {diff.afterSummary && (
                            <div className="text-[11px] text-primary font-medium mt-0.5">
                              After: {diff.afterSummary}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: JOURNAL & ROLLBACK HISTORY */}
          {managerTab === 'journal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider">Transaction Journal & Snapshots</h3>
                  <p className="text-xs text-muted-foreground">
                    Atomic transaction history with 1-click rollback of applied proposals
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {state.managementJournal?.length || 0} recorded
                </Badge>
              </div>

              {!state.managementJournal?.length ? (
                <div className="text-center py-12 border border-dashed border-border bg-muted/20">
                  <Clock className="size-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-mono">
                    No proposals have been applied in this session yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.managementJournal.map(entry => (
                    <Card key={entry.proposalId} className="border-border bg-card">
                      <CardContent className="p-4 flex items-center justify-between gap-4 font-mono text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{entry.proposalId}</span>
                            <Badge variant={entry.rolledBack ? "outline" : "green"} className="text-[9px]">
                              {entry.rolledBack ? 'Rolled Back' : 'Applied'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              Rev #{entry.baseRevision} → #{entry.appliedRevision}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.summary}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {!entry.rolledBack && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(entry.proposalId)}
                            className="font-mono text-xs gap-1.5 text-foreground hover:bg-muted"
                          >
                            <RotateCcw className="size-3" /> Rollback
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="h-12 border-t border-border px-5 flex items-center justify-between shrink-0 bg-muted/40 text-xs font-mono">
          <div className="text-muted-foreground">
            Current Workspace: <strong className="text-foreground">{state.manifest?.name || 'untitled'}</strong> (Rev #{state.revision || 1})
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="font-mono text-xs">
            Close
          </Button>
        </div>

      </div>
    </div>
  );
}
