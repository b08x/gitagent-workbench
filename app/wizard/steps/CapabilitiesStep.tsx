import React, { useState } from 'react';
import { useAgentWorkspace } from '../../context/AgentContext';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { SkillEntry, AgentFramework } from '../../../lib/gitagent/types';
import { 
  AGENT_FRAMEWORK_TOOLS, 
  AGENT_FRAMEWORK_OPTIONS, 
  ALL_CANONICAL_TOOLS, 
  TOOL_DESCRIPTIONS,
  TOOL_MATRIX
} from '../../../lib/gitagent/constants';
import { inferFrameworkTools } from '../../../lib/gitagent/contextToolInference';
import { ToolMatrixModal } from '../../workbench/skills/ToolMatrixModal';
import { GenerateImproveButton } from '../components/GenerateImproveButton';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  AlertCircle, 
  ExternalLink, 
  Zap, 
  BookOpen, 
  Brain, 
  Info, 
  Library, 
  Cpu, 
  Check, 
  Sparkles, 
  Shield, 
  RefreshCw 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const toKebabCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export function CapabilitiesStep({ fieldErrors = {} }: { fieldErrors?: Record<string, string> }) {
  const { state, dispatch } = useAgentWorkspace();
  const { state: workbenchState } = useSkillWorkbench();
  const navigate = useNavigate();

  const [loadingSkills, setLoadingSkills] = useState<Record<number, boolean>>({});
  const [memorySeedingEnabled, setMemorySeedingEnabled] = useState(state.memoryBootstrap !== null);
  const [showAllTools, setShowAllTools] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  const activeFramework: AgentFramework = (state.targetFramework as AgentFramework) || 'hermes_agent';
  const frameworkAllowedTools = AGENT_FRAMEWORK_TOOLS[activeFramework] || AGENT_FRAMEWORK_TOOLS['hermes_agent'];
  const activeFrameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework) || AGENT_FRAMEWORK_OPTIONS[0];

  const handleFrameworkChange = (frameworkId: AgentFramework) => {
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { targetFramework: frameworkId } });
    dispatch({ 
      type: 'UPDATE_MANIFEST', 
      payload: { 
        metadata: { 
          ...(state.manifest.metadata || {}), 
          harness: frameworkId,
          targetFramework: frameworkId
        } 
      } 
    });
  };

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
    const initialTools = inferFrameworkTools({
      name: 'new-skill',
      description: '',
      category: 'general',
      targetFramework: activeFramework
    });
    
    updateSkills([
      ...state.skillsList, 
      { 
        name: '', 
        description: '', 
        instructions: '', 
        category: 'general', 
        allowedTools: initialTools.tools.join(' ') 
      }
    ]);
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

  const autoInferToolsForSkill = (index: number) => {
    const skill = state.skillsList[index];
    const inferred = inferFrameworkTools({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      instructions: skill.instructions,
      targetFramework: activeFramework
    });
    handleSkillChange(index, 'allowedTools', inferred.tools.join(' '));
  };

  const reassignAllSkillsToCurrentFramework = () => {
    const nextSkills = state.skillsList.map(skill => {
      const inferred = inferFrameworkTools({
        name: skill.name,
        description: skill.description,
        category: skill.category,
        instructions: skill.instructions,
        targetFramework: activeFramework
      });
      return {
        ...skill,
        allowedTools: inferred.tools.join(' ')
      };
    });
    updateSkills(nextSkills);
  };

  const toggleSkillTool = (index: number, tool: string) => {
    const skill = state.skillsList[index];
    const currentTools = (skill.allowedTools || '').split(' ').filter(Boolean);
    const nextTools = currentTools.includes(tool)
      ? currentTools.filter(t => t !== tool)
      : [...currentTools, tool];
    handleSkillChange(index, 'allowedTools', nextTools.join(' '));
  };

  const selectAllFrameworkTools = (index: number) => {
    const skill = state.skillsList[index];
    const currentTools = new Set((skill.allowedTools || '').split(' ').filter(Boolean));
    frameworkAllowedTools.forEach(t => currentTools.add(t));
    handleSkillChange(index, 'allowedTools', Array.from(currentTools).join(' '));
  };

  const clearSkillTools = (index: number) => {
    handleSkillChange(index, 'allowedTools', '');
  };

  const pruneUnsupportedTools = (index: number) => {
    const skill = state.skillsList[index];
    const currentTools = (skill.allowedTools || '').split(' ').filter(Boolean);
    const filtered = currentTools.filter(t => frameworkAllowedTools.includes(t));
    handleSkillChange(index, 'allowedTools', filtered.join(' '));
  };

  const importFromWorkbench = (skillId: string) => {
    const workbenchSkill = availableWorkbenchSkills.find(s => s.id === skillId);
    if (!workbenchSkill) return;

    const existingIndex = state.skillsList.findIndex(s => s.name === workbenchSkill.name);
    if (existingIndex !== -1) return;

    // Filter tools or infer for active framework
    let tools = workbenchSkill.allowedTools || [];
    if (tools.length === 0) {
      tools = inferFrameworkTools({
        name: workbenchSkill.name,
        description: workbenchSkill.description,
        category: workbenchSkill.metadata?.category,
        instructions: workbenchSkill.instructions,
        targetFramework: activeFramework
      }).tools;
    }

    const newSkill: SkillEntry = {
      name: workbenchSkill.name,
      description: workbenchSkill.description,
      instructions: workbenchSkill.instructions,
      category: (workbenchSkill.metadata?.category as any) || 'general',
      allowedTools: tools.join(' ')
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
          {/* Harness / Framework Selector Banner */}
          <Card className="border-primary/20 bg-primary/[0.03] overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Target Agent Harness / Framework</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Skills contextually auto-assign canonical tools according to your active execution harness.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {AGENT_FRAMEWORK_OPTIONS.map((f) => {
                    const isSelected = activeFramework === f.id;
                    const toolCount = AGENT_FRAMEWORK_TOOLS[f.id]?.length || 0;
                    return (
                      <Button
                        key={f.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFrameworkChange(f.id)}
                        className={cn(
                          "h-8 text-xs font-medium transition-all",
                          isSelected 
                            ? "bg-primary text-primary-foreground shadow-xs" 
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 mr-1" />}
                        {f.shortLabel}
                        <Badge 
                          variant={isSelected ? "secondary" : "outline"} 
                          className={cn(
                            "ml-1.5 px-1.5 py-0 text-[10px] h-4",
                            isSelected ? "bg-primary-foreground/20 text-primary-foreground border-transparent" : "text-muted-foreground"
                          )}
                        >
                          {toolCount}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 p-4 bg-muted/40 border rounded-lg flex-1">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-foreground font-medium">
                    Active Harness: <span className="text-primary font-bold">{activeFrameworkMeta.label}</span>
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => setShowMatrixModal(true)}
                    className="h-5 text-xs text-primary p-0 gap-1"
                  >
                    <BookOpen className="h-3 w-3" /> View Tool Matrix
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeFrameworkMeta.description}. Tools are automatically inferred from skill context and mapped to permissions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {state.skillsList.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={reassignAllSkillsToCurrentFramework}
                  className="h-8 text-xs gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-infer All ({activeFrameworkMeta.shortLabel})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate('/workbench/skills')} className="h-8 text-xs">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Skill Workbench
              </Button>
            </div>
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agent Capabilities</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show all tools:</span>
                  <Switch 
                    checked={showAllTools} 
                    onCheckedChange={setShowAllTools} 
                    className="scale-75" 
                  />
                </div>
              </div>

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
                {state.skillsList.map((skill, index) => {
                  const currentSkillTools = (skill.allowedTools || '').split(' ').filter(Boolean);
                  const unsupportedTools = currentSkillTools.filter(t => !frameworkAllowedTools.includes(t));
                  const displayTools = showAllTools ? ALL_CANONICAL_TOOLS : frameworkAllowedTools;

                  const inferred = inferFrameworkTools({
                    name: skill.name,
                    description: skill.description,
                    category: skill.category,
                    instructions: skill.instructions,
                    targetFramework: activeFramework
                  });

                  return (
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
                              placeholder="artifact-removal"
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
                            placeholder="Detect and delete copy/paste artifacts such as $1..."
                            value={skill.description}
                            onChange={e => handleSkillChange(index, 'description', e.target.value)}
                          />
                        </div>

                        {/* Allowed Tools Filtered by Selected Framework */}
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs font-semibold">Allowed Tools</Label>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono">
                                {activeFrameworkMeta.shortLabel} ({frameworkAllowedTools.length})
                              </Badge>
                              {currentSkillTools.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 font-mono text-primary">
                                  {currentSkillTools.length} enabled
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-xs">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => autoInferToolsForSkill(index)}
                                className="h-6 text-[10px] px-2 text-primary border-primary/30 hover:bg-primary/10 gap-1"
                              >
                                <Sparkles className="h-3 w-3" /> Auto-Assign ({inferred.tools.length})
                              </Button>
                              <span className="text-muted-foreground/30">•</span>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="xs" 
                                onClick={() => selectAllFrameworkTools(index)}
                                className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                              >
                                All {activeFrameworkMeta.shortLabel}
                              </Button>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="xs" 
                                onClick={() => clearSkillTools(index)}
                                className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-destructive"
                              >
                                Clear
                              </Button>
                            </div>
                          </div>

                          {unsupportedTools.length > 0 && !showAllTools && (
                            <div className="flex items-center justify-between p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                              <span className="flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {unsupportedTools.length} tool(s) not in {activeFrameworkMeta.shortLabel}: {unsupportedTools.join(', ')}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => pruneUnsupportedTools(index)}
                                className="h-5 text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300"
                              >
                                Prune
                              </Button>
                            </div>
                          )}

                          <TooltipProvider delayDuration={200}>
                            <div className="flex flex-wrap gap-1.5 p-3 border rounded-md bg-muted/30 max-h-48 overflow-y-auto">
                              {displayTools.map(tool => {
                                const isSupportedByHarness = frameworkAllowedTools.includes(tool);
                                const isChecked = currentSkillTools.includes(tool);
                                const toolEntry = TOOL_MATRIX.find(t => t.framework === activeFramework && t.name === tool);
                                const toolDesc = toolEntry?.functionDesc || TOOL_DESCRIPTIONS[tool] || 'Framework tool capability';

                                return (
                                  <Tooltip key={tool}>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={cn(
                                          "flex items-center space-x-1.5 px-2 py-1 rounded-sm border transition-colors cursor-pointer select-none text-xs",
                                          isChecked 
                                            ? "bg-primary/10 border-primary/40 text-foreground font-medium" 
                                            : "bg-background border-border/60 text-muted-foreground hover:bg-muted/60",
                                          !isSupportedByHarness && "opacity-60 border-dashed"
                                        )}
                                        onClick={() => toggleSkillTool(index, tool)}
                                      >
                                        <Checkbox 
                                          id={`skill-${index}-tool-${tool}`}
                                          checked={isChecked}
                                          onCheckedChange={() => toggleSkillTool(index, tool)}
                                          className="h-3.5 w-3.5"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <label 
                                          htmlFor={`skill-${index}-tool-${tool}`} 
                                          className="text-[11px] font-mono cursor-pointer select-none leading-none"
                                        >
                                          {tool}
                                        </label>
                                        {!isSupportedByHarness && (
                                          <span className="text-[9px] text-amber-500 font-sans ml-1">
                                            (external)
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                                      <p className="font-semibold font-mono text-primary">{tool}</p>
                                      <p className="text-foreground/90">{toolDesc}</p>
                                      {toolEntry?.permissions && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t">
                                          <Shield className="h-3 w-3 text-amber-500" />
                                          <span>{toolEntry.permissions}</span>
                                        </div>
                                      )}
                                      {toolEntry?.circumstances && (
                                        <p className="text-[10px] text-muted-foreground italic">
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

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={`skill-instructions-${index}`}>Instructions</Label>
                            <GenerateImproveButton 
                              fieldValue={skill.instructions || ''}
                              fileType="skill-md"
                              fieldName={`Skill: ${skill.name || 'Skill'} Instructions`}
                              workspace={state}
                              onLoadingChange={(loading) => setSkillLoading(index, loading)}
                              onResult={(val) => {
                                handleSkillChange(index, 'instructions', val);
                                // If allowedTools was empty, auto-assign contextually inferred tools
                                if (!skill.allowedTools || skill.allowedTools.trim() === '') {
                                  const inf = inferFrameworkTools({
                                    name: skill.name,
                                    description: skill.description,
                                    category: skill.category,
                                    instructions: val,
                                    targetFramework: activeFramework
                                  });
                                  handleSkillChange(index, 'allowedTools', inf.tools.join(' '));
                                }
                              }}
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
                  );
                })}

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

      <ToolMatrixModal
        open={showMatrixModal}
        onOpenChange={setShowMatrixModal}
        defaultFramework={activeFramework}
      />
    </div>
  );
}
