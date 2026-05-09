import React, { useState, useEffect } from 'react';
import { useSettings, TaskConfig, AppConfig, TaskConfigParameters } from '../context/SettingsContext';
import { providers } from '../../lib/providers';
import { fetchChatModels, ModelOption, CURATED_MODELS } from '../../lib/gitagent/fetchChatModels';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  Settings2, 
  Cpu, 
  BookOpen, 
  Hash, 
  MessageSquare, 
  Database, 
  FileText, 
  Loader2, 
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProviderIcon } from '@lobehub/icons';

const TASKS = [
  { id: 'scripts', name: 'Scripts/Tools Generation', icon: Cpu },
  { id: 'knowledge', name: 'Knowledge Generation', icon: BookOpen },
  { id: 'embeddings', name: 'Embeddings', icon: Hash },
  { id: 'chatTests', name: 'Chat Tests', icon: MessageSquare },
  { id: 'memorySeeding', name: 'Memory Seeding', icon: Database },
  { id: 'documentation', name: 'Documentation', icon: FileText },
  { id: 'architect', name: 'Agent Architect AI', icon: Sparkles },
] as const;

function getModelCapabilities(modelId: string, providerId: string) {
  const isReasoning = modelId.includes('o1') || modelId.includes('o3') || modelId.includes('reasoner') || modelId.includes('r1');
  const supportsTopK = providerId === 'google' || providerId === 'anthropic' || providerId === 'groq';
  const hasSchema = !modelId.includes('llama-2') && !modelId.includes('mistral-7b'); // most modern models do

  return {
    reasoning: isReasoning,
    topK: supportsTopK,
    schema: hasSchema,
  };
}

export function TaskModelSettings() {
  const { settings, updateTaskModel } = useSettings();
  const [models, setModels] = useState<Record<string, ModelOption[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadModels = async (providerId: string) => {
      if (models[providerId]) return;
      setLoading(prev => ({ ...prev, [providerId]: true }));
      try {
        const apiKey = settings.apiKeys[providerId];
        const fetched = await fetchChatModels(providerId, apiKey);
        setModels(prev => ({ ...prev, [providerId]: fetched }));
      } catch (e) {
        console.error(`Failed to fetch models for ${providerId}`, e);
        setModels(prev => ({ ...prev, [providerId]: CURATED_MODELS[providerId] || [] }));
      } finally {
        setLoading(prev => ({ ...prev, [providerId]: false }));
      }
    };

    const activeProviders = new Set(Object.values(settings.taskModels).map(t => t.providerId));
    activeProviders.forEach(p => loadModels(p));
  }, [settings.taskModels, settings.apiKeys]);

  const handleParamChange = (taskId: string, key: keyof TaskConfigParameters, value: any) => {
    const currentParams = (settings.taskModels[taskId as keyof AppConfig['taskModels']].parameters || {}) as TaskConfigParameters;
    updateTaskModel(taskId as any, {
      parameters: {
        ...currentParams,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6 border-t pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Task-Specific Models</h2>
          </div>
          <p className="text-sm text-muted-foreground">Override models and parameters for specific generation tasks.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {TASKS.map(task => {
          const config = settings.taskModels[task.id as keyof AppConfig['taskModels']];
          const Icon = task.icon;
          const providerModels = models[config.providerId] || CURATED_MODELS[config.providerId] || [];
          const params = (config.parameters || {}) as TaskConfigParameters;
          const capabilities = getModelCapabilities(config.modelId, config.providerId);

          return (
            <Card key={task.id} className="bg-muted/30 border-none shadow-none ring-1 ring-border/50">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {task.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-5">
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Provider</Label>
                    <Tabs 
                      value={config.providerId} 
                      onValueChange={v => updateTaskModel(task.id as any, { providerId: v })}
                      className="w-full"
                    >
                      <TabsList className="grid grid-cols-4 md:grid-cols-7 h-9 w-full bg-background/50 p-1">
                        {Object.values(providers).map(p => {
                          return (
                            <TabsTrigger 
                              key={p.id} 
                              value={p.id}
                              className="px-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center w-full h-full">
                                      <ProviderIcon provider={p.id} size={20} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{p.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Model</Label>
                    <Select 
                      value={config.modelId} 
                      onValueChange={v => updateTaskModel(task.id as any, { modelId: v })}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background/50 border-none">
                        {loading[config.providerId] ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                        <SelectValue placeholder="Select a model..." />
                      </SelectTrigger>
                      <SelectContent>
                        {providerModels.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Temperature</Label>
                        <span className="text-[10px] font-mono text-muted-foreground">{params.temperature ?? 0.7}</span>
                      </div>
                      <Slider
                        value={[params.temperature ?? 0.7]}
                        min={0}
                        max={2}
                        step={0.1}
                        onValueChange={([v]) => handleParamChange(task.id, 'temperature', v)}
                        className="py-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Max Tokens</Label>
                      <Input 
                        type="number"
                        value={params.maxTokens ?? ''}
                        placeholder="Default"
                        className="h-7 text-xs bg-background/50 border-none"
                        onChange={(e) => handleParamChange(task.id, 'maxTokens', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Top P</Label>
                        <span className="text-[10px] font-mono text-muted-foreground">{params.topP ?? 1}</span>
                      </div>
                      <Slider
                        value={[params.topP ?? 1]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={([v]) => handleParamChange(task.id, 'topP', v)}
                        className="py-1"
                      />
                    </div>
                    
                    <div className={cn("space-y-2", !capabilities.topK && "opacity-40 grayscale pointer-events-none")}>
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] uppercase font-semibold text-muted-foreground">Top K</Label>
                        {!capabilities.topK && <Info className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <Input 
                        type="number"
                        value={params.topK ?? ''}
                        disabled={!capabilities.topK}
                        placeholder={capabilities.topK ? "Default" : "N/A"}
                        className="h-7 text-xs bg-background/50 border-none"
                        onChange={(e) => handleParamChange(task.id, 'topK', e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className={cn("space-y-2", !capabilities.reasoning && "opacity-40 grayscale pointer-events-none text-muted-foreground/50")}>
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] uppercase font-semibold">Reasoning Effort</Label>
                      {!capabilities.reasoning && <Info className="h-3 w-3" />}
                    </div>
                    <Select 
                      value={params.reasoningEffort || 'medium'} 
                      disabled={!capabilities.reasoning}
                      onValueChange={v => handleParamChange(task.id, 'reasoningEffort', v)}
                    >
                      <SelectTrigger className="h-7 text-[10px] bg-background/50 border-none">
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
                      <Label className="text-[10px] uppercase font-semibold">Structured Output</Label>
                      {!capabilities.schema && <Info className="h-3 w-3" />}
                    </div>
                    <div className="h-7 flex items-center px-2 text-[10px] italic text-muted-foreground">
                      {capabilities.schema ? "Supported" : "Not supported"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
