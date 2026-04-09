import React from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { assembleSoul, assembleRules } from '@/lib/gitagent/assembleSystemPrompt';

export function IdentityStep() {
  const { state, dispatch } = useAgentWorkspace();

  const updateManifest = (field: string, value: string) => {
    dispatch({ type: 'UPDATE_MANIFEST', payload: { [field]: value } });
  };

  const updateSoulField = (key: string, value: string) => {
    const nextWorkspace = { ...state, [key]: value };
    const soul = assembleSoul(nextWorkspace);
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { [key]: value, soul } });
  };

  const updateRulesField = (key: string, value: string) => {
    const nextWorkspace = { ...state, [key]: value };
    const rules = assembleRules(nextWorkspace);
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { [key]: value, rules } });
  };

  const isMinimal = state.selectedTemplate === 'minimal';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agent Identity</h2>
        <p className="text-muted-foreground">Define the core essence and behavior of your agent.</p>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name (kebab-case)</Label>
            <Input 
              id="name" 
              placeholder="my-awesome-agent" 
              value={state.manifest.name || ''}
              onChange={e => updateManifest('name', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="version">Version</Label>
            <Input 
              id="version" 
              placeholder="1.0.0" 
              value={state.manifest.version || ''}
              onChange={e => updateManifest('version', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="core-identity">Core Identity</Label>
          <Textarea 
            id="core-identity" 
            placeholder="A senior software engineer focused on React performance..." 
            className="min-h-[100px]"
            value={state['core-identity'] || ''}
            onChange={e => {
              const val = e.target.value;
              const nextWorkspace = { ...state, 'core-identity': val };
              const soul = assembleSoul(nextWorkspace);
              dispatch({ 
                type: 'UPDATE_WORKSPACE', 
                payload: { 
                  'core-identity': val, 
                  soul,
                  manifest: { ...state.manifest, description: val }
                } 
              });
            }}
          />
          <p className="text-[10px] text-muted-foreground italic">Maps to agent.yaml description and SOUL.md ## Core Identity</p>
        </div>

        {!isMinimal && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="communication-style">Communication Style</Label>
              <Textarea 
                id="communication-style" 
                placeholder="Concise, technical, and professional..." 
                value={state['communication-style'] || ''}
                onChange={e => updateSoulField('communication-style', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="domain-expertise">Domain Expertise</Label>
              <Textarea 
                id="domain-expertise" 
                placeholder="Deep knowledge of TypeScript, Vite, and Tailwind..." 
                value={state['domain-expertise'] || ''}
                onChange={e => updateSoulField('domain-expertise', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="values-principles">Values & Principles</Label>
          <Textarea 
            id="values-principles" 
            placeholder="Prioritize readability over cleverness. Always verify assumptions..." 
            value={state['values-principles'] || ''}
            onChange={e => updateSoulField('values-principles', e.target.value)}
          />
        </div>

        {!isMinimal && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Rules & Constraints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="must-always">Must Always</Label>
                <Textarea 
                  id="must-always" 
                  placeholder="Check for lint errors before submitting..." 
                  value={state['must-always'] || ''}
                  onChange={e => updateRulesField('must-always', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="must-never">Must Never</Label>
                <Textarea 
                  id="must-never" 
                  placeholder="Use deprecated APIs or mock data..." 
                  value={state['must-never'] || ''}
                  onChange={e => updateRulesField('must-never', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="author">Author</Label>
          <Input 
            id="author" 
            placeholder="Your Name" 
            value={state.manifest.author || ''}
            onChange={e => updateManifest('author', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
