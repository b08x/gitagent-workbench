import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { runGeneration, OrchestratorEvent } from '../../lib/generation/orchestrator';
import { loadWorkspaceSnapshot, clearWorkspaceSnapshot } from '../../lib/generation/persistence';
import { getApplicableSteps, GenerationStep } from '../../lib/generation/steps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  RotateCcw,
  Sparkles,
  Clock,
  Play,
  FileCode,
  Download,
  AlertCircle,
  Square,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_LABELS: Record<string, string> = {
  SANITIZE_INPUTS:    'Sanitize & Validate Inputs',
  GEN_YAML:           'Synthesize Manifest (agent.yaml)',
  GEN_SOUL:           'Synthesize Persona & Soul (SOUL.md)',
  GEN_INSTRUCTIONS:   'Generate Core Instructions (RULES/PROMPT/DUTIES)',
  GEN_CONFIG:         'Compile Runtime Settings (config.yaml)',
  GEN_SKILLS:         'Generate Skill Capabilities (skills/)',
  GEN_KNOWLEDGE_DOCS: 'Compile Knowledge Documents',
  GEN_TOOLS:          'Synthesize Tool Schemas (tools/)',
  GEN_SUBAGENTS:      'Configure Sub-Agent Graph',
  GEN_WORKFLOWS:      'Generate Deterministic Workflows',
  GEN_EXAMPLES:       'Synthesize Golden Examples',
  VALIDATE_OUT:       'Workspace Integrity & Schema Validation',
  COMPLETE:           'Synthesis Complete',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  SANITIZE_INPUTS:    'Normalizes names, tags, model configs, and parameters',
  GEN_YAML:           'Builds structured Agent Specification and metadata contract',
  GEN_SOUL:           'Infuses agent personality, boundaries, and communication style',
  GEN_INSTRUCTIONS:   'Generates executable rules, system prompts, and task scopes',
  GEN_CONFIG:         'Maps runtime parameters, rate limits, and fallback models',
  GEN_SKILLS:         'Synthesizes function descriptions and instructions for all skills',
  GEN_KNOWLEDGE_DOCS: 'Drafts referenced context files and knowledge documentation',
  GEN_TOOLS:          'Constructs canonical schema definitions and permission boundaries',
  GEN_SUBAGENTS:      'Configures hierarchical multi-agent delegation routes',
  GEN_WORKFLOWS:      'Creates multi-step procedural task graphs',
  GEN_EXAMPLES:       'Generates input/output demonstrations for deterministic alignment',
  VALIDATE_OUT:       'Runs AST, JSON Schema, and markdown structural integrity checks',
  COMPLETE:           'All artifacts prepared and indexed for deployment',
};

function stepLabel(step: string): string {
  if (step.startsWith('GEN_SKILL:')) return `skills/${step.replace('GEN_SKILL:', '')}/SKILL.md`;
  if (step.startsWith('GEN_TOOL:'))  return `tools/${step.replace('GEN_TOOL:', '')}.yaml`;
  return STEP_LABELS[step] || step;
}

function isSubStep(step: string): boolean {
  return step.startsWith('GEN_SKILL:') || step.startsWith('GEN_TOOL:');
}

