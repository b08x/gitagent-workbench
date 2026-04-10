import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Archive, Zap } from 'lucide-react';

export function MemoryStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const config = state.memoryConfig;

  if (state.selectedTemplate !== 'full') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Memory configuration is only available for the Full template.</p>
      </div>
    );
  }

  const updateMemory = (updates: Partial<typeof config>) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        memoryConfig: { ...config, ...updates }
      }
    });
  };

  const updateWorkingLayer = (updates: Partial<typeof config.layers.working>) => {
    updateMemory({
      layers: {
        ...config.layers,
        working: { ...config.layers.working, ...updates }
      }
    });
  };

  const updateArchiveLayer = (updates: Partial<typeof config.layers.archive>) => {
    updateMemory({
      layers: {
        ...config.layers,
        archive: { ...config.layers.archive, ...updates }
      }
    });
  };

  const toggleTrigger = (trigger: string) => {
    const triggers = config.updateTriggers.includes(trigger)
      ? config.updateTriggers.filter(t => t !== trigger)
      : [...config.updateTriggers, trigger];
    updateMemory({ updateTriggers: triggers });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agent Memory</h2>
        <p className="text-muted-foreground">Configure how the agent persists information across sessions.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Working Memory Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="working-path">Path</Label>
                <Input 
                  id="working-path" 
                  value={config.layers.working.path} 
                  onChange={e => updateWorkingLayer({ path: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max-lines">Max Lines</Label>
                <Input 
                  id="max-lines" 
                  type="number"
                  min="1"
                  value={config.layers.working.max_lines} 
                  onChange={e => updateWorkingLayer({ max_lines: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="format">Format</Label>
                <Select 
                  value={config.layers.working.format} 
                  onValueChange={(v: any) => updateWorkingLayer({ format: v })}
                >
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="plaintext">Plaintext</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="load">Load Policy</Label>
                <Select 
                  value={config.layers.working.load} 
                  onValueChange={(v: any) => updateWorkingLayer({ load: v })}
                >
                  <SelectTrigger id="load">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="on-demand">On Demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              Archive Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="archive-path">Path</Label>
                <Input 
                  id="archive-path" 
                  value={config.layers.archive.path} 
                  onChange={e => updateArchiveLayer({ path: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rotation">Rotation</Label>
                <Select 
                  value={config.layers.archive.rotation} 
                  onValueChange={(v: any) => updateArchiveLayer({ rotation: v })}
                >
                  <SelectTrigger id="rotation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Update Triggers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="trigger-end" 
                checked={config.updateTriggers.includes('on_session_end')}
                onCheckedChange={() => toggleTrigger('on_session_end')}
              />
              <Label htmlFor="trigger-end" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                on_session_end
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="trigger-save" 
                checked={config.updateTriggers.includes('on_explicit_save')}
                onCheckedChange={() => toggleTrigger('on_explicit_save')}
              />
              <Label htmlFor="trigger-save" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                on_explicit_save
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
