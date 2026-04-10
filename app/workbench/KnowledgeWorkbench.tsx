import React, { useState, useMemo } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { KnowledgeIndex, KnowledgeEntry } from '../../lib/gitagent/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Eye, 
  Edit3, 
  Tag, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronRight,
  Search,
  BookOpen,
  Database,
  Upload,
  Link as LinkIcon,
  X
} from 'lucide-react';
import yaml from 'js-yaml';
import { cn } from '@/lib/utils';

export function KnowledgeWorkbench() {
  const { state, dispatch } = useAgentWorkspace();
  const [isAdding, setIsAdding] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<KnowledgeEntry | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const knowledge = state.knowledge || { documents: [] };
  const documents = knowledge.documents;

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => 
      doc.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [documents, searchQuery]);

  const tokenBudget = useMemo(() => {
    return documents
      .filter(doc => doc.always_load && doc.content)
      .reduce((acc, doc) => acc + (doc.content?.length || 0) / 4, 0);
  }, [documents]);

  const budgetColor = tokenBudget > 2000 ? 'bg-destructive' : tokenBudget > 500 ? 'bg-amber-500' : 'bg-emerald-500';

  const handleAddDocument = (newDoc: KnowledgeEntry) => {
    const updatedDocs = [...documents, newDoc];
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { knowledge: { documents: updatedDocs } }
    });
    setIsAdding(false);
  };

  const handleUpdateDocument = (index: number, updates: Partial<KnowledgeEntry>) => {
    const updatedDocs = [...documents];
    updatedDocs[index] = { ...updatedDocs[index], ...updates };
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { knowledge: { documents: updatedDocs } }
    });
  };

  const handleRemoveDocument = (index: number) => {
    const updatedDocs = documents.filter((_, i) => i !== index);
    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: { knowledge: { documents: updatedDocs } }
    });
    if (previewDoc === documents[index]) {
      setPreviewDoc(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Knowledge Tree
          </h1>
          <p className="text-muted-foreground">Manage reference documents and prompt injection strategy.</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Document
          </Button>
        )}
      </div>

      {/* Token Budget Bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Prompt Injection Budget</span>
            </div>
            <span className={cn("font-bold", tokenBudget > 2000 ? "text-destructive" : tokenBudget > 500 ? "text-amber-600" : "text-emerald-600")}>
              ~{Math.round(tokenBudget)} tokens injected per session
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500", budgetColor)} 
              style={{ width: `${Math.min(100, (tokenBudget / 3000) * 100)}%` }}
            />
          </div>
          {tokenBudget > 2000 && (
            <p className="text-[10px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Warning: High token overhead. Consider reducing "Always Load" documents.
            </p>
          )}
        </CardContent>
      </Card>

      {isAdding && (
        <AddDocumentPanel 
          onAdd={handleAddDocument} 
          onCancel={() => setIsAdding(false)} 
        />
      )}

      {previewDoc && (
        <DocumentPreviewPanel 
          doc={previewDoc} 
          isEditing={isEditingPreview}
          onClose={() => {
            setPreviewDoc(null);
            setIsEditingPreview(false);
          }}
          onUpdate={(updates) => {
            const index = documents.indexOf(previewDoc);
            handleUpdateDocument(index, updates);
            setPreviewDoc({ ...previewDoc, ...updates });
          }}
          onToggleEdit={() => setIsEditingPreview(!isEditingPreview)}
        />
      )}

      {documents.length === 0 && !isAdding ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl space-y-4">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">No knowledge documents</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Knowledge documents give your agent access to reference material. 
              Documents marked 'Always Load' are injected into every system prompt.
            </p>
          </div>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents by path, description, or tags..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Path</th>
                  <th className="text-left p-4 font-medium">Tags</th>
                  <th className="text-left p-4 font-medium">Priority</th>
                  <th className="text-left p-4 font-medium">Always Load</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDocuments.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{doc.path}</span>
                        {doc.description && <span className="text-[10px] text-muted-foreground line-clamp-1">{doc.description}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {(!doc.tags || doc.tags.length === 0) && <span className="text-muted-foreground italic text-[10px]">None</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <Select 
                        value={doc.priority || 'medium'} 
                        onValueChange={(val: any) => handleUpdateDocument(idx, { priority: val })}
                      >
                        <SelectTrigger className={cn(
                          "h-7 w-24 text-[10px] font-bold uppercase",
                          doc.priority === 'high' ? "text-amber-600 border-amber-200 bg-amber-50" :
                          doc.priority === 'low' ? "text-muted-foreground border-muted bg-muted/20" :
                          "text-blue-600 border-blue-200 bg-blue-50"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={doc.always_load} 
                          onCheckedChange={(val) => handleUpdateDocument(idx, { always_load: val })}
                        />
                        {doc.always_load && doc.content && (
                          <span className="text-[10px] text-amber-600 font-medium animate-in fade-in">
                            ~{Math.round(doc.content.length / 4)} tokens
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {doc.content ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">
                          Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-muted bg-muted/20 text-[10px]">
                          Path only
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setPreviewDoc(doc);
                            setIsEditingPreview(false);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => {
                            setPreviewDoc(doc);
                            setIsEditingPreview(true);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveDocument(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            knowledge/index.yaml Preview
          </h3>
        </div>
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <pre className="text-xs font-mono leading-relaxed">
              {yaml.dump({
                documents: documents.map(({ content, ...rest }) => rest)
              }, { indent: 2 })}
            </pre>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AddDocumentPanel({ onAdd, onCancel }: { onAdd: (doc: KnowledgeEntry) => void; onCancel: () => void }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [alwaysLoad, setAlwaysLoad] = useState(false);

  const isValidPath = useMemo(() => {
    if (!path) return false;
    if (path.startsWith('/') || path.includes('..')) return false;
    if (activeTab === 'upload') {
      return /\.(md|txt|yaml|json|csv)$/.test(path);
    }
    return true;
  }, [path, activeTab]);

  const handleAdd = () => {
    if (!isValidPath) return;

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    
    onAdd({
      path,
      tags,
      priority,
      always_load: alwaysLoad,
      description: description || undefined,
      content: activeTab === 'upload' ? content : undefined
    });
  };

  return (
    <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top-4 duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Add Knowledge Document</CardTitle>
        <CardDescription>Configure how this document is indexed and used by the agent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" /> Upload / Paste
            </TabsTrigger>
            <TabsTrigger value="path" className="gap-2">
              <LinkIcon className="h-4 w-4" /> Path Only
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doc-path">File Path</Label>
                <Input 
                  id="doc-path"
                  placeholder={activeTab === 'upload' ? "reference.md" : "external-doc.pdf"}
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className={cn(!isValidPath && path && "border-destructive focus-visible:ring-destructive")}
                />
                <p className="text-[10px] text-muted-foreground">
                  {activeTab === 'upload' 
                    ? "Must end in .md, .txt, .yaml, .json, or .csv" 
                    : "Relative to knowledge/ (e.g. docs/guide.pdf)"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-tags">Tags</Label>
                <Input 
                  id="doc-tags"
                  placeholder="tag1, tag2, tag3"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border rounded-md p-3 bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="doc-always">Always Load</Label>
                  <p className="text-[10px] text-muted-foreground">Inject into every system prompt</p>
                </div>
                <Switch id="doc-always" checked={alwaysLoad} onCheckedChange={setAlwaysLoad} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-desc">Description (Optional)</Label>
              <Input 
                id="doc-desc"
                placeholder="Briefly describe what this document contains..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {activeTab === 'upload' && (
              <div className="space-y-2">
                <Label htmlFor="doc-content">Document Content</Label>
                <Textarea 
                  id="doc-content"
                  placeholder="Paste markdown, text, or JSON content here..."
                  className="min-h-[200px] font-mono text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-muted-foreground">
                    Estimated tokens: {Math.round(content.length / 4)}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'path' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Note:</strong> Path-only references are not included in the generated ZIP. 
                  You must manually place the file at <code>knowledge/{path}</code> after extracting the agent.
                </p>
              </div>
            )}
          </div>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!isValidPath || (activeTab === 'upload' && !content)}>
            {activeTab === 'upload' ? 'Add Document' : 'Add Reference'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentPreviewPanel({ 
  doc, 
  isEditing, 
  onClose, 
  onUpdate, 
  onToggleEdit 
}: { 
  doc: KnowledgeEntry; 
  isEditing: boolean; 
  onClose: () => void; 
  onUpdate: (updates: Partial<KnowledgeEntry>) => void;
  onToggleEdit: () => void;
}) {
  const [editContent, setEditContent] = useState(doc.content || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="border-b flex flex-row items-center justify-between py-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {doc.path}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase">{doc.priority || 'medium'}</Badge>
              {doc.always_load && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">Always Load</Badge>}
              {doc.tags?.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
          {doc.content !== undefined ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between px-6 py-2 bg-muted/30 border-b">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {isEditing ? 'Editing Content' : 'Read-only Preview'}
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleEdit}>
                  {isEditing ? 'Cancel Edit' : 'Edit Content'}
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {isEditing ? (
                  <Textarea 
                    className="w-full h-full min-h-[400px] font-mono text-sm leading-relaxed focus-visible:ring-0 border-none resize-none p-0"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                ) : (
                  <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                    {doc.content}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="bg-muted p-4 rounded-full">
                <LinkIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No content stored</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  This is a path-only reference. The content is expected to be provided manually in the <code>knowledge/</code> directory.
                </p>
              </div>
              <Button variant="outline" onClick={() => {
                onUpdate({ content: '' });
                onToggleEdit();
              }}>
                Add Content Now
              </Button>
            </div>
          )}
        </CardContent>
        {isEditing && (
          <div className="p-4 border-t flex justify-end gap-3 bg-muted/10">
            <Button variant="ghost" onClick={onToggleEdit}>Discard Changes</Button>
            <Button onClick={() => {
              onUpdate({ content: editContent });
              onToggleEdit();
            }}>Save Content</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
