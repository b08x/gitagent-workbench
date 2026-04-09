import React, { useState } from 'react';
import { useAgentWorkspace, SkillEntry, ToolEntry } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const isValidKebabCase = (str: string) => {
  return /^[a-z][a-z0-9-]*$/.test(str);
};

export function SkillsToolsStep() {
  const { state, dispatch } = useAgentWorkspace();
  const [skillErrors, setSkillErrors] = useState<Record<number, string>>({});
  const [toolErrors, setToolErrors] = useState<Record<number, string>>({});

  if (state.selectedTemplate === 'minimal') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Skills and Tools configuration is not available for the Minimal template.</p>
      </div>
    );
  }

  const updateSkills = (newSkills: SkillEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { skillsList: newSkills } });
  };

  const updateTools = (newTools: ToolEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { toolsList: newTools } });
  };

  const addSkill = () => {
    updateSkills([...state.skillsList, { name: '', description: '', category: 'general' }]);
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
                      className={cn(skillErrors[index] && "border-destructive focus-visible:ring-destructive")}
                    />
                    {skillErrors[index] && (
                      <p className="text-[10px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {skillErrors[index]}
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
                  />
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
    </div>
  );
}
