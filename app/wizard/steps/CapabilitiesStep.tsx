import React, { useState } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

export function CapabilitiesStep() {
  const { state, dispatch } = useAgentWorkspace();
  const [newSkill, setNewSkill] = useState('');
  const [newTool, setNewTool] = useState('');

  const addSkill = () => {
    if (!newSkill) return;
    const skills = [...(state.manifest.skills || []), newSkill];
    dispatch({ type: 'UPDATE_MANIFEST', payload: { skills } });
    setNewSkill('');
  };

  const removeSkill = (name: string) => {
    const skills = (state.manifest.skills || []).filter(s => s !== name);
    dispatch({ type: 'UPDATE_MANIFEST', payload: { skills } });
  };

  const addTool = () => {
    if (!newTool) return;
    const tools = [...(state.manifest.tools || []), newTool];
    dispatch({ type: 'UPDATE_MANIFEST', payload: { tools } });
    setNewTool('');
  };

  const removeTool = (name: string) => {
    const tools = (state.manifest.tools || []).filter(t => t !== name);
    dispatch({ type: 'UPDATE_MANIFEST', payload: { tools } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Capabilities</h2>
        <p className="text-muted-foreground">Define what skills and tools your agent should have.</p>
      </div>

      <div className="grid gap-8">
        <div className="space-y-4">
          <Label>Skills</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. data-analysis" 
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
            />
            <Button size="icon" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(state.manifest.skills || []).map(s => (
              <Badge key={s} variant="secondary" className="pl-2 pr-1 py-1">
                {s}
                <button onClick={() => removeSkill(s)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Tools</Label>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. search-web" 
              value={newTool}
              onChange={e => setNewTool(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTool()}
            />
            <Button size="icon" onClick={addTool}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(state.manifest.tools || []).map(t => (
              <Badge key={t} variant="secondary" className="pl-2 pr-1 py-1">
                {t}
                <button onClick={() => removeTool(t)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