export function GenerationDashboard({ onComplete }: { onComplete?: () => void }) {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Map<string, OrchestratorEvent>>(new Map());
  const [stepOrder, setStepOrder] = useState<string[]>([]);
  const [showSubSteps, setShowSubSteps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumePrompt, setResumePrompt] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const isCancelledRef = React.useRef(false);

  // Derive all planned pipeline steps for this workspace
  const plannedSteps = useMemo(() => {
    return getApplicableSteps(state);
  }, [state.meta.structureType]);

  useEffect(() => {
    const snapshot = loadWorkspaceSnapshot();
    if (snapshot && snapshot.meta.status !== 'complete' && state.meta.status !== 'generating') {
      if (snapshot.soul && !snapshot.rules) {
        setResumePrompt('GEN_INSTRUCTIONS');
      } else if (snapshot.rules && !Object.keys(snapshot.tools || {}).length) {
        setResumePrompt('GEN_TOOLS');
      }
    }
  }, []);

  const handleResume = (step: string) => {
    const snapshot = loadWorkspaceSnapshot();
    if (snapshot) {
      dispatch({ type: 'SET_WORKSPACE', payload: snapshot });
      dispatch({ type: 'UPDATE_META', payload: { status: 'generating' } });
    }
    setResumePrompt(null);
  };

  const startPipeline = () => {
    isCancelledRef.current = false;
    setError(null);
    dispatch({ type: 'UPDATE_META', payload: { status: 'generating' } });
  };

  const handleCancelSynthesis = () => {
    isCancelledRef.current = true;
    setIsSynthesizing(false);
    dispatch({ type: 'UPDATE_META', payload: { status: 'intake' } });
    setError('Synthesis was cancelled by user.');
  };

  const handleRestartPipeline = () => {
    isCancelledRef.current = false;
    setEvents(new Map());
    setStepOrder([]);
    setError(null);
    clearWorkspaceSnapshot();
    startPipeline();
  };

  const handleResetPipeline = () => {
    isCancelledRef.current = true;
    setIsSynthesizing(false);
    setEvents(new Map());
    setStepOrder([]);
    setError(null);
    clearWorkspaceSnapshot();
    dispatch({ type: 'UPDATE_META', payload: { status: 'intake' } });
  };

  useEffect(() => {
    if (state.meta.status !== 'generating') {
      setIsSynthesizing(false);
      return;
    }

    const apiKey = settings.apiKeys[settings.providerId];
    if (!apiKey) {
      setError('No API key set for the selected provider. Please configure your API key in Settings or Model step.');
      return;
    }

    setIsSynthesizing(true);
    isCancelledRef.current = false;

    const startGen = async () => {
      try {
        const gen = runGeneration(state, { 
          providerId: settings.providerId, 
          apiKey,
          modelId: settings.modelId,
          fallbackModelIds: state.generationConfig.fallbackModelIds,
          apiKeys: settings.apiKeys,
          resumeFromStep: resumePrompt || undefined
        });
        for await (const event of gen) {
          if (isCancelledRef.current) break;
          setEvents(prev => { const n = new Map(prev); n.set(event.step, event); return n; });
          setStepOrder(prev => prev.includes(event.step) ? prev : [...prev, event.step]);
          if (event.workspace && !isCancelledRef.current) {
            dispatch({ type: 'SET_WORKSPACE', payload: event.workspace });
          }
        }
      } catch (err: any) {
        if (!isCancelledRef.current) {
          setError(err.message || 'Generation failed unexpectedly');
        }
      } finally {
        setIsSynthesizing(false);
      }
    };

    startGen();
  }, [state.meta.status]);

  const isComplete = state.meta.status === 'complete';
  const hasErrors = Array.from(events.values()).some((e: OrchestratorEvent) => e.status === 'error');

  // Calculate progress
  const completedStepsCount = plannedSteps.filter(s => events.get(s.id)?.status === 'done').length;
  const progressPercent = plannedSteps.length > 0 
    ? Math.round((completedStepsCount / plannedSteps.length) * 100) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#A0D2EB]/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-5 text-[#E76F51]" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isComplete ? 'Agent Artifacts Generated' : isSynthesizing ? 'Synthesizing Agent Specification' : 'Agent Synthesis Pipeline'}
            </h2>
          </div>
          <p className="text-sm text-[#A0D2EB]/70">
            {isComplete
              ? hasErrors ? 'Pipeline completed with diagnostic alerts — review details below.' : 'All agent specification files, manifests, and skills generated successfully.'
              : isSynthesizing
              ? 'Compiling structured agent files into repository tree...'
              : 'Review planned generation steps and initiate LLM file synthesis.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSynthesizing && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleCancelSynthesis}
              className="text-xs h-9 px-3.5 gap-1.5 shadow-xs font-mono"
            >
              <Square className="size-3.5 fill-current" />
              <span>Cancel Synthesis</span>
            </Button>
          )}

          {!isSynthesizing && !isComplete && (
            <div className="flex items-center gap-2">
              {events.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPipeline}
                  className="text-xs font-mono border-border text-foreground hover:border-[#171611] gap-1 h-9"
                  title="Reset pipeline progress"
                >
                  <RefreshCw className="size-3 text-[#a03e3d]" />
                  <span>Reset</span>
                </Button>
              )}
              <Button 
                onClick={startPipeline}
                className="bg-gradient-to-r from-[#E76F51] to-[#E9C46A] hover:brightness-110 text-[#141A20] font-semibold text-xs h-9 px-4 rounded-sm shadow-md"
              >
                <Play className="mr-1.5 size-3.5 fill-current" />
                {events.size > 0 ? 'Resume Pipeline' : 'Start Synthesis Pipeline'}
              </Button>
            </div>
          )}

          {isComplete && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartPipeline}
                className="text-xs font-mono border-border text-foreground hover:border-[#171611] gap-1 h-9"
                title="Restart synthesis pipeline from beginning"
              >
                <RotateCcw className="size-3 text-[#a03e3d]" />
                <span>Restart</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/export')}
                className="text-xs border-[#A0D2EB]/20 text-[#A0D2EB]/80 hover:text-foreground h-9"
              >
                <Download className="mr-1.5 size-3.5" />
                Export ZIP
              </Button>
              <Button 
                onClick={() => onComplete ? onComplete() : navigate('/workbench/agent?tab=review')}
                className="bg-gradient-to-r from-[#E76F51] to-[#E9C46A] hover:brightness-110 text-[#141A20] font-semibold text-xs h-9 px-4 rounded-sm shadow-md"
              >
                Review & Edit Files
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 border border-destructive/40 bg-destructive/10 rounded-md text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-xs">Synthesis Interrupted</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Resume partial snapshot banner */}
      {resumePrompt && (
        <Card className="border-[#E76F51]/30 bg-[#E76F51]/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RotateCcw className="size-4 text-[#E76F51]" />
              <div>
                <p className="text-xs font-semibold text-foreground">Partial Generation Snapshot Found</p>
                <p className="text-[11px] text-[#A0D2EB]/70">Would you like to resume from "{STEP_LABELS[resumePrompt] || resumePrompt}"?</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="xs" onClick={() => { clearWorkspaceSnapshot(); setResumePrompt(null); }} className="text-xs text-muted-foreground">
                Discard
              </Button>
              <Button size="xs" onClick={() => handleResume(resumePrompt)} className="text-xs bg-[#E76F51] text-white">
                Resume
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar Header */}
      <div className="p-4 rounded-md border border-[#A0D2EB]/15 bg-[#141A20]/40 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[#A0D2EB]/80 flex items-center gap-1.5">
            <span className="font-semibold text-foreground">{completedStepsCount}</span> of <span className="font-semibold text-foreground">{plannedSteps.length}</span> pipeline steps complete
          </span>
          <span className="font-mono font-bold text-foreground">
            {isComplete ? '100%' : `${progressPercent}%`}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1E2833] overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#E76F51] to-[#E9C46A] transition-all duration-300 rounded-full"
            style={{ width: `${isComplete ? 100 : progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sub-steps toggle */}
      {stepOrder.some(isSubStep) && (
        <div className="flex justify-end">
          <button
            className="flex items-center gap-1 text-xs text-[#A0D2EB]/70 hover:text-foreground transition-colors cursor-pointer"
            onClick={() => setShowSubSteps(v => !v)}
          >
            {showSubSteps ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {showSubSteps ? 'Hide' : 'Show'} individual skill/tool substeps
          </button>
        </div>
      )}

      {/* Structured Step Cards List */}
      <div className="grid gap-2.5">
        {plannedSteps.map((plannedStep, idx) => {
          const event = events.get(plannedStep.id);
          const isStarted = event?.status === 'start' || event?.status === 'progress';
          const isDone = event?.status === 'done' || (isComplete && !event);
          const isError = event?.status === 'error';
          const isPending = !event && !isComplete;

          return (
            <div 
              key={plannedStep.id}
              className={cn(
                "p-3.5 rounded-sm border transition-all flex flex-col gap-2",
                isDone 
                  ? "bg-[#1E2833]/40 border-emerald-500/30" 
                  : isStarted 
                  ? "bg-[#1E2833] border-[#E76F51]/50 shadow-[0_0_12px_rgba(231,111,81,0.1)]" 
                  : isError
                  ? "bg-destructive/10 border-destructive/50"
                  : "bg-[#141A20]/30 border-[#A0D2EB]/10 opacity-75"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : isStarted ? (
                      <Loader2 className="size-4 animate-spin text-[#E76F51]" />
                    ) : isError ? (
                      <XCircle className="size-4 text-destructive" />
                    ) : (
                      <div className="size-4 rounded-full border border-[#A0D2EB]/30 flex items-center justify-center text-[9px] font-mono text-[#A0D2EB]/60">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-mono font-medium truncate", isDone ? "text-foreground" : isStarted ? "text-foreground font-bold" : "text-[#A0D2EB]/70")}>
                      {plannedStep.label}
                    </p>
                    <p className="text-[11px] text-[#A0D2EB]/50 truncate">
                      {STEP_DESCRIPTIONS[plannedStep.id] || STEP_LABELS[plannedStep.id]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-xs font-semibold",
                    isDone 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : isStarted 
                      ? "bg-[#E76F51]/10 text-[#E76F51] border border-[#E76F51]/30 animate-pulse" 
                      : isError
                      ? "bg-destructive/20 text-destructive border border-destructive/30"
                      : "bg-[#A0D2EB]/5 text-[#A0D2EB]/40 border border-[#A0D2EB]/10"
                  )}>
                    {isDone ? 'Completed' : isStarted ? 'Synthesizing...' : isError ? 'Failed' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Streaming or error console preview */}
              {isError && event?.content && (
                <div className="mt-1 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-mono">
                  {event.content}
                </div>
              )}

              {isStarted && event?.content && (
                <div className="mt-1 p-2 rounded bg-[#141A20] border border-[#A0D2EB]/15 text-[#A0D2EB]/80 text-[11px] font-mono line-clamp-2">
                  {event.content.slice(-200)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sub-steps generated on the fly */}
      {showSubSteps && stepOrder.filter(isSubStep).length > 0 && (
        <div className="pt-2 space-y-1.5">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#A0D2EB]/60">
            Synthesized Sub-Modules
          </p>
          <div className="grid gap-1.5 pl-4 border-l border-[#A0D2EB]/20">
            {stepOrder.filter(isSubStep).map(subStep => {
              const event = events.get(subStep);
              return (
                <div key={subStep} className="flex items-center justify-between py-1 px-2.5 rounded-xs bg-[#1E2833]/30 border border-[#A0D2EB]/10 text-xs font-mono">
                  <span className="text-[#A0D2EB]/80">{stepLabel(subStep)}</span>
                  <CheckCircle2 className="size-3 text-emerald-400" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post-Validation Diagnostics */}
      {isComplete && state.validationResult && (
        <div className="p-4 rounded-md border border-[#A0D2EB]/20 bg-[#141A20]/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold font-mono text-foreground">Integrity Verification</span>
            <Badge variant={state.validationResult.valid ? "outline" : "destructive"} className="text-[10px] font-mono">
              {state.validationResult.valid ? "Passed All Rules" : `${state.validationResult.errors.length} Issues`}
            </Badge>
          </div>
          {state.validationResult.errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive font-mono">{e.file}: {e.message}</p>
          ))}
          {state.validationResult.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-400 font-mono">{w.file}: {w.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
