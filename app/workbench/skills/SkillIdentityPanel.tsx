import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillDefinition, AgentFramework } from '../../../lib/gitagent/types';
import { inferFrameworkTools } from '../../../lib/gitagent/contextToolInference';
import { AGENT_FRAMEWORK_OPTIONS } from '../../../lib/gitagent/constants';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface SkillIdentityPanelProps {
  skill: SkillDefinition;
}

export function SkillIdentityPanel({ skill }: SkillIdentityPanelProps) {
  const { updateSkill } = useSkillWorkbench();
  const { state: agentState } = useAgentWorkspace();
  const [nameError, setNameError] = useState<string | null>(null);

  const activeFramework: AgentFramework = (agentState.targetFramework as AgentFramework) || 'hermes_agent';
  const frameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework) || AGENT_FRAMEWORK_OPTIONS[0];

  const inferred = inferFrameworkTools({
    name: skill.name,
    description: skill.description,
    category: skill.metadata?.category,
    instructions: skill.instructions,
    targetFramework: activeFramework
  });

  const validateName = (name: string) => {
    if (!name) return 'Name is required';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      return 'Name must be kebab-case (e.g., my-skill-name)';
    }
    return null;
  };

  const handleNameChange = (name: string) => {
    const error = validateName(name);
    setNameError(error);
    updateSkill(skill.id, { name });
  };

  const handleDescriptionChange = (description: string) => {
    // If allowedTools is empty, automatically infer and assign for this harness
    if (!skill.allowedTools || skill.allowedTools.length === 0) {
      const autoTools = inferFrameworkTools({
        name: skill.name,
        description,
        category: skill.metadata?.category,
        instructions: skill.instructions,
        targetFramework: activeFramework
      }).tools;
      updateSkill(skill.id, { description, allowedTools: autoTools });
    } else {
      updateSkill(skill.id, { description });
    }
  };

  const updateMetadata = (key: string, value: string) => {
    updateSkill(skill.id, {
      metadata: {
        ...skill.metadata,
        [key]: value
      }
    });
  };

  const removeMetadata = (key: string) => {
    const newMetadata = { ...skill.metadata };
    delete newMetadata[key];
    updateSkill(skill.id, { metadata: newMetadata });
  };

  const addMetadata = () => {
    const key = `key_${Object.keys(skill.metadata).length}`;
    updateMetadata(key, '');
  };

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Skill Identity</CardTitle>
              <CardDescription>Define the core properties and purpose of your skill.</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Harness: {frameworkMeta.shortLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Name (kebab-case)</Label>
            <Input 
              id="name"
              placeholder="e.g. artifact-removal"
              value={skill.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
            />
            {nameError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {nameError}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span className={cn(
                "text-xs",
                (skill.description?.length || 0) > 1024 ? "text-destructive" : "text-muted-foreground"
              )}>
                {skill.description?.length || 0}/1024
              </span>
            </div>
            <Textarea 
              id="description"
              placeholder="e.g. Detect and delete copy/paste artifacts such as $1 and similar strings..."
              value={skill.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="h-24"
            />
            {skill.description && (
              <div className="flex items-center gap-2 pt-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">
                  Inferred tools ({frameworkMeta.shortLabel}): <strong className="text-foreground font-mono">{inferred.tools.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="license">License</Label>
              <Input 
                id="license"
                placeholder="MIT"
                value={skill.license}
                onChange={(e) => updateSkill(skill.id, { license: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="compatibility">Compatibility</Label>
              <Input 
                id="compatibility"
                placeholder=">=0.1.0"
                value={skill.compatibility}
                onChange={(e) => updateSkill(skill.id, { compatibility: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>Additional key-value pairs for the skill.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addMetadata}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(skill.metadata).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Input 
                placeholder="Key" 
                value={key}
                onChange={(e) => {
                  const newKey = e.target.value;
                  const newMetadata = { ...skill.metadata };
                  delete newMetadata[key];
                  newMetadata[newKey] = value;
                  updateSkill(skill.id, { metadata: newMetadata });
                }}
                className="w-1/3"
              />
              <Input 
                placeholder="Value" 
                value={String(value)}
                onChange={(e) => updateMetadata(key, e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeMetadata(key)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {Object.keys(skill.metadata).length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No metadata defined.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
