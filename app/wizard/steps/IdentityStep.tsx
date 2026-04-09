import React, { useState } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { assembleSoul, assembleRules } from '@/lib/gitagent/assembleSystemPrompt';
import { GenerateImproveButton } from '../components/GenerateImproveButton';

export function IdentityStep() {
  const { state, dispatch } = useAgentWorkspace();
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>({});

  const setFieldLoading = (field: string, loading: boolean) => {
    setLoadingFields(prev => ({ ...prev, [field]: loading }));
  };

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
          <div className="flex items-center justify-between">
            <Label htmlFor="core-identity">Core Identity</Label>
            <GenerateImproveButton 
              fieldValue={state['core-identity'] || ''}
              fileType="soul-md"
              workspace={state}
              onLoadingChange={(loading) => setFieldLoading('core-identity', loading)}
              onResult={(val) => {
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
          </div>
          <Textarea 
            id="core-identity" 
            placeholder="A senior software engineer focused on React performance..." 
            className="min-h-[100px]"
            value={state['core-identity'] || ''}
            disabled={loadingFields['core-identity']}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="communication-style">Communication Style</Label>
                <GenerateImproveButton 
                  fieldValue={state['communication-style'] || ''}
                  fileType="soul-md"
                  workspace={state}
                  onLoadingChange={(loading) => setFieldLoading('communication-style', loading)}
                  onResult={(val) => updateSoulField('communication-style', val)}
                />
              </div>
              <Textarea 
                id="communication-style" 
                placeholder="Concise, technical, and professional..." 
                value={state['communication-style'] || ''}
                disabled={loadingFields['communication-style']}
                onChange={e => updateSoulField('communication-style', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="domain-expertise">Domain Expertise</Label>
                <GenerateImproveButton 
                  fieldValue={state['domain-expertise'] || ''}
                  fileType="soul-md"
                  workspace={state}
                  onLoadingChange={(loading) => setFieldLoading('domain-expertise', loading)}
                  onResult={(val) => updateSoulField('domain-expertise', val)}
                />
              </div>
              <Textarea 
                id="domain-expertise" 
                placeholder="Deep knowledge of TypeScript, Vite, and Tailwind..." 
                value={state['domain-expertise'] || ''}
                disabled={loadingFields['domain-expertise']}
                onChange={e => updateSoulField('domain-expertise', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="values-principles">Values & Principles</Label>
            <GenerateImproveButton 
              fieldValue={state['values-principles'] || ''}
              fileType="soul-md"
              workspace={state}
              onLoadingChange={(loading) => setFieldLoading('values-principles', loading)}
              onResult={(val) => updateSoulField('values-principles', val)}
            />
          </div>
          <Textarea 
            id="values-principles" 
            placeholder="Prioritize readability over cleverness. Always verify assumptions..." 
            value={state['values-principles'] || ''}
            disabled={loadingFields['values-principles']}
            onChange={e => updateSoulField('values-principles', e.target.value)}
          />
        </div>

        {!isMinimal && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">Rules & Constraints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="must-always">Must Always</Label>
                  <GenerateImproveButton 
                    fieldValue={state['must-always'] || ''}
                    fileType="rules-md"
                    workspace={state}
                    onLoadingChange={(loading) => setFieldLoading('must-always', loading)}
                    onResult={(val) => updateRulesField('must-always', val)}
                  />
                </div>
                <Textarea 
                  id="must-always" 
                  placeholder="Check for lint errors before submitting..." 
                  value={state['must-always'] || ''}
                  disabled={loadingFields['must-always']}
                  onChange={e => updateRulesField('must-always', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="must-never">Must Never</Label>
                  <GenerateImproveButton 
                    fieldValue={state['must-never'] || ''}
                    fileType="rules-md"
                    workspace={state}
                    onLoadingChange={(loading) => setFieldLoading('must-never', loading)}
                    onResult={(val) => updateRulesField('must-never', val)}
                  />
                </div>
                <Textarea 
                  id="must-never" 
                  placeholder="Use deprecated APIs or mock data..." 
                  value={state['must-never'] || ''}
                  disabled={loadingFields['must-never']}
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
