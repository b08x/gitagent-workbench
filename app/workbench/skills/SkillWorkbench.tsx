import React, { useState } from 'react';
import { useSkillWorkbench } from '../../context/SkillWorkbenchContext';
import { useAgentWorkspace } from '../../context/AgentContext';
import { SkillDefinition } from '../../../lib/gitagent/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Wand2, BookOpen, Code2, ListChecks, FileText, ChevronRight, Search, Download } from 'lucide-react';
import { SkillIdentityPanel } from './SkillIdentityPanel';
import { AllowedToolsSelector } from './AllowedToolsSelector';
import { InstructionsEditor } from './InstructionsEditor';
import { ReferencesManager } from './ReferencesManager';
import { ExamplesManager } from './ExamplesManager';
import { ScriptsPanel } from './ScriptsPanel';
import { SkillPreview } from './SkillPreview';
import { SkillImport } from './SkillImport';
import { ParsedSkill } from '../../../lib/gitagent/types';
import { cn } from '../../../lib/utils';

export function SkillWorkbench() {
  const { state, createSkill, updateSkill, setActiveSkill, deleteSkill } = useSkillWorkbench();
  const { dispatch: agentDispatch } = useAgentWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [topTab, setTopTab] = useState('my-skills');

  const activeSkill = state.skills.find(s => s.id === state.activeSkillId);

  const filteredSkills = state.skills.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      scripts: skill.scripts || []
    });

    agentDispatch({
      type: 'ADD_SKILL',
      payload: skill
    });

    setTopTab('my-skills');
    setActiveSkill(newId);
  };

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-4rem)] overflow-hidden flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skill Workbench</h1>
          <p className="text-muted-foreground">Author and manage standalone agent capabilities</p>
        </div>
        <Tabs value={topTab} onValueChange={setTopTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-skills">My Skills</TabsTrigger>
            <TabsTrigger value="create" onClick={() => { createSkill(); setTopTab('my-skills'); }}>Create</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={topTab} className="h-full">
          <TabsContent value="my-skills" className="h-full mt-0">
            <div className="grid grid-cols-12 gap-8 h-full">
              {/* Sidebar: Skill List */}
              <div className="col-span-3 flex flex-col gap-4 h-full border-r pr-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Skills</h2>
                  <Button size="sm" onClick={() => createSkill()}>
                    <Plus className="h-4 w-4 mr-2" /> New
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search skills..." 
                    className="pl-8"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredSkills.map(skill => (
                    <div
                      key={skill.id}
                      onClick={() => setActiveSkill(skill.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                        state.activeSkillId === skill.id ? "bg-accent border-primary" : "bg-card"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{skill.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{skill.description || 'No description'}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSkill(skill.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredSkills.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No skills found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content: Editor */}
              <div className="col-span-9 h-full overflow-y-auto pr-2 pb-8">
                {activeSkill ? (
                  <div className="space-y-8">
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
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="identity">Identity</TabsTrigger>
                        <TabsTrigger value="tools">Tools</TabsTrigger>
                        <TabsTrigger value="instructions">Instructions</TabsTrigger>
                        <TabsTrigger value="examples">Examples</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
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

                      <TabsContent value="preview" className="mt-6">
                        <SkillPreview skill={activeSkill} />
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-6 rounded-full bg-accent">
                      <Code2 className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Skill Workbench</h2>
                      <p className="text-muted-foreground max-w-md mx-auto mt-2">
                        Select a skill from the sidebar or create a new one to start authoring standalone capabilities.
                      </p>
                    </div>
                    <Button onClick={() => createSkill()}>
                      <Plus className="h-4 w-4 mr-2" /> Create Your First Skill
                    </Button>
                  </div>
                )}
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
