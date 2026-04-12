import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { providers } from '../../../lib/providers';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, Settings2 } from 'lucide-react';

const ANTHROPIC_MODELS = [
  { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' },
];

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];

const ALL_MODELS = [...ANTHROPIC_MODELS, ...GEMINI_MODELS];

export function ModelStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { settings, updateSettings, setApiKey } = useSettings();
  const { state, dispatch } = useAgentWorkspace();

  const agentName = state.manifest.name || '';
  const isClaudeCode = agentName === 'claude-code';
  const isGeminiCli = agentName === 'gemini-cli';

  const availableModels = isClaudeCode 
    ? ANTHROPIC_MODELS 
    : isGeminiCli 
    ? GEMINI_MODELS 
    : ALL_MODELS;

  const updateModel = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_MANIFEST',
      payload: {
        model: {
          ...(state.manifest.model || {}),
          [field]: value,
        },
      },
    });
  };

  const updateConstraints = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_MANIFEST',
      payload: {
        model: {
          ...(state.manifest.model || {}),
          constraints: {
            ...(state.manifest.model?.constraints || {}),
            [field]: value,
          },
        },
      },
    });
  };

  const updateSettingsAndWorkspace = (updates: any) => {
    updateSettings(updates);
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        generationConfig: {
          ...state.generationConfig,
          providerId: updates.providerId || settings.providerId,
          modelId: updates.modelId || settings.modelId,
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Generation Model</h2>
          <p className="text-muted-foreground">Choose which LLM will generate your agent.</p>
        </div>

        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select 
                value={settings.providerId} 
                onValueChange={v => updateSettingsAndWorkspace({ providerId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(providers).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Model</Label>
              <Select 
                value={settings.modelId} 
                onValueChange={v => updateSettingsAndWorkspace({ modelId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>API Key</Label>
            <Input 
              type="password" 
              placeholder="sk-..." 
              value={settings.apiKeys[settings.providerId] || ''}
              onChange={e => setApiKey(settings.providerId, e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Stored in sessionStorage only. Never persisted.</p>
          </div>

          {!providers[settings.providerId].supportsDirectBrowser && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                {settings.providerId} may require a CORS proxy for direct browser calls. OpenRouter is recommended for browser-native use.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </section>

      <div className="border-t pt-8" />

      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Agent Runtime Model</h2>
          </div>
          <p className="text-muted-foreground">Configure the model your agent will use at runtime.</p>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label>Preferred Model</Label>
            <Select 
              value={state.manifest.model?.preferred || ''} 
              onValueChange={v => updateModel('preferred', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(isClaudeCode || isGeminiCli) && (
              <p className="text-xs text-amber-600 font-medium">
                Restricted to {isClaudeCode ? 'Anthropic' : 'Gemini'} models for {agentName}.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input 
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                value={state.manifest.model?.constraints?.temperature ?? ''}
                onChange={e => updateConstraints('temperature', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input 
                id="max_tokens"
                type="number"
                placeholder="4096"
                value={state.manifest.model?.constraints?.max_tokens ?? ''}
                onChange={e => updateConstraints('max_tokens', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="top_p">Top P</Label>
              <Input 
                id="top_p"
                type="number"
                step="0.05"
                min="0"
                max="1"
                placeholder="1.0"
                value={state.manifest.model?.constraints?.top_p ?? ''}
                onChange={e => updateConstraints('top_p', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="top_k">Top K</Label>
              <Input 
                id="top_k"
                type="number"
                placeholder="40"
                value={state.manifest.model?.constraints?.top_k ?? ''}
                onChange={e => updateConstraints('top_k', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
