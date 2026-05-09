import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Save, 
  Wand2, 
  Copy, 
  Search, 
  Terminal, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle as SelectIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAgentWorkspace } from '../context/AgentContext';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
}

export function PromptWorkbench() {
  const { state, dispatch } = useAgentWorkspace();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      id: '1',
      name: 'System Prompt: Data Analyst',
      description: 'Optimized for processing structured data and generating visualizations.',
      content: 'You are an expert Data Analyst...',
      tags: ['system', 'data']
    },
    {
      id: '2',
      name: 'Persona: Helpful Assistant',
      description: 'A friendly and concise assistant.',
      content: 'You are a helpful and friendly assistant...',
      tags: ['persona']
    }
  ]);
  const [activePromptId, setActivePromptId] = useState<string | null>(null);

  const activePrompt = prompts.find(p => p.id === activePromptId);

  const createPrompt = () => {
    const newPrompt: PromptTemplate = {
      id: Math.random().toString(36).substring(7),
      name: 'New Prompt',
      description: 'Provide a short description',
      content: '',
      tags: []
    };
    setPrompts([...prompts, newPrompt]);
    setActivePromptId(newPrompt.id);
  };

  const updatePrompt = (id: string, updates: Partial<PromptTemplate>) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePrompt = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
    if (activePromptId === id) setActivePromptId(null);
  };

  const applyToAgent = () => {
    if (!activePrompt) return;
    dispatch({
      type: 'SET_FILE',
      payload: { path: 'PROMPT.md', content: activePrompt.content }
    });
    // Also update soul if it's a persona? Or maybe just prompt_md
    dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { prompt_md: activePrompt.content }
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Workbench</h1>
          <p className="text-muted-foreground">Manage and refine your agent's core instructions</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={createPrompt}>
                <Plus className="h-4 w-4 mr-2" /> Create Prompt
            </Button>
        </div>
      </div>

      <div className="flex-1">
        {activePrompt ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Button variant="ghost" size="sm" onClick={() => setActivePromptId(null)} className="h-8 -ml-2 text-muted-foreground hover:text-foreground">
               <ArrowRight className="h-4 w-4 mr-2 rotate-180" /> Back to Gallery
            </Button>
            
            <Card className="border shadow-none flex flex-col overflow-hidden">
                <CardHeader className="px-0 pt-0 pb-6 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                          <Input 
                            value={activePrompt.name} 
                            onChange={e => updatePrompt(activePrompt.id, { name: e.target.value })}
                            className="text-2xl font-bold h-auto p-0 border-none focus-visible:ring-0 w-[400px]"
                          />
                      </div>
                      <Input 
                            value={activePrompt.description} 
                            onChange={e => updatePrompt(activePrompt.id, { description: e.target.value })}
                            className="text-muted-foreground h-auto p-0 border-none focus-visible:ring-0 text-sm"
                          />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={applyToAgent}>
                        <SelectIcon className="h-4 w-4 mr-2" /> Use for Agent
                      </Button>
                      <Button size="sm">
                        <Save className="h-4 w-4 mr-2" /> Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-0 flex-1 overflow-hidden flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">System Prompt</Badge>
                        <Badge variant="outline">v1.2</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 gap-2">
                              <Wand2 className="h-3.5 w-3.5" /> Improve
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 gap-2">
                              <Sparkles className="h-3.5 w-3.5" /> Generate from Context
                          </Button>
                      </div>
                  </div>
                  <div className="flex-1 relative">
                    <Textarea 
                      value={activePrompt.content}
                      onChange={e => updatePrompt(activePrompt.id, { content: e.target.value })}
                      placeholder="# Prompt Instructions..."
                      className="h-full resize-none font-mono text-sm leading-relaxed p-6"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prompts.map(p => (
                      <Card 
                        key={p.id} 
                        className="group hover:border-primary/50 cursor-pointer transition-all hover:shadow-md h-40 flex flex-col"
                        onClick={() => setActivePromptId(p.id)}
                      >
                         <CardHeader className="p-4 pb-0">
                           <div className="flex items-center justify-between">
                              <CardTitle className="text-base truncate">{p.name}</CardTitle>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePrompt(p.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                           </div>
                         </CardHeader>
                         <CardContent className="p-4 flex-1">
                            <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
                         </CardContent>
                      </Card>
                    ))}
                    <Card 
                      className="border-dashed hover:bg-accent hover:border-primary/50 cursor-pointer transition-all flex flex-col items-center justify-center p-6 h-40 text-center gap-2"
                      onClick={createPrompt}
                    >
                       <Plus className="h-8 w-8 text-muted-foreground" />
                       <span className="font-medium text-muted-foreground">Create Branch</span>
                    </Card>
                 </div>
              </div>
            )}
        </div>
    </div>
  );
}
