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
import { InfoIcon, Settings2, Loader2, CheckCircle2, Info, Sliders } from 'lucide-react';
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
    <div className="flex flex-col gap-6 w-full overflow-y-auto">
      {!hideGeneration && (
        <section className="flex flex-col gap-5 w-full">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Generation Model</h2>
            <p className="text-xs text-muted-foreground">Choose which LLM endpoint will generate your agent code and artifacts.</p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-2 w-full">
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
                              <ProviderIcon provider={p.id} size={22} />
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

            <div className="flex flex-col gap-2 w-full">
              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Model</Label>
              <Select 
                value={settings.modelId} 
                onValueChange={v => updateSettingsAndWorkspace({ modelId: v })}
              >
                <SelectTrigger className="h-10 bg-background/50 border border-border/80 w-full text-xs font-mono">
                  {loadingGen ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  {genModels.map(m => (
                    <SelectItem key={m.id} value={m.id} className="text-xs font-mono">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {settings.modelId && (
              <div className="flex flex-col gap-4 w-full bg-muted/20 p-4 rounded-sm border border-border/70">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <Sliders className="size-3.5 text-primary" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">Inference Parameters</span>
                </div>

                {/* Stacked vertical parameter controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                  {/* Temperature */}
                  <div className="flex flex-col gap-2 w-full min-w-0 bg-card/60 p-3 rounded-sm border border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Temperature</Label>
                      <span className="text-xs font-mono font-bold text-primary">{(settings.parameters?.temperature ?? 0.7).toFixed(1)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Controls randomness: 0.0 is deterministic, 1.0 is creative.</p>
                    <Slider
                      value={[settings.parameters?.temperature ?? 0.7]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={([v]) => handleGenParamChange('temperature', v)}
                      className="py-1"
                    />
                  </div>

                  {/* Top P */}
                  <div className="flex flex-col gap-2 w-full min-w-0 bg-card/60 p-3 rounded-sm border border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Top P (Nucleus Sampling)</Label>
                      <span className="text-xs font-mono font-bold text-primary">{(settings.parameters?.topP ?? 1).toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Probability mass cutoff for token consideration.</p>
                    <Slider
                      value={[settings.parameters?.topP ?? 1]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={([v]) => handleGenParamChange('topP', v)}
                      className="py-1"
                    />
                  </div>

                  {/* Max Tokens */}
                  <div className="flex flex-col gap-2 w-full min-w-0 bg-card/60 p-3 rounded-sm border border-border/50">
                    <Label className="text-xs font-bold text-foreground">Max Output Tokens</Label>
                    <p className="text-[10px] text-muted-foreground">Upper limit on generation length per request.</p>
                    <Input 
                      type="number"
                      value={settings.parameters?.maxTokens ?? ''}
                      placeholder="Default (Model Limit)"
                      className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                      onChange={(e) => handleGenParamChange('maxTokens', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>

                  {/* Top K */}
                  {(() => {
                    const capabilities = getModelCapabilities(settings.modelId, settings.providerId);
                    return (
                      <div className={cn("flex flex-col gap-2 w-full min-w-0 bg-card/60 p-3 rounded-sm border border-border/50", !capabilities.topK && "opacity-40 grayscale pointer-events-none")}>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs font-bold text-foreground">Top K</Label>
                          {!capabilities.topK && <Info className="size-3 text-muted-foreground" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Limits sample pool to top K candidate tokens.</p>
                        <Input 
                          type="number"
                          value={settings.parameters?.topK ?? ''}
                          disabled={!capabilities.topK}
                          placeholder={capabilities.topK ? "Default (40)" : "Not supported"}
                          className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                          onChange={(e) => handleGenParamChange('topK', e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Advanced Capabilities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50 w-full">
                  {(() => {
                    const capabilities = getModelCapabilities(settings.modelId, settings.providerId);
                    return (
                      <>
                        <div className={cn("flex flex-col gap-1.5 w-full", !capabilities.reasoning && "opacity-40 grayscale pointer-events-none")}>
                          <div className="flex items-center gap-1">
                            <Label className="text-[11px] font-semibold text-foreground">Reasoning Effort</Label>
                            {!capabilities.reasoning && <Info className="size-3" />}
                          </div>
                          <Select 
                            value={settings.parameters?.reasoningEffort || 'medium'} 
                            disabled={!capabilities.reasoning}
                            onValueChange={v => handleGenParamChange('reasoningEffort', v)}
                          >
                            <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/80 w-full">
                              <SelectValue placeholder="Effort" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low Effort</SelectItem>
                              <SelectItem value="medium">Medium Effort</SelectItem>
                              <SelectItem value="high">High Effort</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className={cn("flex flex-col gap-1.5 w-full", !capabilities.schema && "opacity-40 grayscale pointer-events-none")}>
                          <div className="flex items-center gap-1">
                            <Label className="text-[11px] font-semibold text-foreground">Structured Output</Label>
                            {!capabilities.schema && <Info className="size-3" />}
                          </div>
                          <div className="h-8 flex items-center px-3 text-xs font-mono font-bold text-primary bg-background rounded-sm border border-border/80">
                            {capabilities.schema ? "✓ JSON Schema Enabled" : "Not supported"}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="fallback-models" className="text-xs font-bold">Fallback Models (Optional)</Label>
              <Input 
                id="fallback-models"
                placeholder="anthropic/claude-3-haiku, openai/gpt-4o-mini"
                value={(state.generationConfig.fallbackModelIds || []).join(', ')}
                className="h-8 text-xs font-mono bg-background border-border/80 w-full"
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
              <p className="text-[10px] text-muted-foreground">Comma-separated list of fallback models.</p>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Label className="flex items-center justify-between text-xs font-bold">
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
                className="h-8 text-xs font-mono bg-background border-border/80 w-full"
              />
            </div>
          </div>
        </section>
      )}

      {!hideGeneration && <div className="border-t border-border/80" />}

      {!hideRuntime && (
        <section className="flex flex-col gap-5 w-full">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="size-4.5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">Runtime LLM Parameters</h2>
            </div>
            <p className="text-xs text-muted-foreground">Configure model defaults, sampling parameters, and execution limits stored in <span className="font-mono">agent.yaml</span>.</p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {/* Provider and Preferred Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="flex flex-col gap-1.5 w-full">
                <Label className="text-xs font-semibold">Runtime Provider</Label>
                <Select 
                  value={state.runtimeProviderId} 
                  onValueChange={updateRuntimeProvider}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/80 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(providers).map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs font-mono">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <Label className="text-xs font-semibold">Preferred Model</Label>
                <Select 
                  value={state.manifest.model?.preferred || ''} 
                  onValueChange={v => updateModel('preferred', v)}
                >
                  <SelectTrigger className="h-8 text-xs font-mono bg-background border-border/80 w-full">
                    {loadingRuntime ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {runtimeModels.map(m => (
                      <SelectItem key={m.id} value={m.id} className="text-xs font-mono">{m.name}</SelectItem>
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

            {/* Vertical Stack of Runtime Constraints */}
            <div className="flex flex-col gap-3 w-full bg-muted/20 p-4 rounded-sm border border-border/70">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                Sampling Constraints
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="temperature" className="text-xs font-semibold">Temperature</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">0.0 - 2.0</span>
                  </div>
                  <Input 
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    placeholder="0.7"
                    value={state.manifest.model?.constraints?.temperature ?? ''}
                    onChange={e => updateConstraints('temperature', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max_tokens" className="text-xs font-semibold">Max Output Tokens</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">e.g. 4096</span>
                  </div>
                  <Input 
                    id="max_tokens"
                    type="number"
                    placeholder="4096"
                    value={state.manifest.model?.constraints?.max_tokens ?? ''}
                    onChange={e => updateConstraints('max_tokens', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="top_p" className="text-xs font-semibold">Top P</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">0.0 - 1.0</span>
                  </div>
                  <Input 
                    id="top_p"
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    placeholder="1.0"
                    value={state.manifest.model?.constraints?.top_p ?? ''}
                    onChange={e => updateConstraints('top_p', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="top_k" className="text-xs font-semibold">Top K</Label>
                    <span className="text-[10px] font-mono text-muted-foreground">e.g. 40</span>
                  </div>
                  <Input 
                    id="top_k"
                    type="number"
                    placeholder="40"
                    value={state.manifest.model?.constraints?.top_k ?? ''}
                    onChange={e => updateConstraints('top_k', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Runtime Execution Settings */}
            <div className="flex flex-col gap-3 w-full bg-muted/20 p-4 rounded-sm border border-border/70">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                Execution Limits
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <Label htmlFor="max_turns" className="text-xs font-semibold">Max Agent Turns</Label>
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
                    className="h-8 text-xs font-mono bg-background border-border/80 w-full"
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-full min-w-0">
                  <Label htmlFor="timeout" className="text-xs font-semibold">Execution Timeout (Seconds)</Label>
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
                    className="h-8 text-xs font-mono bg-background border-border/80 w-full"
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
