import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { runGeneration, OrchestratorEvent } from '../../lib/generation/orchestrator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export function GenerationDashboard() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Record<string, OrchestratorEvent>>({});

  useEffect(() => {
    if (state.meta.status !== 'generating') return;

    const startGen = async () => {
      const gen = runGeneration(state, {
        providerId: settings.providerId,
        apiKey: settings.apiKeys[settings.providerId]
      });

      for await (const event of gen) {
        setEvents(prev => ({ ...prev, [event.step]: event }));
        if (event.workspace) {
          dispatch({ type: 'SET_WORKSPACE', payload: event.workspace });
        }
      }
    };

    startGen();
  }, [state.meta.status]);

  const isComplete = state.meta.status === 'complete';

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Generating Agent</h2>
          <p className="text-muted-foreground">Synthesizing files and validating architecture...</p>
        </div>
        {isComplete && (
          <Button onClick={() => navigate('/editor')}>
            View Files <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {Object.entries(events).map(([step, event]) => {
          const e = event as OrchestratorEvent;
          return (
            <Card key={step} className={e.status === 'error' ? 'border-destructive' : ''}>
              <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-mono">{step}</CardTitle>
                <div className="flex items-center gap-2">
                  {e.status === 'start' || e.status === 'progress' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : e.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Badge variant={e.status === 'error' ? 'destructive' : 'outline'}>
                    {e.status}
                  </Badge>
                </div>
              </CardHeader>
              {e.content && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-muted p-2 rounded">
                    {e.content}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
