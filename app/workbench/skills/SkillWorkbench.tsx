import React, { useState, useMemo } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillDefinition, ParsedSkill } from '../../../lib/gitagent/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Save, 
  Wand2, 
  BookOpen, 
  Code2, 
  ListChecks, 
  FileText, 
  ChevronRight, 
  Search, 
  Download, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Sliders, 
  Upload,
  Layers
} from 'lucide-react';
import { SkillIdentityPanel } from './SkillIdentityPanel';
import { AllowedToolsSelector } from './AllowedToolsSelector';
import { InstructionsEditor } from './InstructionsEditor';
import { ReferencesManager } from './ReferencesManager';
import { ExamplesManager } from './ExamplesManager';
import { ScriptsPanel } from './ScriptsPanel';
import { AssetsManager } from './AssetsManager';
import { WorkflowsManager } from './WorkflowsManager';
import { SkillPreview } from './SkillPreview';
import { SkillImport } from './SkillImport';
import { BlueprintsGallery } from './BlueprintsGallery';
import { cn } from '../../../lib/utils';

export function SkillWorkbench() {
  const { state, createSkill, updateSkill, setActiveSkill, deleteSkill } = useSkillWorkbench();
  const { dispatch: agentDispatch } = useAgentWorkspace();

  const [searchQuery, setSearchQuery] = useState('');
  const [topTab, setTopTab] = useState<'my-skills' | 'blueprints' | 'import'>('my-skills');
  const [skillSubTab, setSkillSubTab] = useState('identity');
  const [addedFeedback, setAddedFeedback] = useState(false);

  const activeSkill = state.skills.find(s => s.id === state.activeSkillId) || state.skills[0];

  const filteredSkills = useMemo(() => {
    return state.skills.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [state.skills, searchQuery]);

  const handleAddSkillToAgent = () => {
    if (!activeSkill) return;
    agentDispatch({
      type: 'ADD_SKILL',
      payload: {
        name: activeSkill.name,
        description: activeSkill.description,
        instructions: activeSkill.instructions,
        allowedTools: activeSkill.allowedTools,
        category: activeSkill.metadata.category || 'general',
        license: activeSkill.license,
        compatibility: activeSkill.compatibility,
        metadata: activeSkill.metadata,
        references: activeSkill.references,
        examples: activeSkill.examples,
        scripts: activeSkill.scripts
      }
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const handleImportSkill = (skill: ParsedSkill) => {
    const newId = createSkill();
    updateSkill(newId, {
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions || '',
      allowedTools: skill.allowedTools,
      license: skill.license || 'MIT',
      compatibility: skill.compatibility || '>=0.1.0',
      metadata: {
        author: (skill.metadata as any)?.author || '',
        version: (skill.metadata as any)?.version || '1.0.0',
        category: skill.category || 'general',
        ...skill.metadata
      },
      references: skill.references || [],
      examples: skill.examples || [],
      scripts: skill.scripts || [],
      assets: skill.assets || [],
      workflows: skill.workflows || []
    });

    agentDispatch({
      type: 'ADD_SKILL',
      payload: skill
    });

    setTopTab('my-skills');
    setActiveSkill(newId);
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-background text-foreground select-text">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border/80 bg-card/60 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <Zap className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-foreground">Skill Workbench</h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary px-1.5 py-0.2 bg-primary/10 rounded-sm">
                STANDALONE
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Modular tools, instructions & execution scripts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Top Level Mode Switcher */}
          <div className="flex items-center rounded-sm bg-muted/60 p-0.5 border border-border/60">
            <button
              onClick={() => setTopTab('my-skills')}
              className={cn("px-2.5 py-1 text-[10px] font-mono uppercase rounded-xs font-semibold", topTab === 'my-skills' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
            >
              My Skills ({state.skills.length})
            </button>
            <button
              onClick={() => setTopTab('blueprints')}
              className={cn("px-2.5 py-1 text-[10px] font-mono uppercase rounded-xs font-semibold", topTab === 'blueprints' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
            >
              Blueprints
            </button>
            <button
              onClick={() => setTopTab('import')}
              className={cn("px-2.5 py-1 text-[10px] font-mono uppercase rounded-xs font-semibold", topTab === 'import' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
            >
              Import
            </button>
          </div>

          {topTab === 'my-skills' && (
            <Button 
              size="sm" 
              onClick={() => {
                const id = createSkill();
                setActiveSkill(id);
              }}
              className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs transition-all"
            >
              <Plus className="size-3.5" /> New Skill
            </Button>
          )}
        </div>
      </div>

      {/* Main Area */}
      {topTab === 'blueprints' && (
        <div className="flex-1 overflow-y-auto p-6">
          <BlueprintsGallery onSelectBlueprint={(bp) => handleImportSkill(bp as any)} />
        </div>
      )}

      {topTab === 'import' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
          <SkillImport onImport={handleImportSkill} />
        </div>
      )}

      {topTab === 'my-skills' && (
        <div className="flex-1 flex flex-row overflow-hidden min-h-0">
          {/* Left Pane (Master List, ~22% width, 250px) */}
          <div className="w-64 shrink-0 border-r border-border/80 bg-sidebar/50 flex flex-col overflow-hidden select-none">
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs font-sans rounded-sm bg-background border-border/80"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                Authoring Skills ({filteredSkills.length})
              </div>

              {filteredSkills.map((s) => {
                const isActive = activeSkill?.id === s.id;
                const toolCount = s.allowedTools?.length || 0;

                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveSkill(s.id)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-sm text-xs transition-all flex flex-col gap-1.5 cursor-pointer border group relative",
                      isActive
                        ? "bg-card border-primary/50 text-foreground shadow-xs"
                        : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs truncate max-w-[140px] text-foreground">{s.name}</span>
                      <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 uppercase text-primary border-primary/30">
                        {s.metadata?.version || '1.0.0'}
                      </Badge>
                    </div>

                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {s.description || 'No description provided'}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[9px] font-mono text-muted-foreground">
                      <span className="uppercase">{s.metadata?.category || 'general'}</span>
                      <span>{toolCount} tools</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Pane (Primary Viewport, ~55% width) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
            {activeSkill ? (
              <>
                {/* Center Sub-Tabs Navigation */}
                <div className="px-5 py-2.5 border-b border-border/80 bg-card/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {[
                      { id: 'identity', label: 'Identity' },
                      { id: 'tools', label: `Tools (${activeSkill.allowedTools?.length || 0})` },
                      { id: 'instructions', label: 'Instructions' },
                      { id: 'examples', label: `Examples (${activeSkill.examples?.length || 0})` },
                      { id: 'resources', label: 'Resources' },
                      { id: 'workflows', label: 'Workflows' },
                      { id: 'preview', label: 'Preview' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setSkillSubTab(tab.id)}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-mono rounded-sm transition-colors uppercase font-medium",
                          skillSubTab === tab.id
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      size="xs" 
                      onClick={handleAddSkillToAgent}
                      className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-[10px] font-mono uppercase tracking-wider rounded-sm shadow-xs"
                    >
                      {addedFeedback ? <CheckCircle2 className="size-3 mr-1" /> : <Plus className="size-3 mr-1" />}
                      {addedFeedback ? "Attached!" : "Attach to Agent"}
                    </Button>
                  </div>
                </div>

                {/* Sub-Tab Content View */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6">
                  {skillSubTab === 'identity' && <SkillIdentityPanel skill={activeSkill} />}
                  {skillSubTab === 'tools' && <AllowedToolsSelector skill={activeSkill} />}
                  {skillSubTab === 'instructions' && <InstructionsEditor skill={activeSkill} />}
                  {skillSubTab === 'examples' && <ExamplesManager skill={activeSkill} />}
                  {skillSubTab === 'resources' && <ReferencesManager skill={activeSkill} />}
                  {skillSubTab === 'workflows' && <WorkflowsManager skill={activeSkill} />}
                  {skillSubTab === 'preview' && <SkillPreview skill={activeSkill} />}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div className="space-y-3">
                  <Zap className="size-8 text-muted-foreground mx-auto" />
                  <h3 className="font-bold text-sm">No Skill Selected</h3>
                  <p className="text-xs text-muted-foreground">Select a skill from the left list or create a new skill.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane (Inspector / Action Panel, ~23% width, 280px) */}
          {activeSkill && (
            <div className="w-72 shrink-0 border-l border-border/80 bg-card/40 flex flex-col overflow-hidden select-none">
              <div className="h-11 px-4 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="size-3 text-primary" /> Skill Inspector
                </span>
                <Badge variant="outline" className="text-[9px] font-mono font-bold text-primary border-primary/20">
                  {activeSkill.metadata?.category || 'general'}
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold">Skill Name</Label>
                  <Input 
                    value={activeSkill.name} 
                    onChange={(e) => updateSkill(activeSkill.id, { name: e.target.value })}
                    className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold">Description</Label>
                  <Input 
                    value={activeSkill.description} 
                    onChange={(e) => updateSkill(activeSkill.id, { description: e.target.value })}
                    className="h-8 text-xs rounded-sm bg-background border-border/80"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">License</Label>
                    <Input 
                      value={activeSkill.license || 'MIT'} 
                      onChange={(e) => updateSkill(activeSkill.id, { license: e.target.value })}
                      className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold">Version</Label>
                    <Input 
                      value={activeSkill.metadata?.version || '1.0.0'} 
                      onChange={(e) => updateSkill(activeSkill.id, { metadata: { ...activeSkill.metadata, version: e.target.value } })}
                      className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                    />
                  </div>
                </div>

                <div className="h-px bg-border/80" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">ALLOWED TOOLS:</span>
                    <span className="font-bold text-primary">{activeSkill.allowedTools?.length || 0}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activeSkill.allowedTools?.map(t => (
                      <Badge key={t} variant="secondary" className="text-[9px] font-mono px-1 py-0">
                        {t}
                      </Badge>
                    ))}
                    {(!activeSkill.allowedTools || activeSkill.allowedTools.length === 0) && (
                      <span className="text-[10px] text-muted-foreground italic">No tools restricted</span>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border/80" />

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <Button 
                    className="w-full h-8.5 rounded-sm bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                    onClick={handleAddSkillToAgent}
                  >
                    <Zap className="size-3.5" /> Attach to Agent Workspace
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full h-8 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-2"
                    onClick={() => deleteSkill(activeSkill.id)}
                  >
                    <Trash2 className="size-3.5" /> Delete Skill
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
