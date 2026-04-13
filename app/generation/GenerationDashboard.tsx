import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { runGeneration, OrchestratorEvent } from '../../lib/generation/orchestrator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';

const STEP_LABELS: Record<string, string> = {
  GEN_YAML:      'agent.yaml',
  GEN_SOUL:      'SOUL.md',
  GEN_RULES:     'RULES.md',
  GEN_PROMPT:    'PROMPT.md',
  GEN_DUTIES:    'DUTIES.md',
  GEN_CONFIG:    'config.yaml',
  GEN_SKILLS:    'skills/',
  GEN_TOOLS:     'tools/',
  GEN_WORKFLOWS: 'workflows/',
  GEN_EXAMPLES:  'examples/',
  VALIDATE_OUT:  'Validation',
  COMPLETE:      'Complete',
};

function stepLabel(step: string): string {
  if (step.startsWith('GEN_SKILL:')) return `  skills/${step.replace('GEN_SKILL:', '')}/SKILL.md`;
  if (step.startsWith('GEN_TOOL:'))  return `  tools/${step.replace('GEN_TOOL:', '')}.yaml`;
  return STEP_LABELS[step] || step;
}

function isSubStep(step: string): boolean {
  return step.startsWith('GEN_SKILL:') || step.startsWith('GEN_TOOL:');
}

export function GenerationDashboard() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Map<string, OrchestratorEvent>>(new Map());
  const [stepOrder, setStepOrder] = useState<string[]>([]);
  const [showSubSteps, setShowSubSteps] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.meta.status !== 'generating') return;

    const apiKey = settings.apiKeys[settings.providerId];
    if (!apiKey) {
      setError('No API key set. Return to the Model step and enter your key.');
      return;
    }

    const startGen = async () => {
      try {
        const gen = runGeneration(state, { 
          providerId: settings.providerId, 
          apiKey,
          modelId: settings.modelId,
          fallbackModelIds: state.generationConfig.fallbackModelIds,
          apiKeys: settings.apiKeys
        });
        for await (const event of gen) {
          setEvents(prev => { const n = new Map(prev); n.set(event.step, event); return n; });
          setStepOrder(prev => prev.includes(event.step) ? prev : [...prev, event.step]);
          if (event.workspace) {
            dispatch({ type: 'SET_WORKSPACE', payload: event.workspace });
          }
        }
      } catch (err: any) {
        setError(err.message || 'Generation failed unexpectedly');
      }
    };

    startGen();
  }, [state.meta.status]);

  const isComplete = state.meta.status === 'complete';
  const hasErrors = Array.from(events.values()).some((e: OrchestratorEvent) => e.status === 'error');

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Generating Agent</h2>
          <p className="text-muted-foreground">
            {isComplete
              ? hasErrors ? 'Completed with errors — review below' : 'All files generated successfully'
              : 'Synthesizing files...'}
          </p>
        </div>
        {isComplete && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/editor')}>Edit Files</Button>
            <Button onClick={() => navigate('/export')}>
              Download ZIP <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive rounded-lg text-destructive text-sm">{error}</div>
      )}

      {stepOrder.some(isSubStep) && (
        <div className="mb-4">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowSubSteps(v => !v)}
          >
            {showSubSteps ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {showSubSteps ? 'Hide' : 'Show'} individual skill/tool steps
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {stepOrder
          .filter(step => showSubSteps || !isSubStep(step))
          .map(step => {
            const event = events.get(step);
            if (!event) return null;
            const sub = isSubStep(step);
            return (
              <Card key={step} className={[event.status === 'error' ? 'border-destructive' : '', sub ? 'ml-6 shadow-none border-dashed' : ''].join(' ')}>
                <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className={`text-sm font-mono ${sub ? 'text-muted-foreground font-normal' : ''}`}>
                    {stepLabel(step)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(event.status === 'start' || event.status === 'progress')
                      ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      : event.status === 'done'
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-destructive" />}
                    <Badge variant={event.status === 'error' ? 'destructive' : 'outline'} className="text-xs">
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                {event.status === 'error' && event.content && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded">{event.content}</p>
                  </CardContent>
                )}
                {event.status === 'progress' && event.content && (
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted p-2 rounded">
                      {event.content.slice(-200)}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>

      {isComplete && state.validationResult && (
        <div className="mt-6 p-4 border rounded-lg space-y-2">
          <p className="text-sm font-medium">
            Validation:{' '}
            {state.validationResult.valid
              ? <span className="text-green-600">✓ Passed</span>
              : <span className="text-destructive">✗ {state.validationResult.errors.length} error(s)</span>}
            {state.validationResult.warnings.length > 0 && (
              <span className="text-amber-600 ml-2">{state.validationResult.warnings.length} warning(s)</span>
            )}
          </p>
          {state.validationResult.errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive font-mono">{e.file}: {e.message}</p>
          ))}
          {state.validationResult.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 font-mono">{w.file}: {w.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
