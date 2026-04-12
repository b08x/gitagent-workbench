import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { providers } from '../../../lib/providers';
import { fetchChatModels, ModelOption, CURATED_MODELS } from '../../../lib/gitagent/fetchChatModels';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, Settings2, Loader2, CheckCircle2 } from 'lucide-react';

export function ModelStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { settings, updateSettings, setApiKey } = useSettings();
  const { state, dispatch } = useAgentWorkspace();
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      try {
        const apiKey = settings.apiKeys[settings.providerId];
        const fetched = await fetchChatModels(settings.providerId, apiKey);
        setModels(fetched);
      } catch (e) {
        console.error('Failed to fetch models', e);
        setModels(CURATED_MODELS[settings.providerId] || []);
      } finally {
        setLoading(false);
      }
    };
    loadModels();
  }, [settings.providerId, settings.apiKeys[settings.providerId]]);

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

  const agentName = state.manifest.name || '';
  const isClaudeCode = agentName === 'claude-code';
  const isGeminiCli = agentName === 'gemini-cli';

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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="flex items-center justify-between">
              API Key
              {settings.apiKeys[settings.providerId] && (
                <span className="text-[10px] text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Key Set
                </span>
              )}
            </Label>
            <Input 
              type="password" 
              placeholder={settings.providerId === 'ollama' ? 'Not required for local Ollama' : 'sk-...'} 
              value={settings.apiKeys[settings.providerId] || ''}
              onChange={e => setApiKey(settings.providerId, e.target.value)}
              disabled={settings.providerId === 'ollama'}
            />
            <p className="text-xs text-muted-foreground">Stored in sessionStorage only. Never persisted.</p>
          </div>

          {!providers[settings.providerId].supportsDirectBrowser && (
            <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-500">
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
                {models.map(m => (
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
