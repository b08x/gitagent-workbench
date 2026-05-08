import React, { useState } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Settings } from 'lucide-react';

export function ModelConfigStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const config = state.config?.default || {};

  const updateConfig = (newConfig: Record<string, any>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        config: {
          ...state.config,
          default: newConfig,
        }
      }
    });
  };

  const handleAdd = () => {
    if (!newKey.trim()) return;
    updateConfig({
      ...config,
      [newKey]: newValue,
    });
    setNewKey('');
    setNewValue('');
  };

  const handleRemove = (key: string) => {
    const { [key]: _, ...rest } = config;
    updateConfig(rest);
  };

  const handleUpdateValue = (key: string, value: string) => {
    updateConfig({
      ...config,
      [key]: value,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Configuration Parameters</h2>
        </div>
        <p className="text-muted-foreground">Define additional parameters and environment variables for your agent.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Parameters</CardTitle>
          <CardDescription>Variable names should be alphanumeric and use underscores or hyphens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex gap-4 items-end animate-in fade-in slide-in-from-left-1">
                <div className="grid gap-2 flex-1">
                  <Label className="text-[10px] text-muted-foreground">Key</Label>
                  <Input 
                    value={key} 
                    readOnly 
                    className="bg-muted text-xs font-mono"
                  />
                </div>
                <div className="grid gap-2 flex-[2]">
                  <Label className="text-[10px] text-muted-foreground">Value</Label>
                  <Input 
                    value={String(value)} 
                    onChange={e => handleUpdateValue(key, e.target.value)}
                    className="text-xs"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:text-destructive/80"
                  onClick={() => handleRemove(key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="p-4 rounded-lg border border-dashed bg-muted/30 flex gap-4 items-end">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="new-key" className="text-[10px]">New Key</Label>
                <Input 
                  id="new-key"
                  placeholder="e.g. API_ENDPOINT" 
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  className="text-xs font-mono"
                  onKeyPress={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="grid gap-2 flex-[2]">
                <Label htmlFor="new-value" className="text-[10px]">Value</Label>
                <Input 
                  id="new-value"
                  placeholder="e.g. https://api.example.com" 
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="text-xs"
                  onKeyPress={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleAdd}
                disabled={!newKey.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex gap-3">
        <div className="p-2 bg-amber-500/10 rounded-full h-fit">
          <Settings className="h-4 w-4 text-amber-600" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-900">Environment Variables</p>
          <p className="text-xs text-amber-700/80 leading-relaxed">
            These parameters will be injected into your agent's runtime environment. 
            You can access them in your prompts or scripts using the standard <code>${`{config.NAME}`}</code> syntax.
          </p>
        </div>
      </div>
    </div>
  );
}
