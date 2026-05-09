import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Wand2, BookOpen, Code2, ListChecks, FileText, ChevronRight, Search, Download, ArrowRight } from 'lucide-react';
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
import { ParsedSkill } from '../../../lib/gitagent/types';
import { cn } from '../../../lib/utils';

export function SkillWorkbench() {
  const { state, createSkill, updateSkill, setActiveSkill, deleteSkill } = useSkillWorkbench();
  const { dispatch: agentDispatch } = useAgentWorkspace();
  const [topTab, setTopTab] = useState('my-skills');

  const activeSkill = state.skills.find(s => s.id === state.activeSkillId);

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
    <div className="container mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Workbench</h1>
          <p className="text-muted-foreground">Author and manage standalone agent capabilities</p>
        </div>
        <Tabs value={topTab} onValueChange={setTopTab} className="w-[500px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-skills">My Skills</TabsTrigger>
            <TabsTrigger value="blueprints">Blueprints</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1">
        <Tabs value={topTab}>
          <TabsContent value="my-skills" className="mt-0">
            <div className="space-y-6">
              {activeSkill ? (
                 <div className="animate-in fade-in duration-300 space-y-6">
                    <Button variant="ghost" size="sm" onClick={() => setActiveSkill(null)} className="h-8 -ml-2 text-muted-foreground hover:text-foreground">
                      <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back to Skills
                    </Button>

                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold tracking-tight">{activeSkill.name}</h2>
                        <p className="text-muted-foreground">Editing skill definition</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleAddSkillToAgent}>
                          Add to Current Agent
                        </Button>
                        <Button>
                          <Save className="h-4 w-4 mr-2" /> Save Changes
                        </Button>
                      </div>
                    </div>

                    <Tabs defaultValue="identity" className="w-full">
                      <TabsList className="grid w-full grid-cols-8">
                        <TabsTrigger value="identity">Identity</TabsTrigger>
                        <TabsTrigger value="tools">Tools</TabsTrigger>
                        <TabsTrigger value="instructions">Instructions</TabsTrigger>
                        <TabsTrigger value="examples">Examples</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                        <TabsTrigger value="assets">Assets</TabsTrigger>
                        <TabsTrigger value="workflows">Workflows</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>

                      <TabsContent value="identity" className="mt-6">
                        <SkillIdentityPanel skill={activeSkill} />
                      </TabsContent>

                      <TabsContent value="tools" className="mt-6">
                        <AllowedToolsSelector skill={activeSkill} />
                      </TabsContent>

                      <TabsContent value="instructions" className="mt-6">
                        <InstructionsEditor skill={activeSkill} />
                      </TabsContent>

                      <TabsContent value="examples" className="mt-6">
                        <ExamplesManager skill={activeSkill} />
                      </TabsContent>

                      <TabsContent value="resources" className="mt-6">
                        <div className="grid gap-8">
                          <ReferencesManager skill={activeSkill} />
                          <ScriptsPanel skill={activeSkill} />
                        </div>
                      </TabsContent>

                      <TabsContent value="assets" className="mt-6">
                        <AssetsManager skill={activeSkill} />
                      </TabsContent>

                      <TabsContent value="workflows" className="mt-6">
                        <WorkflowsManager skill={activeSkill} />
                      </TabsContent>

                      <TabsContent value="preview" className="mt-6">
                        <SkillPreview skill={activeSkill} />
                      </TabsContent>
                    </Tabs>
                 </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {state.skills.map(skill => (
                      <Card 
                        key={skill.id} 
                        className="group hover:border-primary/50 cursor-pointer transition-all hover:shadow-md h-40 flex flex-col"
                        onClick={() => setActiveSkill(skill.id)}
                      >
                         <CardHeader className="p-4 pb-0">
                           <div className="flex items-center justify-between">
                              <CardTitle className="text-base truncate">{skill.name}</CardTitle>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSkill(skill.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                           </div>
                         </CardHeader>
                         <CardContent className="p-4 flex-1">
                            <p className="text-sm text-muted-foreground line-clamp-3">{skill.description || 'No description'}</p>
                         </CardContent>
                      </Card>
                    ))}
                    <Card 
                      className="border-dashed hover:bg-accent hover:border-primary/50 cursor-pointer transition-all flex flex-col items-center justify-center p-6 h-40 text-center gap-2"
                      onClick={() => createSkill()}
                    >
                       <Plus className="h-8 w-8 text-muted-foreground" />
                       <span className="font-medium text-muted-foreground">Create Skill</span>
                    </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="blueprints" className="h-full mt-0">
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-8 rounded-full bg-primary/5">
                <BookOpen className="h-16 w-16 text-primary/40" />
              </div>
              <div className="max-w-md space-y-2">
                <h2 className="text-2xl font-bold">RAG Blueprints</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Future Capability: This section will connect to a vector-backed RAG store. 
                  You will be able to search and retrieve skill blueprints to bootstrap new agent capabilities.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="opacity-50 cursor-not-allowed">Connect Vector DB</Button>
                <Button variant="outline" className="opacity-50 cursor-not-allowed">Index Skills</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="h-full mt-0">
            <SkillImport onImport={handleImportSkill} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
