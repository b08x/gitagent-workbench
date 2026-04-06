import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Search, Wrench } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AllowedToolsSelectorProps {
  skill: SkillDefinition;
}

export function AllowedToolsSelector({ skill }: AllowedToolsSelectorProps) {
  const { updateSkill } = useSkillWorkbench();
  const { state: agentState } = useAgentWorkspace();
  const [newTool, setNewTool] = useState('');

  const agentTools = Object.keys(agentState.tools || {});
  const selectedTools = skill.allowedTools || [];

  const toggleTool = (toolName: string) => {
    const newTools = selectedTools.includes(toolName)
      ? selectedTools.filter(t => t !== toolName)
      : [...selectedTools, toolName];
    updateSkill(skill.id, { allowedTools: newTools });
  };

  const addExternalTool = () => {
    if (newTool && !selectedTools.includes(newTool)) {
      updateSkill(skill.id, { allowedTools: [...selectedTools, newTool] });
      setNewTool('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          Allowed Tools
        </CardTitle>
        <CardDescription>Specify which tools this skill is allowed to use.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Selected Tools</Label>
          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 rounded-md border bg-muted/30">
            {selectedTools.map(tool => (
              <Badge key={tool} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                {tool}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                  onClick={() => toggleTool(tool)}
                />
              </Badge>
            ))}
            {selectedTools.length === 0 && (
              <span className="text-sm text-muted-foreground italic">No tools selected</span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Label>Agent Tools</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {agentTools.map(tool => (
              <Button
                key={tool}
                variant={selectedTools.includes(tool) ? 'secondary' : 'outline'}
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  selectedTools.includes(tool) && "border-primary"
                )}
                onClick={() => toggleTool(tool)}
              >
                <Wrench className="h-3 w-3 mr-2 opacity-50" />
                <span className="truncate">{tool}</span>
              </Button>
            ))}
            {agentTools.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground italic">
                No tools declared in the current agent.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label htmlFor="external-tool">Add External Tool</Label>
          <div className="flex gap-2">
            <Input 
              id="external-tool"
              placeholder="e.g., shell-exec"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addExternalTool()}
            />
            <Button variant="outline" onClick={addExternalTool}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add tools that are not declared in the current agent's manifest.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
