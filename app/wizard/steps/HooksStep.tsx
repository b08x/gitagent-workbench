import React from 'react';
import { useAgentWorkspace, HookEntry } from '../../context/AgentContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Terminal } from 'lucide-react';

export function HooksStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const hooks = state.hooks || [];

  if (state.selectedTemplate !== 'full') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Hooks configuration is only available for the Full template.</p>
      </div>
    );
  }

  const updateHooks = (newHooks: HookEntry[]) => {
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { hooks: newHooks }
    });
  };

  const addHook = () => {
    updateHooks([
      ...hooks,
      { event: 'on_session_end', script: 'scripts/on-end.sh', fail_open: true }
    ]);
  };

  const removeHook = (index: number) => {
    // Cannot delete the first two default hooks
    if (index < 2) return;
    updateHooks(hooks.filter((_, i) => i !== index));
  };

  const updateHook = (index: number, updates: Partial<HookEntry>) => {
    updateHooks(hooks.map((h, i) => i === index ? { ...h, ...updates } : h));
  };

  const handleScriptBlur = (index: number, value: string) => {
    let script = value.trim();
    // Strip leading slash
    if (script.startsWith('/')) {
      script = script.substring(1);
    }
    // Ensure starts with scripts/
    if (!script.startsWith('scripts/')) {
      script = 'scripts/' + script;
    }
    updateHook(index, { script });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lifecycle Hooks</h2>
        <p className="text-muted-foreground">Configure scripts to run during agent lifecycle events.</p>
      </div>

      <div className="space-y-4">
        {hooks.map((hook, index) => (
          <Card key={index} className={index < 2 ? 'border-primary/20 bg-primary/5' : ''}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3 space-y-2">
                  <Label>Event</Label>
                  {index < 2 ? (
                    <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm font-medium">
                      {hook.event}
                    </div>
                  ) : (
                    <Select 
                      value={hook.event} 
                      onValueChange={(v: any) => updateHook(index, { event: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_session_start">on_session_start</SelectItem>
                        <SelectItem value="on_error">on_error</SelectItem>
                        <SelectItem value="on_session_end">on_session_end</SelectItem>
                        <SelectItem value="on_tool_call">on_tool_call</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="md:col-span-5 space-y-2">
                  <Label>Script Path</Label>
                  <div className="relative">
                    <Terminal className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-9"
                      value={hook.script}
                      onChange={(e) => updateHook(index, { script: e.target.value })}
                      onBlur={(e) => handleScriptBlur(index, e.target.value)}
                      placeholder="scripts/my-hook.sh"
                    />
                  </div>
                </div>

                <div className="md:col-span-3 flex items-center justify-between h-10 px-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Fail Open</Label>
                    <p className="text-[10px] text-muted-foreground">Continue on error</p>
                  </div>
                  <Switch 
                    checked={hook.fail_open}
                    onCheckedChange={(v) => updateHook(index, { fail_open: v })}
                  />
                </div>

                <div className="md:col-span-1 flex justify-end">
                  {index >= 2 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeHook(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addHook} className="w-full border-dashed">
          <Plus className="mr-2 h-4 w-4" /> Add Hook
        </Button>
      </div>
    </div>
  );
}
