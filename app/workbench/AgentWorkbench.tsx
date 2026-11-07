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
import { auditToolMappings } from '../../lib/gitagent/toolVerification';
import { evaluateSharedReadiness, repairSkillKebabCase, repairRemoveUnsupportedTool } from '../../lib/gitagent/readinessEngine';
import { AGENT_FRAMEWORK_OPTIONS } from '../../lib/gitagent/constants';
import { AgentFramework } from '../../lib/gitagent/types';
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
  ChevronLeft,
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
  Code2,
  Loader2,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { ResetRestartDialog } from './components/ResetRestartDialog';
import { GuidedManagerDialog } from './components/GuidedManagerDialog';
import { AgentWizard } from './AgentWizard';
import { RuntimeFrameworkStep } from '../wizard/steps/RuntimeFrameworkStep';
import { IdentityStep } from '../wizard/steps/IdentityStep';
import { CapabilitiesStep } from '../wizard/steps/CapabilitiesStep';
import { ModelStep } from '../wizard/steps/ModelStep';
import { GenerationDashboard } from '../generation/GenerationDashboard';
import { FileEditor } from '../editor/FileEditor';
import { cn } from '@/lib/utils';

export type StepperStepId = 'runtime' | 'identity' | 'capabilities' | 'model' | 'synthesize' | 'review';

interface WizardStepDef {
  id: StepperStepId;
  number: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'runtime', number: 1, title: 'Runtime', subtitle: 'Harness & Tools', icon: Layers },
  { id: 'identity', number: 2, title: 'Identity', subtitle: 'Soul & Persona', icon: ShieldCheck },
  { id: 'capabilities', number: 3, title: 'Capabilities', subtitle: 'Skills & Tools', icon: Zap },
  { id: 'model', number: 4, title: 'Model & Rules', subtitle: 'Parameters & Limits', icon: Cpu },
  { id: 'synthesize', number: 5, title: 'Synthesize', subtitle: 'Pipeline Execution', icon: Sparkles },
  { id: 'review', number: 6, title: 'Review & Edit', subtitle: 'Repository Tree', icon: FileCode },
];

const normalizeStep = (tab: string | null): StepperStepId => {
  if (!tab) return 'runtime';
  if (tab === 'target-runtime' || tab === 'runtime') return 'runtime';
  if (tab === 'identity') return 'identity';
  if (tab === 'capabilities' || tab === 'skills') return 'capabilities';
  if (tab === 'runtime-settings' || tab === 'model' || tab === 'prompt') return 'model';
  if (tab === 'synthesize' || tab === 'generate') return 'synthesize';
  if (tab === 'review' || tab === 'editor') return 'review';
  return 'runtime';
};

