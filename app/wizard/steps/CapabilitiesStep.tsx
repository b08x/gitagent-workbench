import React, { useState } from 'react';
import { useAgentWorkspace, SkillEntry, ToolEntry } from '../../context/AgentContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle, Info, Brain, BookOpen, Zap, Settings2 } from 'lucide-react';
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
  const [skillErrors, setSkillErrors] = useState<Record<number, string>>({});
  const [toolErrors, setToolErrors] = useState<Record<number, string>>({});
  const [loadingSkills, setLoadingSkills] = useState<Record<number, boolean>>({});
  const [memorySeedingEnabled, setMemorySeedingEnabled] = useState(state.memoryBootstrap !== null);

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
    const currentTools = skill.allowedTools ? skill.allowedTools.split(' ').filter(Boolean) : [];
    const nextTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    handleSkillChange(index, 'allowedTools', nextTools.join(' '));
  };

  // ── Knowledge ──────────────────────────────────────────────────────────────
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
  const updateTools = (newTools: ToolEntry[]) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { toolsList: newTools } });
    dispatch({ type: 'UPDATE_MANIFEST', payload: { tools: newTools.map(t => t.name).filter(Boolean) } });
  };

  const addTool = () => {
    updateTools([...state.toolsList, { name: '', description: '' }]);
  };

  const removeTool = (index: number) => {
    const newTools = [...state.toolsList];
    newTools.splice(index, 1);
    updateTools(newTools);
  };

  const handleToolChange = (index: number, field: keyof ToolEntry, value: string) => {
    const newTools = [...state.toolsList];
    newTools[index] = { ...newTools[index], [field]: value };
    updateTools(newTools);
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
          <div className="flex items-start gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg mb-6">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Skills</strong> are procedural knowledge. <strong className="text-foreground">HOW</strong> to do things.
              Loaded on demand, only when relevant. Zero token cost until triggered. Put HOW-TO knowledge here.
            </p>
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
                        className={cn((fieldErrors[`skillsList.${index}.name`]) && "border-destructive")}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`skill-category-${index}`}>Category</Label>
                      <Input 
                        id={`skill-category-${index}`}
                        placeholder="e.g. devops, research"
                        value={skill.category}
                        onChange={e => handleSkillChange(index, 'category', e.target.value as any)}
                      />
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
                    <Label>Allowed Tools</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30">
                      {CANONICAL_TOOLS.map(tool => (
                        <div key={tool} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`skill-${index}-tool-${tool}`}
                            checked={(skill.allowedTools || '').split(' ').includes(tool)}
                            onCheckedChange={() => toggleSkillTool(index, tool)}
                          />
                          <label htmlFor={`skill-${index}-tool-${tool}`} className="text-xs cursor-pointer select-none">
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

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
        </div>
        <p className="text-muted-foreground">Declare tools that the agent can use to interact with the world.</p>

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
                    />
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
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Deployment Targets</h2>
        </div>
        <p className="text-muted-foreground">Select where your agent will be deployed to pre-configure the Hermes environment.</p>

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

import { Rocket } from 'lucide-react';
