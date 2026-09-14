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
  ArrowRight
} from 'lucide-react';
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

  const activeStep = normalizeStep(searchParams.get('tab'));
  const isArchitectMode = searchParams.get('tab') === 'architect';
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showInspector, setShowInspector] = useState(true);

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

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-transparent text-foreground select-text">
      {/* Top Action & Breadcrumb Bar */}
      <div className="h-14 border-b border-[#A0D2EB]/15 bg-[#172129]/85 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-sm bg-[#1E2833] text-[#A0D2EB] border border-[#A0D2EB]/30 flex items-center justify-center shadow-xs shrink-0">
            <Cpu className="size-4.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-sm tracking-tight text-foreground font-sans">Agent Builder</span>
            <span className="text-[#A0D2EB]/40 text-xs">/</span>
            <span className="font-mono text-xs font-bold text-foreground truncate">
              {state.manifest.name || "untitled-agent"}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono text-[9px] px-1.5 py-0 uppercase",
                completeness === 100 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-[#E9C46A]/10 text-[#E9C46A] border-[#E9C46A]/30"
              )}
            >
              {completeness}% Configured
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-[#141A20]/80 border border-[#A0D2EB]/15 rounded-sm text-[11px] font-mono">
            <span className="text-[#A0D2EB]/60">TOKENS: <strong className="text-foreground font-bold">{tokenEstimate.toLocaleString()}</strong></span>
            <span className="text-[#A0D2EB]/20">|</span>
            <span className="text-[#A0D2EB]/60">SKILLS: <strong className="text-foreground font-bold">{state.manifest.skills?.length || 0}</strong></span>
            <span className="text-[#A0D2EB]/20">|</span>
            <span className="text-[#A0D2EB]/60">RISK: <strong className="text-foreground font-bold">{state.manifest.compliance?.risk_tier || 'T1'}</strong></span>
          </div>

          {/* Git Branch & Status Pill */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/workbench/git')}
            className="text-xs font-mono gap-1.5 border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
            title="Git Repository & Sync"
          >
            <GitBranch className="size-3.5 text-[#A0D2EB]" />
            <span className="hidden md:inline">{state.git?.currentBranch || 'main'}</span>
            {state.git?.sync?.ahead > 0 && (
              <span className="text-[10px] font-bold text-primary">↑{state.git.sync.ahead}</span>
            )}
          </Button>

          <Button 
            variant="outline"
            size="sm" 
            onClick={() => setSearchParams({ tab: isArchitectMode ? activeStep : 'architect' })}
            className={cn(
              "text-xs font-medium gap-1.5",
              isArchitectMode 
                ? "bg-[#A0D2EB]/20 text-white border-[#A0D2EB]/40 font-semibold" 
                : "border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
            )}
            title="Toggle Conversational AI Architect Studio"
          >
            <Sparkles className="size-3.5 text-[#A0D2EB]" />
            <span className="hidden sm:inline">AI Architect</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/workbench/chat')}
            className="text-xs font-medium gap-1.5 border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
          >
            <MessageSquare className="size-3.5 text-[#A0D2EB]" />
            <span className="hidden sm:inline">Test in Lab</span>
          </Button>

          <Button 
            variant="warm"
            size="sm" 
            onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'Manual Save' })}
            className="text-xs gap-1.5"
          >
            <Save className="size-3.5" />
            <span className="hidden sm:inline">Snapshot</span>
          </Button>

          <Button 
            variant="outline" 
            size="icon-sm" 
            onClick={() => navigate('/export')}
            title="Export Repository ZIP"
            className="text-[#A0D2EB]/70 hover:text-foreground border-[#A0D2EB]/20 hover:bg-[#A0D2EB]/10"
          >
            <Download className="size-3.5" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => setShowInspector(prev => !prev)}
            title={showInspector ? "Hide Inspector Panel" : "Show Inspector Panel"}
            className={cn("text-[#A0D2EB]/70 hover:text-foreground", showInspector && "bg-[#A0D2EB]/10 text-foreground")}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </div>

      {/* Explicit Stepper Component Header */}
      {!isArchitectMode && (
        <div className="border-b border-[#A0D2EB]/15 bg-[#141A20]/70 px-4 sm:px-6 py-2.5 shrink-0 overflow-x-auto select-none">
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
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-sm transition-all cursor-pointer text-left group",
                      isCurrent 
                        ? "bg-[#1E2833] border border-[#A0D2EB]/35 shadow-xs" 
                        : "hover:bg-[#A0D2EB]/5 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "size-6 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-all shrink-0",
                      isCurrent 
                        ? "bg-[#A0D2EB] text-[#141A20] shadow-xs" 
                        : isPast 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : "bg-[#1E2833] text-[#A0D2EB]/50 border border-[#A0D2EB]/20 group-hover:text-foreground"
                    )}>
                      {isPast ? <Check className="size-3.5 stroke-[2.5]" /> : step.number}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className={cn(
                        "text-xs font-semibold font-sans leading-none",
                        isCurrent ? "text-foreground" : isPast ? "text-foreground/90" : "text-[#A0D2EB]/60 group-hover:text-foreground"
                      )}>
                        {step.title}
                      </span>
                      <span className="text-[10px] text-[#A0D2EB]/40 font-mono hidden md:inline leading-tight mt-0.5">
                        {step.subtitle}
                      </span>
                    </div>
                  </button>

                  {index < WIZARD_STEPS.length - 1 && (
                    <div className="h-px w-6 sm:w-10 bg-[#A0D2EB]/15 shrink-0 hidden sm:block" />
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
                    <div className="p-4 bg-[#141A20]/40 border border-[#A0D2EB]/15 rounded-md">
                      <RuntimeFrameworkStep />
                    </div>
                  </div>
                )}

                {activeStep === 'identity' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-[#141A20]/40 border border-[#A0D2EB]/15 rounded-md">
                      <IdentityStep />
                    </div>
                  </div>
                )}

                {activeStep === 'capabilities' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-[#141A20]/40 border border-[#A0D2EB]/15 rounded-md">
                      <CapabilitiesStep />
                    </div>
                  </div>
                )}

                {activeStep === 'model' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="p-4 bg-[#141A20]/40 border border-[#A0D2EB]/15 rounded-md">
                      <ModelStep hideGeneration={true} />
                    </div>

                    {/* Live Compiled System Prompt Preview */}
                    <div className="p-4 bg-[#141A20]/60 border border-[#A0D2EB]/15 rounded-md space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Terminal className="size-4 text-[#E76F51]" />
                          <span className="text-xs font-mono font-semibold text-foreground">Compiled System Instructions</span>
                          <Badge variant="outline" className="text-[10px] font-mono border-[#A0D2EB]/20 text-[#A0D2EB]/80">
                            {tokenEstimate} tokens
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="xs" 
                          onClick={copySystemPrompt}
                          className="text-xs font-mono text-[#A0D2EB]/70 hover:text-foreground"
                        >
                          {copiedPrompt ? <Check className="size-3 text-emerald-400 mr-1" /> : <Copy className="size-3 mr-1" />}
                          {copiedPrompt ? "Copied" : "Copy Instructions"}
                        </Button>
                      </div>
                      <pre className="font-mono text-[11px] leading-relaxed text-[#A0D2EB]/90 whitespace-pre-wrap max-h-56 overflow-y-auto p-3 bg-[#172129] rounded-sm border border-[#A0D2EB]/10">
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
            <div className="h-14 border-t border-[#A0D2EB]/15 bg-[#172129]/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10 select-none">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="text-xs border-[#A0D2EB]/20 text-[#A0D2EB]/80 hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-3.5 mr-1" /> Back
              </Button>

              <div className="flex items-center gap-2 text-xs font-mono text-[#A0D2EB]/70">
                <span>Step {currentStepIndex + 1} of {WIZARD_STEPS.length}:</span>
                <span className="font-semibold text-foreground">{currentStep.title}</span>
              </div>

              <div>
                {currentStepIndex < 4 && (
                  <Button
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-[#E76F51] to-[#E9C46A] hover:brightness-110 text-[#141A20] font-semibold text-xs h-9 px-4 rounded-sm shadow-md flex items-center gap-1.5"
                  >
                    Continue to {WIZARD_STEPS[currentStepIndex + 1].title}
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}

                {currentStepIndex === 4 && (
                  <Button
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-[#E76F51] to-[#E9C46A] hover:brightness-110 text-[#141A20] font-semibold text-xs h-9 px-4 rounded-sm shadow-md flex items-center gap-1.5"
                  >
                    Continue to Review & Edit
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}

                {currentStepIndex === 5 && (
                  <Button
                    onClick={() => navigate('/export')}
                    className="bg-gradient-to-r from-[#E76F51] to-[#E9C46A] hover:brightness-110 text-[#141A20] font-semibold text-xs h-9 px-4 rounded-sm shadow-md flex items-center gap-1.5"
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
          <div className="w-80 shrink-0 border-l border-[#A0D2EB]/15 bg-[#141A20]/80 flex flex-col overflow-hidden select-none">
            {/* Inspector Header */}
            <div className="h-11 px-4 border-b border-[#A0D2EB]/15 bg-[#141A20] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/70 flex items-center gap-1.5">
                  <Sliders className="size-3 text-[#E76F51]" /> Inspector & Specs
                </span>
                {state.isCompilingSpec && (
                  <Badge variant="outline" className="text-[9px] font-mono text-[#E76F51] bg-[#E76F51]/10 border-[#E76F51]/30 flex items-center gap-1 py-0 px-1.5 h-4">
                    <span className="size-1.5 rounded-full bg-[#E76F51] animate-ping" /> Live
                  </Badge>
                )}
              </div>
              <button 
                onClick={() => setShowInspector(false)}
                className="text-[#A0D2EB]/50 hover:text-foreground text-xs"
                title="Close Inspector"
              >
                ✕
              </button>
            </div>

            {/* Inspector Form Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Specification Health Interactive Checklist Card */}
              <div className="p-3 rounded-sm bg-[#172129] border border-[#A0D2EB]/15 space-y-2.5">
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
                      completeness === 100 ? "text-[#1f2f00]" : completeness > 50 ? "text-foreground" : "text-[#a03e3d]"
                    )}>
                      {completeness}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {showHealthBreakdown ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {state.isCompilingSpec && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#a03e3d] bg-surface-container px-2 py-1 rounded-none border border-border">
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
                      completeness === 100 ? "bg-[#1f2f00]" : "bg-[#a03e3d]"
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
                            ? "bg-surface-container text-[#1f2f00] hover:bg-surface-container-high" 
                            : "bg-surface-container-low text-muted-foreground hover:bg-surface-container hover:text-foreground border border-border/50"
                        )}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {item.met ? (
                            <Check className="size-3 text-[#1f2f00] shrink-0" />
                          ) : (
                            <span className="size-3 rounded-none border border-border shrink-0 inline-block" />
                          )}
                          <span className={cn("font-medium truncate", !item.met && "text-foreground")}>{item.label}</span>
                        </div>
                        <span className="text-[9px] opacity-75 shrink-0 ml-1 text-muted-foreground">
                          {item.met ? "Pass" : "Missing →"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manifest Metadata */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/70">
                  Manifest Metadata
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-foreground">Agent Name</Label>
                    <span className={cn(
                      "text-[9px] font-mono font-bold uppercase",
                      !hasAgentName ? "text-[#A0D2EB]/50" : isKebabCaseValid ? "text-emerald-400" : "text-destructive"
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
                      "h-8 text-xs font-mono rounded-sm bg-background border-[#A0D2EB]/20",
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
                      className="h-8 text-xs font-mono rounded-sm bg-background border-[#A0D2EB]/20"
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
                      <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-[#A0D2EB]/20">
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
                    Author <span className="text-[10px] font-normal text-[#A0D2EB]/60">(Optional)</span>
                  </Label>
                  <Input 
                    value={state.manifest.author || ''} 
                    onChange={(e) => dispatch({
                      type: 'UPDATE_MANIFEST',
                      payload: { author: e.target.value }
                    })}
                    placeholder="Author name or team"
                    className="h-8 text-xs font-mono rounded-sm bg-background border-[#A0D2EB]/20"
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
                    className="min-h-[64px] text-xs resize-none rounded-sm bg-background border-[#A0D2EB]/20"
                  />
                </div>
              </div>

              <div className="h-px bg-[#A0D2EB]/15" />

              {/* Memory & Ingestion */}
              <div className="space-y-3">
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A0D2EB]/70">
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
                    <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-[#A0D2EB]/20">
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
                    className="h-8 text-xs font-mono rounded-sm bg-background border-[#A0D2EB]/20"
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
                    className="w-full flex items-center justify-between p-2 rounded-none bg-surface-container-low border border-border hover:border-[#171611] transition-none text-left cursor-pointer group"
                  >
                    <span className="text-foreground flex items-center gap-1.5 group-hover:text-[#a03e3d]">
                      <FileCode className="size-3 text-[#a03e3d]" /> SOUL.md
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={state.soul ? "olive" : "outline"} className="text-[9px]">
                        {state.soul ? `${Math.round(state.soul.length / 4)} tok` : 'EMPTY'}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepChange('review')}
                    className="w-full flex items-center justify-between p-2 rounded-none bg-surface-container-low border border-border hover:border-[#171611] transition-none text-left cursor-pointer group"
                  >
                    <span className="text-foreground flex items-center gap-1.5 group-hover:text-[#a03e3d]">
                      <FileCode className="size-3 text-[#a03e3d]" /> RULES.md
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={state.rules ? "olive" : "outline"} className="text-[9px]">
                        {state.rules ? `${Math.round(state.rules.length / 4)} tok` : 'EMPTY'}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStepChange('review')}
                    className="w-full flex items-center justify-between p-2 rounded-none bg-surface-container-low border border-border hover:border-[#171611] transition-none text-left cursor-pointer group"
                  >
                    <span className="text-foreground flex items-center gap-1.5 group-hover:text-[#a03e3d]">
                      <FileCode className="size-3 text-[#a03e3d]" /> PROMPT.md
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={state.prompt_md ? "olive" : "outline"} className="text-[9px]">
                        {state.prompt_md ? `${Math.round(state.prompt_md.length / 4)} tok` : 'EMPTY'}
                      </Badge>
                      <ChevronRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Next Recommended Steps Card */}
              <div className="pt-2 space-y-2">
                <div className="p-3 border-2 border-[#171611] bg-card space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <ArrowRight className="size-3.5 text-[#a03e3d]" /> Next Recommended Step
                    </span>
                    <Badge variant="maroon" className="text-[9px]">
                      READY
                    </Badge>
                  </div>

                  {/* Primary Next Action */}
                  <Button 
                    onClick={() => navigate('/workbench/chat')}
                    variant="maroon"
                    className="w-full h-8.5 rounded-none text-xs font-semibold gap-1.5 justify-center shadow-xs"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>1. Test in Agent Lab →</span>
                  </Button>

                  {/* Secondary Next Action */}
                  <Button 
                    onClick={() => handleStepChange('review')}
                    variant="outline" 
                    className="w-full h-8 rounded-none text-xs font-medium gap-1.5 justify-center border-border hover:border-[#171611] text-foreground"
                  >
                    <Code2 className="size-3.5 text-[#a03e3d]" />
                    <span>2. Review in File Editor</span>
                  </Button>

                  {/* Other Actions Row */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/50">
                    <Button 
                      onClick={() => navigate('/workbench/skills')}
                      variant="ghost" 
                      size="xs"
                      className="h-7 text-[10px] font-mono gap-1 justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container"
                    >
                      <Zap className="size-3 text-[#a03e3d]" /> Skills
                    </Button>
                    <Button 
                      onClick={() => navigate('/export')}
                      variant="ghost" 
                      size="xs"
                      className="h-7 text-[10px] font-mono gap-1 justify-center text-muted-foreground hover:text-foreground hover:bg-surface-container"
                    >
                      <Download className="size-3 text-[#a03e3d]" /> Export ZIP
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