export function AgentWorkbench() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAgentWorkspace();
  const { settings, updateSettings } = useSettings();

  const activeFramework: AgentFramework = (state.targetFramework as AgentFramework) || 'hermes_agent';
  const activeFrameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework) || AGENT_FRAMEWORK_OPTIONS[0];

  const activeStep = normalizeStep(searchParams.get('tab'));
  const isArchitectMode = searchParams.get('tab') === 'architect';
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showManagerDialog, setShowManagerDialog] = useState(false);

  const assembledPrompt = useMemo(() => assembleSystemPrompt(state), [state]);
  const tokenEstimate = Math.round(assembledPrompt.length / 4);

  const handleStepChange = (step: StepperStepId) => {
    setSearchParams({ tab: step });
  };

  const currentStepIndex = WIZARD_STEPS.findIndex(s => s.id === activeStep);
  const currentStep = WIZARD_STEPS[currentStepIndex >= 0 ? currentStepIndex : 0];

  const handleNextStep = () => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      handleStepChange(WIZARD_STEPS[currentStepIndex + 1].id);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      handleStepChange(WIZARD_STEPS[currentStepIndex - 1].id);
    }
  };

  const copySystemPrompt = () => {
    navigator.clipboard.writeText(assembledPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const hasAgentName = !!(state.manifest.name && state.manifest.name.trim().length > 0);
  const isKebabCaseValid = hasAgentName && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(state.manifest.name || '');

  // Agent Health score checklist
  const healthChecklist = [
    {
      id: 'target-runtime',
      label: 'Target Runtime',
      step: 'runtime' as StepperStepId,
      met: !!state.targetFramework,
      desc: state.targetFramework ? `Harness: ${state.targetFramework.replace('_', ' ').toUpperCase()}` : 'Select an execution harness'
    },
    {
      id: 'name',
      label: 'Agent Name',
      step: 'identity' as StepperStepId,
      met: isKebabCaseValid,
      desc: hasAgentName ? (isKebabCaseValid ? `${state.manifest.name}` : 'Must be lowercase kebab-case') : 'Enter a valid kebab-case name'
    },
    {
      id: 'description',
      label: 'Purpose Description',
      step: 'identity' as StepperStepId,
      met: !!(state.manifest.description && state.manifest.description.trim().length > 0),
      desc: state.manifest.description ? 'Description configured' : 'Define agent scope and purpose'
    },
    {
      id: 'soul',
      label: 'Identity & SOUL.md',
      step: 'identity' as StepperStepId,
      met: !!(state.soul && state.soul.trim().length > 0),
      desc: state.soul ? 'Core persona and principles configured' : 'Define core identity and style'
    },
    {
      id: 'skills',
      label: 'Skills & Tools',
      step: 'capabilities' as StepperStepId,
      met: (state.skillsList?.length || 0) > 0,
      desc: (state.skillsList?.length || 0) > 0 ? `${state.skillsList.length} skill(s) configured` : 'Add at least one skill'
    }
  ];

  const metCriteriaCount = healthChecklist.filter(item => item.met).length;
  const completeness = Math.round((metCriteriaCount / healthChecklist.length) * 100);
  const [showHealthBreakdown, setShowHealthBreakdown] = useState(true);

  // Shared readiness evaluation across specification, runtime, and testing
  const readiness = useMemo(() => evaluateSharedReadiness(state, {
    effectiveTestModel: settings.taskModels.chatTests?.modelId,
    lastTestedRevision: state.lastTestedRevision,
    lastTestedModel: state.lastTestedModel
  }), [state, settings.taskModels.chatTests?.modelId]);

  // Pre-flight tool audit & skill scope analysis
  const toolAudit = useMemo(() => auditToolMappings(state), [state]);
  const globalSkillsCount = (state.skillsList || []).filter(s => s.scope !== 'task_scoped').length;
  const taskSkillsCount = (state.skillsList || []).filter(s => s.scope === 'task_scoped').length;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-transparent text-foreground select-text">
      {/* Top Action & Breadcrumb Bar */}
      <div className="h-14 border-b border-border bg-background px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-none bg-muted text-foreground border border-border flex items-center justify-center shrink-0">
            <Cpu className="size-4.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">Agent Builder</span>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="font-mono text-xs font-bold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
              {state.manifest.name || "untitled-agent"}
            </span>

            {/* 4 Separate State Badges: Generation, Specification, Runtime Compatibility, and Test */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. Generation State */}
              {state.isCompilingSpec ? (
                <Badge variant="amber" className="text-[9px] px-1.5 py-0 gap-1 animate-pulse">
                  <Loader2 className="size-2.5 animate-spin" /> GEN: Synthesizing
                </Badge>
              ) : state.git?.stagedFiles?.length || !state.git?.commits?.length ? (
                <Badge variant="amber" className="text-[9px] px-1.5 py-0" title={`Workspace draft at revision #${state.revision || 1}`}>
                  GEN: Draft (rev #{state.revision || 1})
                </Badge>
              ) : (
                <Badge variant="green" className="text-[9px] px-1.5 py-0" title={`Clean committed baseline: ${state.git?.head?.slice(0, 7) || 'clean'}`}>
                  GEN: Committed ({state.git?.head?.slice(0, 7) || 'clean'})
                </Badge>
              )}

              {/* 2. Specification State */}
              <Badge 
                variant={readiness.validity.isValid ? "green" : "amber"} 
                className="text-[9px] px-1.5 py-0"
                title={`${readiness.completeness.metCount} of ${readiness.completeness.totalCount} slots configured`}
              >
                {readiness.validity.isValid ? `SPEC: Valid (${readiness.completeness.percentage}%)` : `SPEC: ${readiness.validity.errorsCount} Error(s)`}
              </Badge>

              {/* 3. Runtime Compatibility State */}
              <Badge
                variant={readiness.compatibility.isCompatible ? "green" : "amber"}
                className="text-[9px] px-1.5 py-0"
                title={`${readiness.compatibility.verifiedToolsCount} verified tools, ${readiness.compatibility.unmappedToolsCount} unmapped claims`}
              >
                HARNESS: {readiness.compatibility.isCompatible ? `${activeFrameworkMeta.shortLabel} (${readiness.compatibility.verifiedToolsCount} Mapped)` : `${readiness.compatibility.unmappedToolsCount} Unmapped`}
              </Badge>

              {/* 4. Test State */}
              <Badge
                variant={readiness.testing.testStatus === 'passed' ? "green" : readiness.testing.testStatus === 'stale' ? "amber" : "outline"}
                className="text-[9px] px-1.5 py-0"
                title={readiness.testing.summary}
              >
                {readiness.testing.testStatus === 'stale' ? 'TEST: Stale (Re-test)' : readiness.testing.testStatus === 'passed' ? `TEST: Verified (${readiness.testing.evalsCount || 1})` : 'TEST: Untested'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics Bar: Entity-first with Explicit Models and Skill Scopes */}
          <div className="hidden xl:flex items-center gap-2.5 px-3 py-1 bg-muted border border-border rounded-none text-[11px] font-mono">
            <span className="text-muted-foreground" title="AI Architect Builder Model">
              BUILDER // <strong className="text-foreground font-bold">{settings.taskModels.architect?.modelId?.replace(/^.*\//, '') || 'gemini-3.7-flash'}</strong>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground" title="Target Export Model in Specification">
              EXPORT // <strong className="text-foreground font-bold">{state.modelConfig?.preferred?.replace(/^.*\//, '') || 'claude-sonnet-4-5'}</strong>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground" title="Test Runner Model in Test Lab">
              TEST // <strong className="text-foreground font-bold">{settings.taskModels.chatTests?.modelId?.replace(/^.*\//, '') || 'gemini-3.8-flash'}</strong>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground" title="Skill Scopes Distribution (Global / Task-Scoped)">
              SCOPES // <strong className="text-foreground font-bold">{globalSkillsCount}G / {taskSkillsCount}T</strong>
            </span>
          </div>

          {/* Git Branch & Status Pill */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/workbench/git')}
            className="text-xs font-mono gap-1.5 border-border text-foreground hover:bg-muted"
            title="Git Repository & Sync"
          >
            <GitBranch className="size-3.5 text-foreground" />
            <span className="hidden md:inline">{state.git?.currentBranch || 'main'}</span>
            {state.git?.sync?.ahead > 0 && (
              <span className="text-[10px] font-bold text-[#b45309]">↑{state.git.sync.ahead}</span>
            )}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowManagerDialog(true)}
            className="text-xs font-mono gap-1.5 border-primary/50 bg-primary/10 text-foreground hover:bg-primary/20 font-bold"
            title="Open Guided Agent & Subagent Manager"
          >
            <SlidersHorizontal className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Agent Manager</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSearchParams({ tab: isArchitectMode ? activeStep : 'architect' })}
            className={cn(
              "text-xs font-medium gap-1.5 font-sans",
              isArchitectMode 
                ? "bg-muted text-foreground border-primary font-semibold" 
                : "border-border text-foreground hover:bg-muted"
            )}
            title="Toggle Conversational AI Architect Studio"
          >
            <Sparkles className="size-3.5 text-[#b45309]" />
            <span className="hidden sm:inline">AI Architect</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/workbench/chat')}
            className="text-xs font-medium gap-1.5 border-border text-foreground hover:bg-muted font-sans"
          >
            <MessageSquare className="size-3.5 text-foreground" />
            <span className="hidden sm:inline">Test in Lab</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowResetDialog(true)}
            title="Reset or restart agent builder session"
            className="text-xs font-mono gap-1.5 border-border text-foreground hover:border-primary"
          >
            <RotateCcw className="size-3.5 text-muted-foreground" />
            <span className="hidden md:inline">Reset</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'Manual Save' })}
            className="text-xs font-mono gap-1.5 border-border text-foreground hover:bg-muted font-semibold"
            title="Save workspace snapshot"
          >
            <Save className="size-3.5 text-foreground" />
            <span className="hidden sm:inline">Snapshot</span>
          </Button>

          <Button 
            variant="outline" 
            size="icon-sm" 
            onClick={() => navigate('/export')}
            title="Export Repository ZIP"
            className="text-muted-foreground hover:text-foreground border-border hover:bg-muted"
          >
            <Download className="size-3.5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => setShowInspector(prev => !prev)}
            title={showInspector ? "Hide Inspector Panel" : "Show Inspector Panel"}
            className={cn("text-muted-foreground hover:text-foreground", showInspector && "bg-muted text-foreground")}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Explicit Stepper Component Header */}
      {!isArchitectMode && (
        <div className="border-b border-border bg-muted/30 px-4 sm:px-6 py-2.5 shrink-0 overflow-x-auto select-none">
          <nav className="flex items-center justify-between min-w-max gap-2 sm:gap-4">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCurrent = step.id === activeStep;
              const isPast = index < currentStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleStepChange(step.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-none transition-none cursor-pointer text-left group",
                      isCurrent 
                        ? "bg-card border-2 border-primary shadow-xs" 
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "size-6 rounded-none flex items-center justify-center text-[11px] font-mono font-bold transition-none shrink-0",
                      isCurrent 
                        ? "bg-primary text-primary-foreground font-bold shadow-xs" 
                        : isPast 
                        ? "bg-[#14532d]/15 text-[#14532d] dark:text-[#86efac] border border-[#14532d]/40" 
                        : "bg-background text-foreground/80 border border-border group-hover:text-foreground"
                    )}>
                      {isPast ? <Check className="size-3.5 stroke-[2.5]" /> : step.number}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-xs font-semibold font-sans leading-none",
                        isCurrent ? "text-foreground font-bold" : isPast ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                      )}>
                        {step.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono hidden md:inline leading-tight mt-0.5">
                        {step.subtitle}
                      </span>
                    </div>
                  </button>

                  {index < WIZARD_STEPS.length - 1 && (
                    <div className="h-px w-6 sm:w-10 bg-border shrink-0 hidden sm:block" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Work Area: Center Content + Right Inspector */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* Center Primary Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            {isArchitectMode ? (
              <div className="h-full min-h-[580px]">
                <AgentWizard onTabChange={(tab) => handleStepChange(normalizeStep(tab))} />
              </div>
            ) : (
              <>
                {activeStep === 'runtime' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-card border border-border rounded-none">
                      <RuntimeFrameworkStep />
                    </div>
                  </div>
                )}

                {activeStep === 'identity' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-card border border-border rounded-none">
                      <IdentityStep />
                    </div>
                  </div>
                )}

                {activeStep === 'capabilities' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-card border border-border rounded-none">
                      <CapabilitiesStep />
                    </div>
                  </div>
                )}

                {activeStep === 'model' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-card border border-border rounded-none">
                      <ModelStep hideGeneration={true} />
                    </div>

                    {/* Live Compiled System Prompt Preview */}
                    <div className="p-4 bg-card border border-border rounded-none space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="size-4 text-[#b45309]" />
                          <span className="text-xs font-mono font-semibold text-foreground">Compiled System Instructions</span>
                          <Badge variant="outline" className="text-[10px] font-mono border-border">
                            {tokenEstimate} tokens
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={copySystemPrompt}
                          className="text-xs font-mono text-muted-foreground hover:text-foreground"
                        >
                          {copiedPrompt ? <Check className="size-3 text-[#1f6a38] mr-1" /> : <Copy className="size-3 mr-1" />}
                          {copiedPrompt ? "Copied" : "Copy Instructions"}
                        </Button>
                      </div>
                      <pre className="font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap max-h-56 overflow-y-auto p-3 bg-muted rounded-none border border-border">
                        {assembledPrompt}
                      </pre>
                    </div>
                  </div>
                )}

                {activeStep === 'synthesize' && (
                  <div className="max-w-4xl mx-auto">
                    <GenerationDashboard onComplete={() => handleStepChange('review')} />
                  </div>
                )}

                {activeStep === 'review' && (
                  <div className="h-full min-h-[600px] -m-5 md:-m-6">
                    <FileEditor />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Stepper Action Footer */}
          {!isArchitectMode && (
            <div className="h-14 border-t border-border bg-background px-6 flex items-center justify-between shrink-0 z-10 select-none">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="text-xs border-border text-foreground hover:bg-muted disabled:opacity-30 font-mono"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Back
              </Button>

              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span>STEP {currentStepIndex + 1} OF {WIZARD_STEPS.length}:</span>
                <span className="font-bold text-foreground">{currentStep.title.toUpperCase()}</span>
              </div>

              <div>
                {currentStepIndex < 4 && (
                  <Button
                    onClick={handleNextStep}
                    variant="amber"
                    className="font-semibold text-xs h-9 px-4 rounded-none shadow-xs flex items-center gap-1.5"
                  >
                    Continue to {WIZARD_STEPS[currentStepIndex + 1].title}
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}

                {currentStepIndex === 4 && (
                  <Button
                    onClick={handleNextStep}
                    variant="amber"
                    className="font-semibold text-xs h-9 px-4 rounded-none shadow-xs flex items-center gap-1.5"
                  >
                    Continue to Review & Edit
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}

                {currentStepIndex === 5 && (
                  <Button
                    onClick={() => navigate('/export')}
                    variant="amber"
                    className="font-semibold text-xs h-9 px-4 rounded-none shadow-xs flex items-center gap-1.5"
                  >
                    Export Agent Bundle (ZIP)
                    <Download className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector / Action Panel */}
        {showInspector && (
          <div className="w-80 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden select-none">
            {/* Inspector Header */}
            <div className="h-11 px-4 border-b border-border bg-muted flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="size-3 text-[#b45309]" /> Inspector & Specs
                </span>
                {state.isCompilingSpec && (
                  <Badge variant="outline" className="text-[9px] font-mono text-[#b45309] bg-[#b45309]/10 border-[#b45309]/30 flex items-center gap-1 py-0 px-1.5 h-4">
                    <span className="size-1.5 rounded-none bg-[#b45309] animate-ping" /> Live
                  </Badge>
                )}
              </div>
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
              <div className="p-3 rounded-none bg-background border border-border space-y-2.5">
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
                      completeness === 100 ? "text-[#1f6a38]" : "text-[#b45309]"
                    )}>
                      {completeness}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {showHealthBreakdown ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {state.isCompilingSpec && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#b45309] bg-muted px-2 py-1 rounded-none border border-border">
                    <span className="flex items-center gap-1.5 truncate">
                      <Loader2 className="size-2.5 animate-spin shrink-0" />
                      <span className="truncate font-medium">{state.compilationStage || 'Synthesizing specification...'}</span>
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-1">⏱ {((state.compilationElapsed || 0) / 10).toFixed(1)}s</span>
                  </div>
                )}

                <div className="w-full h-1.5 bg-muted rounded-none overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300 rounded-none",
                      completeness === 100 ? "bg-[#1f6a38]" : "bg-[#b45309]"
                    )}
                    style={{ width: `${completeness}%` }}
                  />
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight">
                  {completeness === 100 
                    ? "✓ Full specification configured. Ready to test in lab or inspect files." 
                    : `${metCriteriaCount} of ${healthChecklist.length} requirements met. Click items to complete.`}
                </p>

                {showHealthBreakdown && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    {healthChecklist.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleStepChange(item.step)}
                        className={cn(
                          "p-1.5 rounded-none text-[10px] font-mono flex items-center justify-between cursor-pointer transition-none",
                          item.met 
                            ? "bg-muted/60 text-[#1f6a38] hover:bg-muted" 
                            : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {item.met ? (
                            <Check className="size-3 text-[#1f6a38] shrink-0" />
                          ) : (
                            <span className="size-3 rounded-none border border-border shrink-0 inline-block" />
                          )}
                          <span className={cn("font-medium truncate", !item.met && "text-foreground")}>{item.label}</span>
                        </div>
                        <span className={cn("text-[9px] shrink-0 ml-1", item.met ? "text-[#1f6a38]" : "text-[#b45309]")}>
                          {item.met ? "Pass" : "Missing →"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Explicit Model Roles & Configurations */}
              <div className="p-3 bg-muted/40 border border-border space-y-2.5 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Sliders className="size-3 text-primary" /> Active Model Roles
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-border">
                    3 Roles Active
                  </Badge>
                </div>
                
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center p-1.5 bg-background border border-border">
                    <span className="text-muted-foreground">BUILDER (Architect):</span>
                    <strong className="text-foreground truncate max-w-[140px]">
                      {settings.taskModels.architect?.modelId?.replace(/^.*\//, '') || 'gemini-3.7-flash'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-background border border-border">
                    <span className="text-muted-foreground">EXPORT (Agent Target):</span>
                    <strong className="text-foreground truncate max-w-[140px]">
                      {state.modelConfig?.preferred?.replace(/^.*\//, '') || 'claude-sonnet-4-5'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-background border border-border">
                    <span className="text-muted-foreground">TEST (Lab Runner):</span>
                    <strong className="text-foreground truncate max-w-[140px]">
                      {settings.taskModels.chatTests?.modelId?.replace(/^.*\//, '') || 'gemini-3.8-flash'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Explicit Skill Scopes & Tool Access Verification */}
              <div className="p-3 bg-muted/40 border border-border space-y-2.5 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3 text-[#1f6a38]" /> Scopes & Tool Access
                  </span>
                  <Badge 
                    variant={toolAudit.unmappedCount === 0 ? "green" : "amber"} 
                    className="text-[9px] px-1 py-0"
                  >
                    {toolAudit.unmappedCount === 0 ? "100% Verified" : `${toolAudit.unmappedCount} Unmapped`}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="p-1.5 bg-background border border-border">
                    <div className="text-muted-foreground">GLOBAL SCOPE</div>
                    <div className="text-xs font-bold text-foreground">{globalSkillsCount} Skills</div>
                  </div>
                  <div className="p-1.5 bg-background border border-border">
                    <div className="text-muted-foreground">TASK-SCOPED</div>
                    <div className="text-xs font-bold text-foreground">{taskSkillsCount} Skills</div>
                  </div>
                  <div className="p-1.5 bg-background border border-border">
                    <div className="text-muted-foreground">VERIFIED ACCESS</div>
                    <div className="text-xs font-bold text-[#1f6a38]">{toolAudit.verifiedCount} Tools</div>
                  </div>
                  <div className="p-1.5 bg-background border border-border">
                    <div className="text-muted-foreground">UNMAPPED CLAIMS</div>
                    <div className={cn("text-xs font-bold", toolAudit.unmappedCount > 0 ? "text-[#b45309]" : "text-muted-foreground")}>
                      {toolAudit.unmappedCount} Claims
                    </div>
                  </div>
                </div>
              </div>

              {/* Manifest Metadata */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Manifest Metadata
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-foreground font-sans">Agent Name</Label>
                    <span className={cn(
                      "text-[9px] font-mono font-bold uppercase",
                      !hasAgentName ? "text-muted-foreground" : isKebabCaseValid ? "text-[#1f6a38]" : "text-[#b45309]"
                    )}>
                      {!hasAgentName ? "Draft (Optional)" : isKebabCaseValid ? "Valid Kebab-Case" : "Format Warning"}
                    </span>
                  </div>
                  <Input 
                    value={state.manifest.name || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { name: e.target.value }
                    })}
                    placeholder="my-agent-name"
                    className="h-8 text-xs font-mono rounded-none bg-background border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-foreground font-sans">Version</Label>
                    <Input 
                      value={state.manifest.version || '1.0.0'} 
                      onChange={(e) => dispatch({
                        type: 'UPDATE_MANIFEST',
                        payload: { version: e.target.value }
                      })}
                      className="h-8 text-xs font-mono rounded-none bg-background border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-foreground font-sans">Risk Tier</Label>
                    <Select 
                      value={state.manifest.compliance?.risk_tier || 'T1'}
                      onValueChange={(val) => dispatch({
                        type: 'UPDATE_MANIFEST',
                        payload: { compliance: { ...state.manifest.compliance, risk_tier: val as any } }
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs font-mono rounded-none bg-background border-border">
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
                  <Label className="text-[11px] font-semibold text-foreground font-sans">
                    Author <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input 
                    value={state.manifest.author || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { author: e.target.value }
                    })}
                    placeholder="Author name or team"
                    className="h-8 text-xs font-mono rounded-none bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-foreground font-sans">Description</Label>
                  <Textarea 
                    value={state.manifest.description || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { description: e.target.value }
                    })}
                    placeholder="Brief description of the agent's responsibilities..."
                    className="min-h-[64px] text-xs resize-none rounded-none bg-background border-border font-serif"
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Memory & Ingestion */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Memory & State
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-foreground font-sans">Memory Strategy</Label>
                  <Select 
                    value={state.manifest.memory?.strategy || 'ephemeral'}
                    onValueChange={(val) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { memory: { ...state.manifest.memory, strategy: val as any } }
                    })}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono rounded-none bg-background border-border">
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
                  <Label className="text-[11px] font-semibold text-foreground font-sans">Max Context Tokens</Label>
                  <Input 
                    type="number"
                    min={512}
                    max={2000000}
                    value={state.manifest.memory?.max_tokens || state.modelConfig?.constraints?.max_tokens || 8192} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 8192;
                      dispatch({
                        type: 'UPDATE_WORKSPACE',
                        payload: {
                          manifest: {
                            ...state.manifest,
                            memory: { ...state.manifest.memory, max_tokens: val }
                          },
                          modelConfig: {
                            ...state.modelConfig,
                            constraints: { ...state.modelConfig?.constraints, max_tokens: val }
                          }
                        }
                      });
                    }}
                    className="h-8 text-xs font-mono rounded-none bg-background border-border"
                  />
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* File Injection Slots Overview */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  File Injection Slots
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => handleStepChange('review')}
                    className="w-full flex items-center justify-between p-2 rounded-none bg-muted/40 border border-border hover:border-primary transition-none text-left cursor-pointer group"
                  >
                    <span className="text-foreground flex items-center gap-1.5 group-hover:text-primary">
                      <FileCode className="size-3 text-muted-foreground" /> SOUL.md
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={state.soul ? "green" : "outline"} className="text-[9px]">
                        {state.soul ? `${Math.round(state.soul.length / 4)} tok` : 'EMPTY'}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepChange('review')}
                    className="w-full flex items-center justify-between p-2 rounded-none bg-muted/40 border border-border hover:border-primary transition-none text-left cursor-pointer group"
                  >
                    <span className="text-foreground flex items-center gap-1.5 group-hover:text-primary">
                      <FileCode className="size-3 text-muted-foreground" /> RULES.md
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={state.rules ? "green" : "outline"} className="text-[9px]">
                        {state.rules ? `${Math.round(state.rules.length / 4)} tok` : 'EMPTY'}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepChange('review')}
                    className="w-full flex items-center justify-between p-2 rounded-none bg-muted/40 border border-border hover:border-primary transition-none text-left cursor-pointer group"
                  >
                    <span className="text-foreground flex items-center gap-1.5 group-hover:text-primary">
                      <FileCode className="size-3 text-muted-foreground" /> PROMPT.md
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={state.prompt_md ? "green" : "outline"} className="text-[9px]">
                        {state.prompt_md ? `${Math.round(state.prompt_md.length / 4)} tok` : 'EMPTY'}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Next Recommended Steps Card */}
              <div className="pt-2 space-y-2">
                <div className="p-3 border border-border bg-muted/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <ArrowRight className="size-3.5 text-[#b45309]" /> Next Recommended Step
                    </span>
                    <Badge variant="amber" className="text-[9px]">
                      READY
                    </Badge>
                  </div>

                  {/* Primary Next Action */}
                  <Button 
                    onClick={() => navigate('/workbench/chat')}
                    variant="amber"
                    className="w-full h-8.5 rounded-none text-xs font-semibold gap-1.5 justify-center shadow-xs font-sans"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>1. Test in Agent Lab →</span>
                  </Button>

                  {/* Secondary Next Action */}
                  <Button 
                    onClick={() => handleStepChange('review')}
                    variant="outline" 
                    className="w-full h-8 rounded-none text-xs font-medium gap-1.5 justify-center border-border hover:border-primary text-foreground font-sans"
                  >
                    <Code2 className="size-3.5 text-[#b45309]" />
                    <span>2. Review in File Editor</span>
                  </Button>

                  {/* Other Actions Row */}
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border">
                    <Button 
                      onClick={() => navigate('/workbench/skills')}
                      variant="ghost" 
                      size="xs"
                      className="h-7 text-[10px] font-mono gap-1 justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Zap className="size-3 text-[#b45309]" /> Skills
                    </Button>
                    <Button 
                      onClick={() => navigate('/export')}
                      variant="ghost" 
                      size="xs"
                      className="h-7 text-[10px] font-mono gap-1 justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Download className="size-3 text-muted-foreground" /> Export
                    </Button>
                    <Button 
                      onClick={() => setShowResetDialog(true)}
                      variant="ghost" 
                      size="xs"
                      className="h-7 text-[10px] font-mono gap-1 justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Reset or restart agent builder"
                    >
                      <RotateCcw className="size-3 text-muted-foreground" /> Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Reset / Restart Dialog */}
      <ResetRestartDialog 
        open={showResetDialog} 
        onOpenChange={setShowResetDialog} 
      />

      {/* Guided Agent & Subagent Manager */}
      <GuidedManagerDialog
        isOpen={showManagerDialog}
        onClose={() => setShowManagerDialog(false)}
      />
    </div>
  );
}
