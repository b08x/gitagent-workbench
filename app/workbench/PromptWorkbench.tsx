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
  const [searchQuery, setSearchQuery] = useState('');

  const activePrompt = prompts.find(p => p.id === activePromptId);

  const filteredPrompts = prompts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-4rem)] overflow-hidden flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Workbench</h1>
          <p className="text-muted-foreground">Manage and refine your agent's core instructions</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActivePromptId(null)}>
                <Search className="h-4 w-4 mr-2" /> Gallery
            </Button>
            <Button onClick={createPrompt}>
                <Plus className="h-4 w-4 mr-2" /> New Prompt
            </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-12 gap-8 h-full">
          {/* Sidebar */}
          <div className="col-span-3 flex flex-col gap-4 h-full border-r pr-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search prompts..." 
                className="pl-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredPrompts.map(p => (
                <div
                  key={p.id}
                  onClick={() => setActivePromptId(p.id)}
                  className={cn(
                    "group flex flex-col p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent",
                    activePromptId === p.id ? "bg-accent border-primary" : "bg-card"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium truncate">{p.name}</p>
                    <Trash2 
                      className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePrompt(p.id);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Main Editor */}
          <div className="col-span-9 h-full overflow-hidden flex flex-col">
            {activePrompt ? (
              <Card className="h-full border-0 shadow-none flex flex-col overflow-hidden">
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
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                <div className="space-y-2">
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Terminal className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Instruction Library</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Select a core instruction set to refine, or create a new one. 
                    You can generate prompts based on your agent's goals.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                    <Card className="hover:bg-accent cursor-pointer transition-colors" onClick={createPrompt}>
                        <CardContent className="p-6 flex flex-col items-center gap-2">
                            <Plus className="h-6 w-6 text-primary" />
                            <p className="font-bold">Blank Template</p>
                            <p className="text-xs text-muted-foreground text-center">Start from scratch</p>
                        </CardContent>
                    </Card>
                    <Card className="hover:bg-accent cursor-pointer transition-colors">
                        <CardContent className="p-6 flex flex-col items-center gap-2 opacity-50">
                            <Sparkles className="h-6 w-6 text-purple-500" />
                            <p className="font-bold">Auto-Generate</p>
                            <p className="text-xs text-muted-foreground text-center">Using Gemini Flash</p>
                        </CardContent>
                    </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
