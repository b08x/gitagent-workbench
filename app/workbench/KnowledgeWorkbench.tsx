import React, { useState, useMemo } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { KnowledgeEntry } from '../../lib/gitagent/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Database, 
  Upload, 
  Link as LinkIcon, 
  AlertTriangle, 
  Check, 
  Sliders,
  BookOpen,
  Info,
  Code2,
  Copy
} from 'lucide-react';
import yaml from 'js-yaml';
import { cn } from '@/lib/utils';

export function KnowledgeWorkbench() {
  const { state, dispatch } = useAgentWorkspace();
  const knowledge = state.knowledge || { documents: [] };
  const documents: KnowledgeEntry[] = knowledge.documents || [];

  const [selectedPath, setSelectedPath] = useState<string>(documents[0]?.path || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [isCreating, setIsCreating] = useState(false);

  // Selected document
  const activeDoc = documents.find(d => d.path === selectedPath) || documents[0];

  const tokenBudget = useMemo(() => {
    return documents
      .filter(doc => doc.always_load && doc.content)
      .reduce((acc, doc) => acc + (doc.content?.length || 0) / 4, 0);
  }, [documents]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => d.tags?.forEach(t => set.add(t)));
    return Array.from(set);
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchesSearch = d.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesTag = tagFilter === 'all' || (d.tags && d.tags.includes(tagFilter));
      return matchesSearch && matchesTag;
    });
  }, [documents, searchQuery, tagFilter]);

  const handleUpdateActiveDoc = (updates: Partial<KnowledgeEntry>) => {
    if (!activeDoc) return;
    const index = documents.findIndex(d => d.path === activeDoc.path);
    if (index === -1) return;
    const updated = [...documents];
    updated[index] = { ...updated[index], ...updates };
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { knowledge: { documents: updated } }
    });
    if (updates.path) {
      setSelectedPath(updates.path);
    }
  };

  const handleCreateDocument = () => {
    const newPath = `docs/guide-${Date.now().toString().slice(-4)}.md`;
    const newDoc: KnowledgeEntry = {
      path: newPath,
      description: 'Reference guide document for agent prompt injection',
      content: '# Knowledge Reference Document\n\nAdd domain expertise, product documentation, or API specifications here.',
      priority: 'medium',
      always_load: false,
      tags: ['reference']
    };
    const updated = [...documents, newDoc];
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { knowledge: { documents: updated } }
    });
    setSelectedPath(newPath);
    setIsCreating(false);
  };

  const handleDeleteDocument = (path: string) => {
    const updated = documents.filter(d => d.path !== path);
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { knowledge: { documents: updated } }
    });
    if (selectedPath === path && updated.length > 0) {
      setSelectedPath(updated[0].path);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-background text-foreground select-text">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-border/80 bg-card/60 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
            <Database className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-foreground">Knowledge Store</h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary px-1.5 py-0.2 bg-primary/10 rounded-sm">
                INJECTION
              </span>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">Reference documents & prompt injection budget</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Token Budget Gauge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-muted/40 border border-border/60 rounded-sm text-xs font-mono">
            <span className="text-muted-foreground">ALWAYS-LOAD BUDGET:</span>
            <span className={cn("font-bold", tokenBudget > 2000 ? "text-destructive" : "text-emerald-600")}>
              ~{Math.round(tokenBudget)} / 3,000 tok
            </span>
          </div>

          <Button 
            size="sm" 
            onClick={handleCreateDocument}
            className="bg-primary hover:bg-[#d96b43] text-primary-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs transition-all"
          >
            <Plus className="size-3.5" /> Add Document
          </Button>
        </div>
      </div>

      {/* 3-Pane Flex Layout */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* Left Pane (Master List, ~22% width, 250px) */}
        <div className="w-64 shrink-0 border-r border-border/80 bg-sidebar/50 flex flex-col overflow-hidden select-none">
          {/* Search & Tag Filter */}
          <div className="p-3 border-b border-border/60 space-y-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs font-sans rounded-sm bg-background border-border/80"
              />
            </div>

            {allTags.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setTagFilter('all')}
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm transition-colors shrink-0",
                    tagFilter === 'all' ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag)}
                    className={cn(
                      "text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm transition-colors shrink-0",
                      tagFilter === tag ? "bg-primary text-primary-foreground font-bold" : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Documents ({filteredDocs.length})
            </div>

            {filteredDocs.map((doc) => {
              const isActive = activeDoc?.path === doc.path;
              const estTokens = Math.round((doc.content?.length || 0) / 4);

              return (
                <div
                  key={doc.path}
                  onClick={() => setSelectedPath(doc.path)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-sm text-xs transition-all flex flex-col gap-1.5 cursor-pointer border group relative",
                    isActive
                      ? "bg-card border-primary/50 text-foreground shadow-xs"
                      : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs truncate max-w-[140px] text-foreground">{doc.path}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] font-mono px-1 py-0 uppercase",
                        doc.priority === 'high' ? "text-destructive border-destructive/30" : "text-primary border-primary/30"
                      )}
                    >
                      {doc.priority || 'med'}
                    </Badge>
                  </div>

                  {doc.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-relaxed">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[9px] font-mono text-muted-foreground">
                    <span>{doc.always_load ? "ALWAYS LOAD" : "DYNAMIC"}</span>
                    <span>~{estTokens} tok</span>
                  </div>
                </div>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="text-center py-8 px-4 text-muted-foreground text-xs">
                No knowledge documents match your query.
              </div>
            )}
          </div>

          {/* Quick Stats at bottom */}
          <div className="p-3 border-t border-border/80 bg-sidebar">
            <div className="text-[10px] font-mono text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>TOTAL DOCS:</span>
                <span className="font-bold text-foreground">{documents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>ALWAYS INJECTED:</span>
                <span className="font-bold text-primary">{documents.filter(d => d.always_load).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Pane (Primary Viewport, ~55% width) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
          {activeDoc ? (
            <>
              {/* Sticky Sub-Header */}
              <div className="px-5 py-3 border-b border-border/80 bg-card/40 flex items-center justify-between shrink-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span className="text-sm font-mono font-bold truncate text-foreground">{activeDoc.path}</span>
                    {activeDoc.always_load && (
                      <Badge variant="outline" className="text-[9px] font-mono uppercase text-warning border-warning/30 bg-warning/5">
                        Injected in System Prompt
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{activeDoc.description || 'No description provided'}</p>
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
                      Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* Document Editor / Preview Canvas */}
              <div className="flex-1 overflow-hidden p-5 flex flex-col">
                {viewMode === 'editor' ? (
                  <div className="flex-1 flex flex-col border border-border/80 rounded-md bg-card/60 overflow-hidden shadow-xs">
                    <div className="px-4 py-2 bg-muted/40 border-b border-border/80 flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase">
                      <span>Document Text Buffer</span>
                      <span>~{Math.round((activeDoc.content?.length || 0) / 4)} tokens</span>
                    </div>
                    <Textarea 
                      value={activeDoc.content || ''}
                      onChange={(e) => handleUpdateActiveDoc({ content: e.target.value })}
                      placeholder="# Document content here..."
                      className="flex-1 w-full resize-none font-mono text-xs leading-relaxed p-4 bg-transparent border-none focus-visible:ring-0 rounded-none selection:bg-primary/20"
                    />
                  </div>
                ) : (
                  <div className="flex-1 border border-border/80 rounded-md bg-card/60 overflow-y-auto p-6 shadow-xs">
                    <pre className="font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {activeDoc.content || 'Empty document.'}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div className="space-y-3">
                <BookOpen className="size-8 text-muted-foreground mx-auto" />
                <h3 className="font-bold text-sm">No Document Selected</h3>
                <p className="text-xs text-muted-foreground">Select a document from the left list or create a new one.</p>
                <Button size="sm" onClick={handleCreateDocument}>
                  <Plus className="size-3.5 mr-1.5" /> Add Document
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane (Inspector / Action Panel, ~23% width, 280px) */}
        {activeDoc && (
          <div className="w-72 shrink-0 border-l border-border/80 bg-card/40 flex flex-col overflow-hidden select-none">
            <div className="h-11 px-4 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Sliders className="size-3 text-primary" /> Document Settings
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold">File Path</Label>
                <Input 
                  value={activeDoc.path} 
                  onChange={(e) => handleUpdateActiveDoc({ path: e.target.value })}
                  placeholder="docs/reference.md"
                  className="h-8 text-xs font-mono rounded-sm bg-background border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold">Description</Label>
                <Textarea 
                  value={activeDoc.description || ''} 
                  onChange={(e) => handleUpdateActiveDoc({ description: e.target.value })}
                  placeholder="Summary of contents..."
                  className="min-h-[56px] text-xs resize-none rounded-sm bg-background border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold">Priority</Label>
                <Select 
                  value={activeDoc.priority || 'medium'} 
                  onValueChange={(val: any) => handleUpdateActiveDoc({ priority: val })}
                >
                  <SelectTrigger className="h-8 text-xs font-mono rounded-sm bg-background border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-sm bg-muted/40 border border-border/60">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Always Load</Label>
                  <p className="text-[10px] text-muted-foreground">Inject into system prompt</p>
                </div>
                <Switch 
                  checked={!!activeDoc.always_load} 
                  onCheckedChange={(checked) => handleUpdateActiveDoc({ always_load: checked })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold">Tags (comma-separated)</Label>
                <Input 
                  value={activeDoc.tags?.join(', ') || ''} 
                  onChange={(e) => handleUpdateActiveDoc({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  placeholder="guide, policy, api"
                  className="h-8 text-xs rounded-sm bg-background border-border/80"
                />
              </div>

              <div className="h-px bg-border/80" />

              {/* YAML index preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    Index Schema Preview
                  </span>
                  <Code2 className="size-3 text-muted-foreground" />
                </div>
                <div className="p-2.5 bg-muted/30 border border-border/60 rounded-sm overflow-x-auto">
                  <pre className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                    {yaml.dump({
                      path: activeDoc.path,
                      priority: activeDoc.priority,
                      always_load: activeDoc.always_load,
                      tags: activeDoc.tags
                    })}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button 
                  variant="outline"
                  className="w-full h-8 rounded-sm text-xs text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-2"
                  onClick={() => handleDeleteDocument(activeDoc.path)}
                >
                  <Trash2 className="size-3.5" /> Delete Document
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
