import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function IdentityStep() {
  const { state, dispatch } = useAgentWorkspace();

  const update = (field: string, value: string) => {
    dispatch({ type: 'UPDATE_MANIFEST', payload: { [field]: value } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agent Identity</h2>
        <p className="text-muted-foreground">Define who this agent is and what it does.</p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Name (kebab-case)</Label>
          <Input 
            id="name" 
            placeholder="my-awesome-agent" 
            value={state.manifest.name || ''}
            onChange={e => update('name', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="version">Version</Label>
          <Input 
            id="version" 
            placeholder="1.0.0" 
            value={state.manifest.version || ''}
            onChange={e => update('version', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            placeholder="A helpful agent that..." 
            value={state.manifest.description || ''}
            onChange={e => update('description', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="author">Author</Label>
          <Input 
            id="author" 
            placeholder="Your Name" 
            value={state.manifest.author || ''}
            onChange={e => update('author', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
