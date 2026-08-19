import React, { useState, useMemo } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Save, 
  Wand2, 
  Copy, 
  Search, 
  Terminal, 
  Sparkles, 
  Check, 
  Sliders, 
  CheckCircle2,
  FileCode,
  Tag,
  Code2,
  Cpu
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'system' | 'persona' | 'task' | 'guardrail';
  targetSlot: 'PROMPT.md' | 'SOUL.md' | 'RULES.md' | 'CUSTOM';
  tags: string[];
  version: string;
}

export function PromptWorkbench() {
  const { state, dispatch } = useAgentWorkspace();

  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      id: 'p-1',
      name: 'Senior TypeScript & React Architect',
      description: 'Strict TypeScript guidelines, modular component patterns, and state minimization rules.',
      content: `# Senior TypeScript & React Architect\n\nYou are a senior frontend software engineer specializing in React 19, TypeScript, and modern component architecture.\n\n## Core Principles\n- Always write strict TypeScript types without any implicit 'any'.\n- Prefer functional components and custom hooks.\n- Never perform destructive operations without confirmation.\n- Maintain clean semantic CSS tokens and responsive flexbox/grid containers.`,
      category: 'system',
      targetSlot: 'PROMPT.md',
      tags: ['typescript', 'react', 'frontend'],
      version: '1.2.0'
    },
    {
      id: 'p-2',
      name: 'Security & Policy Guardrail Enforcer',
      description: 'Audits LLM outputs for confidentiality, data leaks, and compliance constraints.',
      content: `## MUST ALWAYS\n- Verify input authorization boundaries before executing tool commands.\n- Mask sensitive PII and API keys in all logs and outputs.\n\n## MUST NEVER\n- Execute unverified shell scripts with root/sudo privileges.\n- Output raw session tokens or secret keys.`,
      category: 'guardrail',
      targetSlot: 'RULES.md',
      tags: ['security', 'compliance'],
      version: '1.0.0'
    },
    {
      id: 'p-3',
      name: 'Technical Research & Summary Analyst',
      description: 'Structured methodology for parsing documents, generating citations, and structuring reports.',
      content: `## Objective\nAnalyze provided reference material and synthesize high-density technical summaries with explicit citations.\n\n## Output Format\n1. Executive Summary (Max 3 bullet points)\n2. Key Findings & Architecture Decisions\n3. Source Evidence Index`,
      category: 'task',
      targetSlot: 'SOUL.md',
      tags: ['research', 'summary'],
      version: '1.1.0'
    }
  ]);

  const [activePromptId, setActivePromptId] = useState<string>('p-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  const activePrompt = prompts.find(p => p.id === activePromptId) || prompts[0];

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [prompts, searchQuery, categoryFilter]);

  const activeTokenCount = Math.round((activePrompt?.content?.length || 0) / 4);

  const handleCreatePrompt = () => {
    const newId = `p-${Date.now()}`;
    const newPrompt: PromptTemplate = {
      id: newId,
      name: 'New Prompt Template',
      description: 'Describe the intended purpose and constraints for this prompt',
      content: '# New Prompt Template\n\nEnter prompt instructions here...',
      category: 'system',
      targetSlot: 'PROMPT.md',
      tags: ['draft'],
      version: '1.0.0'
    };
    setPrompts([newPrompt, ...prompts]);
    setActivePromptId(newId);
  };

  const updateActivePrompt = (updates: Partial<PromptTemplate>) => {
    setPrompts(prompts.map(p => p.id === activePrompt.id ? { ...p, ...updates } : p));
  };

  const handleDeletePrompt = (id: string) => {
    const remaining = prompts.filter(p => p.id !== id);
    setPrompts(remaining);
    if (activePromptId === id && remaining.length > 0) {
      setActivePromptId(remaining[0].id);
    }
  };

  const handleCopy = () => {
    if (!activePrompt) return;
    navigator.clipboard.writeText(activePrompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToAgent = () => {
    if (!activePrompt) return;
    if (activePrompt.targetSlot === 'PROMPT.md') {
      dispatch({ type: 'SET_FILE', payload: { path: 'PROMPT.md', content: activePrompt.content } });
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { prompt_md: activePrompt.content } });
    } else if (activePrompt.targetSlot === 'SOUL.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { soul: activePrompt.content } });
    } else if (activePrompt.targetSlot === 'RULES.md') {
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { rules: activePrompt.content } });
    }
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-background text-foreground select-text">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border/80 bg-card/60 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <Terminal className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-foreground">Prompt Workbench</h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary px-1.5 py-0.2 bg-primary/10 rounded-sm">
                TEMPLATES
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Versioned system prompt authoring & compilation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={handleCreatePrompt}
            className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs transition-all"
          >
            <Plus className="size-3.5" /> New Prompt
          </Button>
        </div>
      </div>

      {/* 3-Pane Flex Layout */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* Left Pane (Master List, ~22% width, 250px min) */}
        <div className="w-64 shrink-0 border-r border-border/80 bg-sidebar/50 flex flex-col overflow-hidden select-none">
          {/* Search & Category Filter */}
          <div className="p-3 border-b border-border/60 space-y-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs font-sans rounded-sm bg-background border-border/80"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {['all', 'system', 'persona', 'task', 'guardrail'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm transition-colors shrink-0",
                    categoryFilter === cat 
                      ? "bg-primary text-primary-foreground font-bold" 
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Templates ({filteredPrompts.length})
            </div>

            {filteredPrompts.map((p) => {
              const isActive = activePrompt?.id === p.id;
              const estTokens = Math.round(p.content.length / 4);

              return (
                <div
                  key={p.id}
                  onClick={() => setActivePromptId(p.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-sm text-xs transition-all flex flex-col gap-1.5 cursor-pointer border group relative",
                    isActive
                      ? "bg-card border-primary/50 text-foreground shadow-xs"
                      : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate max-w-[140px] text-foreground">{p.name}</span>
                    <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 uppercase text-primary border-primary/30">
                      {p.version}
                    </Badge>
                  </div>

                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[9px] font-mono text-muted-foreground">
                    <span className="uppercase">{p.category}</span>
                    <span>~{estTokens} tok</span>
                  </div>
                </div>
              );
            })}

            {filteredPrompts.length === 0 && (
              <div className="text-center py-8 px-4 text-muted-foreground text-xs">
                No matching prompt templates found.
              </div>
            )}
          </div>
        </div>

        {/* Center Pane (Primary Viewport, ~55% width) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          {/* Center Sticky Header */}
          <div className="px-5 py-3 border-b border-border/80 bg-card/40 flex items-center justify-between shrink-0">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <Input 
                  value={activePrompt?.name || ''} 
                  onChange={(e) => updateActivePrompt({ name: e.target.value })}
                  className="h-7 text-sm font-bold bg-transparent border-none p-0 focus-visible:ring-0 w-auto min-w-[200px]"
                />
                <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                  {activePrompt?.targetSlot}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{activePrompt?.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-sm bg-muted/60 p-0.5 border border-border/60">
                <button
                  onClick={() => setViewMode('editor')}
                  className={cn("px-2.5 py-1 text-[10px] font-mono uppercase rounded-xs font-semibold", viewMode === 'editor' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  Editor
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn("px-2.5 py-1 text-[10px] font-mono uppercase rounded-xs font-semibold", viewMode === 'preview' ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  Markdown
                </button>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopy}
                className="gap-1.5 text-xs font-mono"
              >
                {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Center Editor / Canvas Body */}
          <div className="flex-1 overflow-hidden p-5 flex flex-col">
            {viewMode === 'editor' ? (
              <div className="flex-1 flex flex-col border border-border/80 rounded-md bg-card/60 overflow-hidden shadow-xs">
                <div className="px-4 py-2 bg-muted/40 border-b border-border/80 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase">
                  <span>Prompt Raw Buffer</span>
                  <span>{activeTokenCount} tokens | {activePrompt?.content?.length || 0} chars</span>
                </div>
                <Textarea 
                  value={activePrompt?.content || ''}
                  onChange={(e) => updateActivePrompt({ content: e.target.value })}
                  placeholder="# System Prompt Instructions..."
                  className="flex-1 w-full resize-none font-mono text-xs leading-relaxed p-4 bg-transparent border-none focus-visible:ring-0 rounded-none selection:bg-primary/20"
                />
              </div>
            ) : (
              <div className="flex-1 border border-border/80 rounded-md bg-card/60 overflow-y-auto p-6 shadow-xs">
                <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {activePrompt?.content}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (Inspector / Action Panel, ~23% width, 280px) */}
        <div className="w-72 shrink-0 border-l border-border/80 bg-card/40 flex flex-col overflow-hidden select-none">
          <div className="h-11 px-4 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Sliders className="size-3 text-primary" /> Prompt Metadata
            </span>
            <Badge variant="outline" className="text-[9px] font-mono font-bold text-primary border-primary/20">
              v{activePrompt?.version}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Target Injection Slot</Label>
              <Select 
                value={activePrompt?.targetSlot || 'PROMPT.md'} 
                onValueChange={(val: any) => updateActivePrompt({ targetSlot: val })}
              >
                <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROMPT.md">PROMPT.md (Main Instructions)</SelectItem>
                  <SelectItem value="SOUL.md">SOUL.md (Persona & Identity)</SelectItem>
                  <SelectItem value="RULES.md">RULES.md (Must Always / Never)</SelectItem>
                  <SelectItem value="CUSTOM">Custom Module</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Category Classification</Label>
              <Select 
                value={activePrompt?.category || 'system'} 
                onValueChange={(val: any) => updateActivePrompt({ category: val })}
              >
                <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Core</SelectItem>
                  <SelectItem value="persona">Persona & Tone</SelectItem>
                  <SelectItem value="task">Task Specialist</SelectItem>
                  <SelectItem value="guardrail">Security Guardrail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Description</Label>
              <Textarea 
                value={activePrompt?.description || ''} 
                onChange={(e) => updateActivePrompt({ description: e.target.value })}
                placeholder="Explain the intent and scope of this template..."
                className="min-h-[60px] text-xs resize-none rounded-sm bg-background border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Semantic Tags</Label>
              <Input 
                value={activePrompt?.tags?.join(', ') || ''} 
                onChange={(e) => updateActivePrompt({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="tag1, tag2, tag3"
                className="h-8 text-xs rounded-sm bg-background border-border/80"
              />
            </div>

            <div className="h-px bg-border/80" />

            {/* Token impact estimate */}
            <div className="p-3 bg-muted/40 border border-border/60 rounded-sm space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">TOKEN COST:</span>
                <span className="font-bold text-primary">~{activeTokenCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">CONTEXT LOAD:</span>
                <span className="font-bold text-emerald-500">{(activeTokenCount / 1280).toFixed(2)}%</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <Button 
                className="w-full h-8.5 rounded-sm bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                onClick={handleApplyToAgent}
              >
                {applied ? <CheckCircle2 className="size-3.5" /> : <Save className="size-3.5" />}
                {applied ? "Applied to Workspace!" : `Apply to ${activePrompt?.targetSlot}`}
              </Button>

              <Button 
                variant="outline"
                className="w-full h-8 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-2"
                onClick={() => activePrompt && handleDeletePrompt(activePrompt.id)}
              >
                <Trash2 className="size-3.5" /> Delete Prompt
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
