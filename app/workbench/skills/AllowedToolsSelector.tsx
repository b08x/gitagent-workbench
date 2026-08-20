import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillDefinition, AgentFramework } from '../../../lib/gitagent/types';
import { 
  AGENT_FRAMEWORK_TOOLS, 
  AGENT_FRAMEWORK_OPTIONS, 
  TOOL_DESCRIPTIONS,
  TOOL_MATRIX
} from '../../../lib/gitagent/constants';
import { inferFrameworkTools, detectContextIntents } from '../../../lib/gitagent/contextToolInference';
import { ToolMatrixModal } from './ToolMatrixModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Wrench, Cpu, Check, Sparkles, BookOpen, Shield, HelpCircle, ArrowRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AllowedToolsSelectorProps {
  skill: SkillDefinition;
}

export function AllowedToolsSelector({ skill }: AllowedToolsSelectorProps) {
  const { updateSkill } = useSkillWorkbench();
  const { state: agentState, dispatch: agentDispatch } = useAgentWorkspace();
  const [newTool, setNewTool] = useState('');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [lastInferenceReason, setLastInferenceReason] = useState<string[] | null>(null);
  
  const initialFramework: AgentFramework = (agentState.targetFramework as AgentFramework) || 'hermes_agent';
  const [selectedFramework, setSelectedFramework] = useState<AgentFramework>(initialFramework);

  const frameworkTools = AGENT_FRAMEWORK_TOOLS[selectedFramework] || AGENT_FRAMEWORK_TOOLS['hermes_agent'];
  const frameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === selectedFramework) || AGENT_FRAMEWORK_OPTIONS[0];
  const selectedTools = skill.allowedTools || [];

  // Compute live inference preview
  const inference = inferFrameworkTools({
    name: skill.name,
    description: skill.description,
    category: skill.metadata?.category,
    instructions: skill.instructions,
    targetFramework: selectedFramework
  });

  const toggleTool = (toolName: string) => {
    const newTools = selectedTools.includes(toolName)
      ? selectedTools.filter(t => t !== toolName)
      : [...selectedTools, toolName];
    updateSkill(skill.id, { allowedTools: newTools });
  };

  const selectAllHarnessTools = () => {
    const nextTools = Array.from(new Set([...selectedTools, ...frameworkTools]));
    updateSkill(skill.id, { allowedTools: nextTools });
  };

  const clearTools = () => {
    updateSkill(skill.id, { allowedTools: [] });
    setLastInferenceReason(null);
  };

  const applyAutoInferredTools = () => {
    updateSkill(skill.id, { allowedTools: inference.tools });
    setLastInferenceReason(inference.reasoning);
  };

  const addExternalTool = () => {
    if (newTool.trim() && !selectedTools.includes(newTool.trim())) {
      updateSkill(skill.id, { allowedTools: [...selectedTools, newTool.trim()] });
      setNewTool('');
    }
  };

  const handleFrameworkChange = (val: AgentFramework) => {
    setSelectedFramework(val);
    agentDispatch({ type: 'UPDATE_WORKSPACE', payload: { targetFramework: val } });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Allowed Tools & Permissions
            </CardTitle>
            <CardDescription>
              Specify which tools this skill is allowed to invoke. Automatically aligned to execution harness.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMatrixModal(true)}
              className="h-8 text-xs gap-1.5"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Tool Matrix
            </Button>

            <div className="flex items-center gap-1.5 border rounded-md px-2 py-1 bg-muted/20">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <Select 
                value={selectedFramework} 
                onValueChange={(val: AgentFramework) => handleFrameworkChange(val)}
              >
                <SelectTrigger className="h-6 text-xs border-0 p-0 shadow-none font-medium focus:ring-0">
                  <SelectValue placeholder="Select harness" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_FRAMEWORK_OPTIONS.map(opt => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      {opt.shortLabel} ({AGENT_FRAMEWORK_TOOLS[opt.id]?.length || 0} tools)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Context Inference Smart Action Banner */}
        <div className="p-3.5 rounded-lg border bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Context-Inferred Tools for {frameworkMeta.shortLabel}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {inference.tools.length} recommended
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inferred from skill definition ({inference.matchedIntents.join(', ')}): <span className="font-mono text-foreground/80">{inference.tools.join(', ') || 'none'}</span>
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={applyAutoInferredTools}
            className="h-8 text-xs shrink-0 gap-1.5 shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto-Assign ({inference.tools.length})
          </Button>
        </div>

        {/* Selected Tools Chips */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold">Selected Tools ({selectedTools.length})</Label>
              {selectedTools.length === 0 && (
                <span className="text-[11px] text-amber-500 flex items-center gap-1">
                  (No tools selected — skill cannot invoke tools)
                </span>
              )}
            </div>
            {selectedTools.length > 0 && (
              <Button 
                variant="ghost" 
                size="xs" 
                onClick={clearTools}
                className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] p-2.5 rounded-md border bg-muted/30">
            {selectedTools.map(tool => {
              const isHarnessTool = frameworkTools.includes(tool);
              const toolEntry = TOOL_MATRIX.find(t => t.framework === selectedFramework && t.name === tool);
              
              return (
                <Badge 
                  key={tool} 
                  variant="secondary" 
                  className={cn(
                    "flex items-center gap-1.5 py-1 px-2.5 font-mono text-xs",
                    !isHarnessTool && "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                  )}
                >
                  {tool}
                  {!isHarnessTool ? (
                    <span className="text-[9px] font-sans opacity-70">(non-harness)</span>
                  ) : toolEntry?.permissions ? (
                    <span className="text-[9px] font-sans opacity-60">({toolEntry.permissions.split(' ')[0]})</span>
                  ) : null}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors ml-0.5" 
                    onClick={() => toggleTool(tool)}
                  />
                </Badge>
              );
            })}
            {selectedTools.length === 0 && (
              <span className="text-xs text-muted-foreground italic my-auto">No tools selected</span>
            )}
          </div>
        </div>

        {/* Harness Tools Quick Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold">{frameworkMeta.label} Harness Catalog</Label>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                {frameworkTools.length} tools
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={selectAllHarnessTools}
              className="h-6 text-[10px] text-primary hover:text-primary/80"
            >
              Select All for {frameworkMeta.shortLabel}
            </Button>
          </div>

          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {frameworkTools.map(tool => {
                const isSelected = selectedTools.includes(tool);
                const desc = TOOL_DESCRIPTIONS[tool] || 'Framework tool';
                const toolEntry = TOOL_MATRIX.find(t => t.framework === selectedFramework && t.name === tool);

                return (
                  <Tooltip key={tool}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "justify-between text-left font-mono text-xs h-8 px-2.5 transition-all",
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold" 
                            : "bg-background hover:bg-muted text-foreground"
                        )}
                        onClick={() => toggleTool(tool)}
                      >
                        <span className="truncate">{tool}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 ml-1 shrink-0" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                      <p className="font-semibold font-mono text-primary">{tool}</p>
                      <p className="text-foreground/90">{toolEntry?.functionDesc || desc}</p>
                      {toolEntry?.permissions && (
                        <div className="flex items-center gap-1 text-muted-foreground text-[10px] pt-1 border-t">
                          <Shield className="h-3 w-3 text-amber-500" />
                          <span>{toolEntry.permissions}</span>
                        </div>
                      )}
                      {toolEntry?.circumstances && (
                        <p className="text-muted-foreground text-[10px] italic">
                          Used: {toolEntry.circumstances}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        {/* Add External / Custom Tool */}
        <div className="space-y-3 pt-3 border-t">
          <Label htmlFor="external-tool" className="text-xs font-semibold">Add Custom or External Tool</Label>
          <div className="flex gap-2">
            <Input 
              id="external-tool"
              placeholder="e.g., custom_database_query"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addExternalTool()}
              className="font-mono text-xs h-8"
            />
            <Button variant="outline" size="sm" onClick={addExternalTool} className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Allow tool permissions outside the standard {frameworkMeta.label} harness catalog if using custom extensions.
          </p>
        </div>
      </CardContent>

      <ToolMatrixModal
        open={showMatrixModal}
        onOpenChange={setShowMatrixModal}
        defaultFramework={selectedFramework}
      />
    </Card>
  );
}
