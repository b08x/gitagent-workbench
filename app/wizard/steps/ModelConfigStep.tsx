import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function ModelConfigStep() {
  const { state, dispatch } = useAgentWorkspace();

  if (state.selectedTemplate === 'minimal') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Model configuration is not available for the Minimal template.</p>
      </div>
    );
  }

  const updateModel = (updates: Partial<typeof state.modelConfig>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        modelConfig: {
          ...state.modelConfig,
          ...updates,
        }
      }
    });
  };

  const updateConstraints = (updates: Partial<typeof state.modelConfig.constraints>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        modelConfig: {
          ...state.modelConfig,
          constraints: {
            ...state.modelConfig.constraints,
            ...updates,
          }
        }
      }
    });
  };

  const updateRuntime = (updates: Partial<typeof state.runtimeConfig>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        runtimeConfig: {
          ...state.runtimeConfig,
          ...updates,
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Model & Runtime</h2>
        <p className="text-muted-foreground">Configure the brain and execution limits of your agent.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Selection</CardTitle>
            <CardDescription>Choose the primary and backup models.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="preferred-model">Preferred Model</Label>
              <Input 
                id="preferred-model" 
                placeholder="claude-sonnet-4-5-20250929" 
                value={state.modelConfig.preferred}
                onChange={e => updateModel({ preferred: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fallback-model">Fallback Model (Optional)</Label>
              <Input 
                id="fallback-model" 
                placeholder="gpt-4o, gemini-1.5-pro" 
                value={state.modelConfig.fallback.join(', ')}
                onChange={e => updateModel({ fallback: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
              <p className="text-[10px] text-muted-foreground">Comma-separated list of fallback models.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Constraints</CardTitle>
            <CardDescription>Fine-tune the model's generation behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label htmlFor="temperature">Temperature: {state.modelConfig.constraints.temperature.toFixed(1)}</Label>
              </div>
              <input 
                id="temperature"
                type="range" 
                min="0" 
                max="2" 
                step="0.1" 
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                value={state.modelConfig.constraints.temperature}
                onChange={e => updateConstraints({ temperature: parseFloat(e.target.value) })}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Deterministic (0)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input 
                id="max-tokens" 
                type="number"
                min="1"
                value={state.modelConfig.constraints.max_tokens}
                onChange={e => updateConstraints({ max_tokens: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Runtime Settings</CardTitle>
            <CardDescription>Set execution limits for the agent's reasoning loop.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="max-turns">Max Turns</Label>
              <Input 
                id="max-turns" 
                type="number"
                min="1"
                value={state.runtimeConfig.max_turns}
                onChange={e => updateRuntime({ max_turns: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout">Timeout (seconds)</Label>
              <Input 
                id="timeout" 
                type="number"
                min="1"
                value={state.runtimeConfig.timeout}
                onChange={e => updateRuntime({ timeout: parseInt(e.target.value) || 0 })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
