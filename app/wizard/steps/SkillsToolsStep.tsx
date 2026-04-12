import React, { useState } from 'react';
import { useAgentWorkspace, SkillEntry, ToolEntry } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GenerateImproveButton } from '../components/GenerateImproveButton';

const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const isValidKebabCase = (str: string) => {
  return /^[a-z][a-z0-9-]*$/.test(str);
};

export function SkillsToolsStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const [skillErrors, setSkillErrors] = useState<Record<number, string>>({});
  const [toolErrors, setToolErrors] = useState<Record<number, string>>({});
  const [loadingSkills, setLoadingSkills] = useState<Record<number, boolean>>({});

  const setSkillLoading = (index: number, loading: boolean) => {
    setLoadingSkills(prev => ({ ...prev, [index]: loading }));
  };

  if (state.selectedTemplate === 'minimal') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Skills and Tools configuration is not available for the Minimal template.</p>
      </div>
    );
  }

  const updateSkills = (newSkills: SkillEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { skillsList: newSkills } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { skills: newSkills.map(s => s.name).filter(Boolean) } });
  };

  const updateTools = (newTools: ToolEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { toolsList: newTools } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { tools: newTools.map(t => t.name).filter(Boolean) } });
  };

  const addSkill = () => {
    updateSkills([...state.skillsList, { name: '', description: '', instructions: '', category: 'general' }]);
  };

  const removeSkill = (index: number) => {
    const newSkills = [...state.skillsList];
    newSkills.splice(index, 1);
    updateSkills(newSkills);
    const newErrors = { ...skillErrors };
    delete newErrors[index];
    setSkillErrors(newErrors);
  };

  const handleSkillChange = (index: number, field: keyof SkillEntry, value: string) => {
    const newSkills = [...state.skillsList];
    newSkills[index] = { ...newSkills[index], [field]: value };
    updateSkills(newSkills);
  };

  const handleSkillBlur = (index: number) => {
    const skill = state.skillsList[index];
    const kebab = toKebabCase(skill.name);
    
    if (skill.name && !isValidKebabCase(kebab)) {
      setSkillErrors(prev => ({ ...prev, [index]: 'Invalid kebab-case name' }));
    } else {
      setSkillErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      if (skill.name !== kebab) {
        handleSkillChange(index, 'name', kebab);
      }
    }
  };

  const addTool = () => {
    updateTools([...state.toolsList, { name: '', description: '' }]);
  };

  const removeTool = (index: number) => {
    const newTools = [...state.toolsList];
    newTools.splice(index, 1);
    updateTools(newTools);
    const newErrors = { ...toolErrors };
    delete newErrors[index];
    setToolErrors(newErrors);
  };

  const handleToolChange = (index: number, field: keyof ToolEntry, value: string) => {
    const newTools = [...state.toolsList];
    newTools[index] = { ...newTools[index], [field]: value };
    updateTools(newTools);
  };

  const handleToolBlur = (index: number) => {
    const tool = state.toolsList[index];
    const kebab = toKebabCase(tool.name);
    
    if (tool.name && !isValidKebabCase(kebab)) {
      setToolErrors(prev => ({ ...prev, [index]: 'Invalid kebab-case name' }));
    } else {
      setToolErrors(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      if (tool.name !== kebab) {
        handleToolChange(index, 'name', kebab);
      }
    }
  };

  const toggleDeploymentTarget = (target: any) => {
    const current = state.deploymentTargets || ['cli'];
    const next = current.includes(target)
      ? current.filter(t => t !== target)
      : [...current, target];
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { deploymentTargets: next } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { deployment_targets: next } });
  };

  const DEPLOYMENT_OPTIONS = [
    { id: 'cli', label: 'CLI', description: 'Terminal only, no gateway' },
    { id: 'telegram', label: 'Telegram', description: 'Gateway.telegram stub included' },
    { id: 'discord', label: 'Discord', description: 'Gateway.discord stub included' },
    { id: 'slack', label: 'Slack', description: 'Gateway.slack stub included' },
    { id: 'api', label: 'API/Embedded', description: 'Disables terminal toolset; sets skip_context_files hint', tooltip: 'Disables terminal toolset; sets skip_context_files hint' },
    { id: 'background', label: 'Background/Scheduled', description: 'Enables cronjob toolset and delegation toolset', tooltip: 'Enables cronjob toolset and delegation toolset' },
    { id: 'homeassistant', label: 'Home Assistant', description: 'Enables homeassistant toolset' },
  ];

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
          <p className="text-muted-foreground">Define specialized capabilities for your agent.</p>
        </div>

        <div className="space-y-4">
          {state.skillsList.map((skill, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="pt-6 space-y-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSkill(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`skill-name-${index}`}>Skill Name (kebab-case)</Label>
                    <Input 
                      id={`skill-name-${index}`}
                      placeholder="research-expert"
                      value={skill.name}
                      onChange={e => handleSkillChange(index, 'name', e.target.value)}
                      onBlur={() => handleSkillBlur(index)}
                      className={cn(
                        (skillErrors[index] || fieldErrors[`skillsList.${index}.name`]) && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {(skillErrors[index] || fieldErrors[`skillsList.${index}.name`]) && (
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {skillErrors[index] || fieldErrors[`skillsList.${index}.name`]}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`skill-category-${index}`}>Category</Label>
                    <Select 
                      value={skill.category} 
                      onValueChange={v => handleSkillChange(index, 'category', v)}
                    >
                      <SelectTrigger id={`skill-category-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                        <SelectItem value="code">Code</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`skill-desc-${index}`}>Description</Label>
                  <Input 
                    id={`skill-desc-${index}`}
                    placeholder="Expert at searching and synthesizing information..."
                    value={skill.description}
                    onChange={e => handleSkillChange(index, 'description', e.target.value)}
                    className={cn(fieldErrors[`skillsList.${index}.description`] && "border-destructive")}
                  />
                  {fieldErrors[`skillsList.${index}.description`] && (
                    <p className="text-[10px] text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors[`skillsList.${index}.description`]}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`skill-tools-${index}`}>Allowed Tools (space-delimited)</Label>
                  <Input 
                    id={`skill-tools-${index}`}
                    placeholder="web-search file-reader"
                    value={skill.allowedTools || ''}
                    onChange={e => handleSkillChange(index, 'allowedTools', e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`skill-instructions-${index}`}>Instructions</Label>
                    <GenerateImproveButton 
                      fieldValue={skill.instructions || ''}
                      fileType="skill-md"
                      fieldName={`Skill: ${skill.name} Instructions`}
                      workspace={state}
                      onLoadingChange={(loading) => setSkillLoading(index, loading)}
                      onResult={(val) => handleSkillChange(index, 'instructions', val)}
                    />
                  </div>
                  <Textarea 
                    id={`skill-instructions-${index}`}
                    placeholder="1. Step one...&#10;2. Step two..."
                    value={skill.instructions || ''}
                    disabled={loadingSkills[index]}
                    onChange={e => handleSkillChange(index, 'instructions', e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full border-dashed" onClick={addSkill}>
            <Plus className="mr-2 h-4 w-4" /> Add Skill
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
          <p className="text-muted-foreground">Declare tools that the agent can use to interact with the world.</p>
        </div>

        <div className="space-y-4">
          {state.toolsList.map((tool, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="pt-6 space-y-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => removeTool(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`tool-name-${index}`}>Tool Name (kebab-case)</Label>
                    <Input 
                      id={`tool-name-${index}`}
                      placeholder="web-search"
                      value={tool.name}
                      onChange={e => handleToolChange(index, 'name', e.target.value)}
                      onBlur={() => handleToolBlur(index)}
                      className={cn(toolErrors[index] && "border-destructive focus-visible:ring-destructive")}
                    />
                    {toolErrors[index] && (
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {toolErrors[index]}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`tool-desc-${index}`}>Description</Label>
                    <Input 
                      id={`tool-desc-${index}`}
                      placeholder="Search the web for information..."
                      value={tool.description}
                      onChange={e => handleToolChange(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full border-dashed" onClick={addTool}>
            <Plus className="mr-2 h-4 w-4" /> Add Tool
          </Button>
        </div>
      </section>

      <section className="space-y-6 pt-6 border-t">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deployment Targets</h2>
          <p className="text-muted-foreground">Select where your agent will be deployed to pre-configure the Hermes environment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TooltipProvider>
            {DEPLOYMENT_OPTIONS.map((opt) => (
              <div key={opt.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <Checkbox 
                  id={`target-${opt.id}`} 
                  checked={(state.deploymentTargets || ['cli']).includes(opt.id as any)}
                  onCheckedChange={() => toggleDeploymentTarget(opt.id)}
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`target-${opt.id}`}
                      className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {opt.label}
                    </label>
                    {opt.tooltip && (
                      <Tooltip>
                        <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />} />
                        <TooltipContent>
                          <p className="max-w-xs text-xs">{opt.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>
      </section>
    </div>
  );
}
