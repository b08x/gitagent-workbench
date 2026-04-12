import React, { useState, useEffect } from 'react';
import { useSettings, TaskConfig, AppConfig } from '../context/SettingsContext';
import { providers } from '../../lib/providers';
import { fetchChatModels, ModelOption, CURATED_MODELS } from '../../lib/gitagent/fetchChatModels';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2, Cpu, BookOpen, Hash, MessageSquare, Database, FileText, Loader2 } from 'lucide-react';

const TASKS = [
  { id: 'scripts', name: 'Scripts/Tools Generation', icon: Cpu },
  { id: 'knowledge', name: 'Knowledge Generation', icon: BookOpen },
  { id: 'embeddings', name: 'Embeddings', icon: Hash },
  { id: 'chatTests', name: 'Chat Tests', icon: MessageSquare },
  { id: 'memorySeeding', name: 'Memory Seeding', icon: Database },
  { id: 'documentation', name: 'Documentation', icon: FileText },
] as const;

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

  return (
    <div className="space-y-6 border-t pt-8">
      <div>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Task-Specific Models</h2>
        </div>
        <p className="text-sm text-muted-foreground">Override models for specific generation tasks.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TASKS.map(task => {
          const config = settings.taskModels[task.id as keyof AppConfig['taskModels']];
          const Icon = task.icon;
          const providerModels = models[config.providerId] || CURATED_MODELS[config.providerId] || [];

          return (
            <Card key={task.id} className="bg-muted/30 border-none shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {task.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Provider</Label>
                  <Select 
                    value={config.providerId} 
                    onValueChange={v => updateTaskModel(task.id as any, { providerId: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(providers).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Model</Label>
                  <Select 
                    value={config.modelId} 
                    onValueChange={v => updateTaskModel(task.id as any, { modelId: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      {loading[config.providerId] ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providerModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
