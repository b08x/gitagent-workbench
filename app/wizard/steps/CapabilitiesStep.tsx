import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillEntry } from '../../../lib/gitagent/types';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, Info, Brain, BookOpen, Zap, Settings2, ExternalLink, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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

const CANONICAL_TOOLS = [
  'web_search', 'web_extract', 'terminal', 'process', 'read_file', 'patch', 
  'browser_navigate', 'browser_snapshot', 'browser_vision', 'vision_analyze', 
  'image_generate', 'text_to_speech', 'todo', 'clarify', 'execute_code', 
  'delegate_task', 'memory', 'session_search', 'cronjob', 'send_message'
];

export function CapabilitiesStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const { state: workbenchState } = useSkillWorkbench();
  const navigate = useNavigate();

  const [loadingSkills, setLoadingSkills] = useState<Record<number, boolean>>({});
  const [memorySeedingEnabled, setMemorySeedingEnabled] = useState(state.memoryBootstrap !== null);

  const setSkillLoading = (index: number, loading: boolean) => {
    setLoadingSkills(prev => ({ ...prev, [index]: loading }));
  };

  const availableWorkbenchSkills = workbenchState.skills;

  if (state.selectedTemplate === 'minimal') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground italic">Skills and Tools configuration is not available for the Minimal template.</p>
      </div>
    );
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  const updateSkills = (newSkills: SkillEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { skillsList: newSkills } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { skills: newSkills.map(s => s.name).filter(Boolean) } });
  };

  const addSkill = () => {
    updateSkills([...state.skillsList, { name: '', description: '', instructions: '', category: 'general', allowedTools: '' }]);
  };

  const removeSkill = (index: number) => {
    const newSkills = [...state.skillsList];
    newSkills.splice(index, 1);
    updateSkills(newSkills);
  };

  const handleSkillChange = (index: number, field: keyof SkillEntry, value: string) => {
    const newSkills = [...state.skillsList];
    newSkills[index] = { ...newSkills[index], [field]: value };
    updateSkills(newSkills);
  };

  const toggleSkillTool = (index: number, tool: string) => {
    const skill = state.skillsList[index];
    const currentTools = (skill.allowedTools || '').split(' ').filter(Boolean);
    const nextTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    handleSkillChange(index, 'allowedTools', nextTools.join(' '));
  };

  const importFromWorkbench = (skillId: string) => {
    const workbenchSkill = availableWorkbenchSkills.find(s => s.id === skillId);
    if (!workbenchSkill) return;

    const existingIndex = state.skillsList.findIndex(s => s.name === workbenchSkill.name);
    if (existingIndex !== -1) return;

    const newSkill: SkillEntry = {
      name: workbenchSkill.name,
      description: workbenchSkill.description,
      instructions: workbenchSkill.instructions,
      category: (workbenchSkill.metadata?.category as any) || 'general',
      allowedTools: workbenchSkill.allowedTools.join(' ')
    };

    updateSkills([...state.skillsList, newSkill]);
  };

  const updateKnowledge = (newDocs: typeof state.knowledgeDocs) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { knowledgeDocs: newDocs } });
  };

  const addKnowledgeDoc = () => {
    updateKnowledge([...(state.knowledgeDocs || []), { path: '', description: '', alwaysLoad: false, content: null }]);
  };

  const removeKnowledgeDoc = (index: number) => {
    const newDocs = [...(state.knowledgeDocs || [])];
    newDocs.splice(index, 1);
    updateKnowledge(newDocs);
  };

  const handleKnowledgeChange = (index: number, field: string, value: any) => {
    const newDocs = [...(state.knowledgeDocs || [])];
    newDocs[index] = { ...newDocs[index], [field]: value };
    updateKnowledge(newDocs);
  };

  const handleKnowledgePathBlur = (index: number) => {
    const doc = state.knowledgeDocs[index];
    let path = toKebabCase(doc.path);
    if (path && !path.endsWith('.md')) path += '.md';
    if (path !== doc.path) {
      handleKnowledgeChange(index, 'path', path);
    }
  };

  // ── Memory ─────────────────────────────────────────────────────────────────
  const handleMemoryBootstrapChange = (val: string) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { memoryBootstrap: val } });
  };

  const toggleMemorySeeding = (enabled: boolean) => {
    setMemorySeedingEnabled(enabled);
    if (!enabled) {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { memoryBootstrap: null } });
    } else if (state.memoryBootstrap === null) {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { memoryBootstrap: '' } });
    }
  };

  // ── Tools & Deployment ─────────────────────────────────────────────────────
  // Moved to DeploymentStep and ToolsStep

  return (
    <div className="space-y-8">
      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Zap className="h-4 w-4" /> Skills
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Knowledge
          </TabsTrigger>
          <TabsTrigger value="memory" className="flex items-center gap-2">
            <Brain className="h-4 w-4" /> Memory
          </TabsTrigger>
        </TabsList>

        {/* ── SKILLS TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="skills" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg flex-1">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Skills</strong> are procedural knowledge. <strong className="text-foreground">HOW</strong> to do things.
                Loaded on demand, only when relevant. Zero token cost until triggered.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/workbench/skills')}>
              <ExternalLink className="mr-2 h-4 w-4" /> Skill Workbench
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Blueprints</Label>
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-[400px] overflow-y-auto">
                      {availableWorkbenchSkills.length > 0 ? (
                        availableWorkbenchSkills.map(s => (
                          <div 
                            key={s.id} 
                            className="p-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between group transition-colors"
                            onClick={() => importFromWorkbench(s.id)}
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{s.description}</p>
                            </div>
                            <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center space-y-3">
                          <Library className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                          <p className="text-xs text-muted-foreground italic">No skills in workbench.</p>
                          <Button size="xs" variant="link" onClick={() => navigate('/workbench/skills')}>
                            Create your first skill
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agent Capabilities</Label>
              {state.skillsList.length === 0 && (
                <div className="border-2 border-dashed rounded-xl p-12 text-center space-y-4">
                  <Zap className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                  <div className="space-y-1">
                    <p className="font-medium">No skills assigned to agent</p>
                    <p className="text-sm text-muted-foreground">Import from workbench or create a draft below.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSkill}>
                    <Plus className="mr-2 h-4 w-4" /> Create Draft Skill
                  </Button>
                </div>
              )}
              
              <div className="space-y-4">
                {state.skillsList.map((skill, index) => (
                  <Card key={index} className="relative overflow-hidden group">
                    <CardContent className="pt-6 space-y-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
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
                            className={cn((fieldErrors[`skillsList.${index}.name`]) && "border-destructive")}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`skill-category-${index}`}>Category</Label>
                          <Select 
                            value={skill.category} 
                            onValueChange={v => handleSkillChange(index, 'category' as any, v)}
                          >
                            <SelectTrigger id={`skill-category-${index}`}>
                              <SelectValue placeholder="Select category" />
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
                        <Label className="text-xs">Allowed Tools</Label>
                        <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                          {CANONICAL_TOOLS.map(tool => (
                            <div key={tool} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`skill-${index}-tool-${tool}`}
                                checked={(skill.allowedTools || '').split(' ').includes(tool)}
                                onCheckedChange={() => toggleSkillTool(index, tool)}
                              />
                              <label htmlFor={`skill-${index}-tool-${tool}`} className="text-[10px] cursor-pointer select-none">
                                {tool}
                              </label>
                            </div>
                          ))}
                        </div>
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
                          className="min-h-[100px] text-xs font-mono"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {state.skillsList.length > 0 && (
                  <Button variant="outline" className="w-full border-dashed" onClick={addSkill}>
                    <Plus className="mr-2 h-4 w-4" /> Add Another Capability
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── KNOWLEDGE TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="knowledge" className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg mb-6">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Knowledge</strong> docs hold <strong className="text-foreground">WHAT</strong> things are — API schemas, glossaries, product specs. 
              Put reference facts here, not in skills.
            </p>
          </div>

          <div className="space-y-4">
            {(state.knowledgeDocs || []).map((doc, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="pt-6 space-y-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    onClick={() => removeKnowledgeDoc(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`doc-path-${index}`}>Path (kebab-case .md)</Label>
                      <Input 
                        id={`doc-path-${index}`}
                        placeholder="api-schema.md"
                        value={doc.path}
                        onChange={e => handleKnowledgeChange(index, 'path', e.target.value)}
                        onBlur={() => handleKnowledgePathBlur(index)}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch 
                        id={`doc-load-${index}`}
                        checked={doc.alwaysLoad}
                        onCheckedChange={v => handleKnowledgeChange(index, 'alwaysLoad', v)}
                      />
                      <Label htmlFor={`doc-load-${index}`} className="text-sm">
                        {doc.alwaysLoad ? "Load every session (small docs)" : "Load on demand (large docs)"}
                      </Label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`doc-desc-${index}`}>Description</Label>
                    <Input 
                      id={`doc-desc-${index}`}
                      placeholder="One-line description of this document..."
                      value={doc.description}
                      onChange={e => handleKnowledgeChange(index, 'description', e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`doc-content-${index}`}>Content</Label>
                    <Textarea 
                      id={`doc-content-${index}`}
                      placeholder="Leave blank to generate from description"
                      value={doc.content || ''}
                      onChange={e => handleKnowledgeChange(index, 'content', e.target.value || null)}
                      className="min-h-[150px]"
                    />
                    {doc.alwaysLoad && (doc.content || '').split(/\s+/).length > 500 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Large always-load docs increase token cost. Consider setting to 'load on demand'.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" className="w-full border-dashed" onClick={addKnowledgeDoc}>
              <Plus className="mr-2 h-4 w-4" /> Add Document
            </Button>
          </div>
        </TabsContent>

        {/* ── MEMORY TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="memory" className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg mb-6">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Memory</strong> is for persistent state — small facts across sessions. 
              Max 200 lines enforced. Put identity here, not project details.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Memory Seeding</CardTitle>
                  <CardDescription>Carry durable facts from session one.</CardDescription>
                </div>
                <Switch 
                  checked={memorySeedingEnabled || state.selectedTemplate === 'full'}
                  disabled={state.selectedTemplate === 'full'}
                  onCheckedChange={toggleMemorySeeding}
                />
              </div>
            </CardHeader>
            {(memorySeedingEnabled || state.selectedTemplate === 'full') && (
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="memory-bootstrap">Bootstrap memory entry</Label>
                  <Textarea 
                    id="memory-bootstrap"
                    placeholder="One durable fact the agent should carry from session one. e.g. 'This agent serves the platform team. Be terse and technical.'"
                    value={state.memoryBootstrap || ''}
                    onChange={e => handleMemoryBootstrapChange(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <div className="flex justify-between items-center">
                    { (state.memoryBootstrap || '').length > 500 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Exceeding recommended 500 char bootstrap limit.
                      </p>
                    )}
                    <p className={cn("text-xs ml-auto", (state.memoryBootstrap || '').length > 500 ? "text-amber-600" : "text-muted-foreground")}>
                      {(state.memoryBootstrap || '').length} characters
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="my-8" />
    </div>
  );
}
