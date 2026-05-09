import React, { useState, useEffect } from 'react';
import { useSettings, TaskConfigParameters } from '../../context/SettingsContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { providers } from '../../../lib/providers';
import { fetchChatModels, ModelOption, CURATED_MODELS } from '../../../lib/gitagent/fetchChatModels';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProviderIcon } from '@lobehub/icons';
import { InfoIcon, Settings2, Loader2, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

function getModelCapabilities(modelId: string, providerId: string) {
  const isReasoning = modelId?.includes('o1') || modelId?.includes('o3') || modelId?.includes('reasoner') || modelId?.includes('r1');
  const supportsTopK = providerId === 'google' || providerId === 'anthropic' || providerId === 'groq';
  const hasSchema = !modelId?.includes('llama-2') && !modelId?.includes('mistral-7b');

  return {
    reasoning: isReasoning,
    topK: supportsTopK,
    schema: hasSchema,
  };
}

export function ModelStep({ fieldErrors = {}, hideGeneration = false, hideRuntime = false }: { fieldErrors?: Record<string, string>; hideGeneration?: boolean; hideRuntime?: boolean }) {
  const { settings, updateSettings, setApiKey } = useSettings();
  const { state, dispatch } = useAgentWorkspace();
  const [genModels, setGenModels] = useState<ModelOption[]>([]);
  const [runtimeModels, setRuntimeModels] = useState<ModelOption[]>([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingRuntime, setLoadingRuntime] = useState(false);

  useEffect(() => {
    if (hideGeneration) return;
    const loadGenModels = async () => {
      setLoadingGen(true);
      try {
        const apiKey = settings.apiKeys[settings.providerId];
        const fetched = await fetchChatModels(settings.providerId, apiKey);
        setGenModels(fetched);
      } catch (e) {
        setGenModels(CURATED_MODELS[settings.providerId] || []);
      } finally {
        setLoadingGen(false);
      }
    };
    loadGenModels();
  }, [settings.providerId, settings.apiKeys[settings.providerId], hideGeneration]);

  useEffect(() => {
    if (hideRuntime) return;
    const loadRuntimeModels = async () => {
      setLoadingRuntime(true);
      try {
        const apiKey = settings.apiKeys[state.runtimeProviderId];
        const fetched = await fetchChatModels(state.runtimeProviderId, apiKey);
        setRuntimeModels(fetched);
      } catch (e) {
        setRuntimeModels(CURATED_MODELS[state.runtimeProviderId] || []);
      } finally {
        setLoadingRuntime(false);
      }
    };
    loadRuntimeModels();
  }, [state.runtimeProviderId, settings.apiKeys[state.runtimeProviderId], hideRuntime]);

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

  const handleGenParamChange = (key: keyof TaskConfigParameters, value: any) => {
    const currentParams = settings.parameters || {};
    updateSettingsAndWorkspace({
      parameters: {
        ...currentParams,
        [key]: value
      }
    });
  };

  const updateRuntimeProvider = (providerId: string) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { runtimeProviderId: providerId }
    });
  };

  const agentName = state.manifest.name || '';
  const isClaudeCode = agentName === 'claude-code';
  const isGeminiCli = agentName === 'gemini-cli';

  return (
    <div className="space-y-8">
      {!hideGeneration && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Generation Model</h2>
            <p className="text-muted-foreground">Choose which LLM will generate your agent.</p>
          </div>

          <div className="grid gap-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Provider</Label>
                <Tabs 
                  value={settings.providerId} 
                  onValueChange={v => updateSettingsAndWorkspace({ providerId: v })}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-4 md:grid-cols-7 h-11 w-full bg-background/50 p-1">
                    {Object.values(providers).map(p => (
                      <TabsTrigger 
                        key={p.id} 
                        value={p.id}
                        className="px-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-9"
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center w-full h-full">
                                <ProviderIcon provider={p.id} size={24} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{p.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Model</Label>
                <Select 
                  value={settings.modelId} 
                  onValueChange={v => updateSettingsAndWorkspace({ modelId: v })}
                >
                  <SelectTrigger className="h-11 bg-background/50 border-none ring-1 ring-border/50">
                    {loadingGen ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {genModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {settings.modelId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Temperature</Label>
                        <span className="text-[10px] font-mono font-bold text-primary">{(settings.parameters?.temperature ?? 0.7).toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[settings.parameters?.temperature ?? 0.7]}
                        min={0}
                        max={2}
                        step={0.1}
                        onValueChange={([v]) => handleGenParamChange('temperature', v)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Max Tokens</Label>
                      <Input 
                        type="number"
                        value={settings.parameters?.maxTokens ?? ''}
                        placeholder="Default (Model Limit)"
                        className="h-9 text-xs bg-background border-none ring-1 ring-border/50"
                        onChange={(e) => handleGenParamChange('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Top P</Label>
                        <span className="text-[10px] font-mono font-bold text-primary">{(settings.parameters?.topP ?? 1).toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[settings.parameters?.topP ?? 1]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={([v]) => handleGenParamChange('topP', v)}
                      />
                    </div>
                    
                    {(() => {
                      const capabilities = getModelCapabilities(settings.modelId, settings.providerId);
                      return (
                        <div className={cn("space-y-2", !capabilities.topK && "opacity-40 grayscale pointer-events-none")}>
                          <div className="flex items-center gap-1">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Top K</Label>
                            {!capabilities.topK && <Info className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <Input 
                            type="number"
                            value={settings.parameters?.topK ?? ''}
                            disabled={!capabilities.topK}
                            placeholder={capabilities.topK ? "Default (40)" : "N/A"}
                            className="h-9 text-xs bg-background border-none ring-1 ring-border/50"
                            onChange={(e) => handleGenParamChange('topK', e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                    {(() => {
                      const capabilities = getModelCapabilities(settings.modelId, settings.providerId);
                      return (
                        <>
                          <div className={cn("space-y-2", !capabilities.reasoning && "opacity-40 grayscale pointer-events-none text-muted-foreground/50")}>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] uppercase font-bold">Reasoning Effort</Label>
                              {!capabilities.reasoning && <Info className="h-3 w-3" />}
                            </div>
                            <Select 
                              value={settings.parameters?.reasoningEffort || 'medium'} 
                              disabled={!capabilities.reasoning}
                              onValueChange={v => handleGenParamChange('reasoningEffort', v)}
                            >
                              <SelectTrigger className="h-8 text-[10px] bg-background border-none ring-1 ring-border/50 font-medium">
                                <SelectValue placeholder="Effort" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className={cn("space-y-2", !capabilities.schema && "opacity-40 grayscale pointer-events-none text-muted-foreground/50")}>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] uppercase font-bold">Structured Output</Label>
                              {!capabilities.schema && <Info className="h-3 w-3" />}
                            </div>
                            <div className="h-8 flex items-center px-3 text-[10px] font-bold text-primary bg-background rounded-md ring-1 ring-border/50">
                              {capabilities.schema ? "Enabled" : "Not supported"}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fallback-models">Fallback Models (Optional)</Label>
              <Input 
                id="fallback-models"
                placeholder="anthropic/claude-3-haiku, openai/gpt-4o-mini"
                value={(state.generationConfig.fallbackModelIds || []).join(', ')}
                onChange={e => {
                  const fallbacks = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  dispatch({
                    type: 'UPDATE_WORKSPACE',
                    payload: {
                      generationConfig: {
                        ...state.generationConfig,
                        fallbackModelIds: fallbacks
                      }
                    }
                  });
                }}
              />
              <p className="text-[10px] text-muted-foreground">Comma-separated list of fallback models (e.g., provider/model-id).</p>
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center justify-between">
                API Key
                <div className="flex items-center gap-2">
                  {settings.envProviders?.includes(settings.providerId) && (
                    <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/20 px-1 py-0 h-4">
                      PERSISTENT (ENV)
                    </Badge>
                  )}
                  {settings.apiKeys[settings.providerId] && (
                    <span className="text-[10px] text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Key Set
                    </span>
                  )}
                </div>
              </Label>
              <Input 
                type="password" 
                placeholder={
                  settings.providerId === 'ollama' 
                    ? 'Not required for local Ollama' 
                    : settings.envProviders?.includes(settings.providerId)
                      ? 'Key provided via environment'
                      : 'sk-...'
                } 
                value={settings.apiKeys[settings.providerId] === '********' ? '' : (settings.apiKeys[settings.providerId] || '')}
                onChange={e => setApiKey(settings.providerId, e.target.value)}
                disabled={settings.providerId === 'ollama'}
              />
              <p className="text-xs text-muted-foreground">
                {settings.envProviders?.includes(settings.providerId)
                  ? 'Key is securely loaded from environment variables/secrets.'
                  : 'Sensitive keys are proxied through a secure local backend (session-only).'}
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
              <InfoIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>Pro Tip:</strong> Add your keys to the <span className="font-bold">Secrets</span> menu in AI Studio (or <span className="font-mono">.env</span> locally) to persist them across sessions.
              </p>
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
      )}

      {!hideGeneration && <div className="border-t pt-8" />}

      {!hideRuntime && (
        <section className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Model & Runtime</h2>
            </div>
            <p className="text-muted-foreground">Configure the model your agent will use at runtime.</p>
          </div>

          <div className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Provider</Label>
                <Select 
                  value={state.runtimeProviderId} 
                  onValueChange={updateRuntimeProvider}
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
                <Label>Preferred Model</Label>
                <Select 
                  value={state.manifest.model?.preferred || ''} 
                  onValueChange={v => updateModel('preferred', v)}
                >
                  <SelectTrigger>
                    {loadingRuntime ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runtimeModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(isClaudeCode || isGeminiCli) && (
              <p className="text-xs text-amber-600 font-medium">
                Restricted to {isClaudeCode ? 'Anthropic' : 'Gemini'} models for {agentName}.
              </p>
            )}

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

            <div className="border-t pt-6" />

            <div>
              <h3 className="text-sm font-semibold mb-3">Runtime Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="max_turns">Max Turns</Label>
                  <Input 
                    id="max_turns"
                    type="number"
                    placeholder="30"
                    value={state.manifest.runtime?.max_turns ?? state.runtimeConfig?.max_turns ?? ''}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      dispatch({
                        type: 'UPDATE_MANIFEST',
                        payload: {
                          runtime: {
                            ...(state.manifest.runtime || {}),
                            max_turns: val,
                          },
                        },
                      });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input 
                    id="timeout"
                    type="number"
                    placeholder="120"
                    value={state.manifest.runtime?.timeout ?? state.runtimeConfig?.timeout ?? ''}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      dispatch({
                        type: 'UPDATE_MANIFEST',
                        payload: {
                          runtime: {
                            ...(state.manifest.runtime || {}),
                            timeout: val,
                          },
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
