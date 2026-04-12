import React, { useState, useEffect, useCallback } from 'react';
import { ParsedSkill } from '../../../lib/gitagent/types';
import { parseSkillMd, resolveGitHubRawUrl } from '../../../lib/gitagent/parseSkillMd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Github, 
  Clipboard, 
  AlertTriangle, 
  CheckCircle2, 
  FileCode, 
  Globe, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillImportProps {
  onImport: (skill: ParsedSkill) => void;
}

export function SkillImport({ onImport }: SkillImportProps) {
  const [activeTab, setActiveTab] = useState('skillsmp');
  const [query, setQuery] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubSkillName, setGithubSkillName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof parseSkillMd> | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [showFullInstructions, setShowFullInstructions] = useState(false);

  // Debounce paste parsing
  useEffect(() => {
    if (activeTab !== 'paste' || !pasteContent.trim()) {
      if (activeTab === 'paste') setPreview(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = parseSkillMd(pasteContent);
      setPreview(result);
      if (result.skill.name) setManualName(result.skill.name);
      if (result.skill.description) setManualDesc(result.skill.description);
    }, 300);

    return () => clearTimeout(timer);
  }, [pasteContent, activeTab]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.skillsmmp.com/skills?q=${encodeURIComponent(query)}&limit=20`);
      if (!res.ok) throw new Error('CORS or API error');
      const data = await res.json();
      setResults(data.skills || []);
    } catch (err) {
      setError('SkillsMP API is not accessible from the browser in this context. Use GitHub import or paste the SKILL.md content directly.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGithub = async () => {
    const url = resolveGitHubRawUrl(githubUrl, githubSkillName);
    if (!url) {
      setError('Invalid GitHub URL or shorthand format.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const content = await res.text();
      const result = parseSkillMd(content);
      setPreview(result);
      if (result.skill.name) setManualName(result.skill.name);
      if (result.skill.description) setManualDesc(result.skill.description);
    } catch (err) {
      setError(`Could not fetch from GitHub. Resolved URL: ${url}. You may need to copy the raw content manually and use the Paste tab.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!preview) return;
    
    const name = (preview.skill.name || manualName || 'imported-skill')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');

    const skill: ParsedSkill = {
      name,
      description: preview.skill.description || manualDesc || '',
      instructions: preview.skill.instructions || '',
      allowedTools: preview.skill.allowedTools || [],
      license: preview.skill.license,
      compatibility: preview.skill.compatibility,
      category: preview.skill.category || 'general',
      references: [],
    };

    onImport(skill);
  };

  const renderPreview = () => {
    if (!preview) return null;

    const { skill, warnings, hasFrontmatter } = preview;
    const name = skill.name || manualName;
    const desc = skill.description || manualDesc;
    const instructions = skill.instructions || '';
    const previewText = instructions.slice(0, 400);
    const hasMore = instructions.length > 400;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xl">Skill Preview</h3>
          <div className="flex gap-2">
            {hasFrontmatter ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Frontmatter Detected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" /> No Frontmatter
              </Badge>
            )}
          </div>
        </div>

        {!hasFrontmatter && (
          <div className="grid gap-4 p-4 border rounded-lg bg-accent/20">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Skill Name (kebab-case)</Label>
              <Input 
                id="manual-name" 
                placeholder="e.g. code-review" 
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-desc">Description</Label>
              <Input 
                id="manual-desc" 
                placeholder="What does this skill do?" 
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
              />
            </div>
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Name</span>
                <span className="font-mono font-bold">{name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Category</span>
                <Badge variant="secondary">{skill.category || 'general'}</Badge>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block mb-1">Description</span>
                <p>{desc || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Allowed Tools</span>
                <div className="flex flex-wrap gap-1">
                  {skill.allowedTools?.length ? skill.allowedTools.map(t => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  )) : <span className="text-muted-foreground italic">none</span>}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">License</span>
                <span>{skill.license || '—'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-muted-foreground text-sm block">Instructions Preview</span>
              <div className="bg-muted p-4 rounded-lg font-mono text-xs whitespace-pre-wrap relative">
                {showFullInstructions ? instructions : previewText}
                {hasMore && !showFullInstructions && <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent" />}
              </div>
              {hasMore && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setShowFullInstructions(!showFullInstructions)}
                >
                  {showFullInstructions ? <><ChevronUp className="h-3 w-3 mr-1" /> Show Less</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show More</>}
                </Button>
              )}
            </div>

            {warnings.length > 0 && (
              <div className="space-y-2">
                <span className="text-amber-600 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Warnings
                </span>
                <ul className="list-disc list-inside text-[10px] text-amber-700 space-y-1">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg"
              disabled={!name || !desc}
              onClick={handleAdd}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" /> Add to Agent
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-full">
      <div className="col-span-12 lg:col-span-5 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="skillsmp">SkillsMP</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
            <TabsTrigger value="paste">Paste</TabsTrigger>
          </TabsList>

          <TabsContent value="skillsmp" className="space-y-4 pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search SkillsMP registry..." 
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {error && activeTab === 'skillsmp' && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                <Globe className="h-4 w-4 text-amber-600" />
                <AlertTitle>CORS Limitation</AlertTitle>
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {results.length > 0 ? results.map((skill) => (
                <Card 
                  key={skill.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    // In a real app, we'd fetch the raw SKILL.md from the registry
                    // For this prototype, we'll simulate it
                    const mockMd = `---\nname: ${skill.name}\ndescription: ${skill.description}\nallowed-tools: ${skill.tools?.join(' ') || ''}\nmetadata:\n  hermes:\n    category: ${skill.category || 'general'}\n---\n\n${skill.instructions || 'Instructions for ' + skill.name}`;
                    setPreview(parseSkillMd(mockMd));
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{skill.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{skill.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                  </CardContent>
                </Card>
              )) : !loading && query && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="github" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub URL or owner/repo</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="github-url"
                    placeholder="owner/repo or full SKILL.md URL" 
                    className="pl-9"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
              </div>

              {githubUrl && !githubUrl.includes('/') && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="github-skill">Skill name in repo</Label>
                  <Input 
                    id="github-skill"
                    placeholder="e.g. code-review" 
                    value={githubSkillName}
                    onChange={(e) => setGithubSkillName(e.target.value)}
                  />
                </div>
              )}

              <Button className="w-full" onClick={handleFetchGithub} disabled={loading || !githubUrl}>
                {loading ? 'Fetching...' : 'Fetch SKILL.md'}
              </Button>

              {error && activeTab === 'github' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Fetch Error</AlertTitle>
                  <AlertDescription className="text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 rounded-lg bg-muted/50 text-[10px] text-muted-foreground">
                <p className="font-bold mb-1">Supported Formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>owner/repo (assumes skills/NAME/SKILL.md)</li>
                  <li>https://github.com/.../SKILL.md</li>
                  <li>https://raw.githubusercontent.com/.../SKILL.md</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="paste-area">Raw SKILL.md Content</Label>
              <Textarea 
                id="paste-area"
                placeholder="Paste SKILL.md content here (with or without frontmatter)..."
                className="min-h-[400px] font-mono text-xs"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="col-span-12 lg:col-span-7 border-l pl-8">
        {preview ? renderPreview() : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
            <div className="p-6 rounded-full bg-muted">
              <FileCode className="h-12 w-12" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">No Skill Selected</h3>
              <p className="text-sm max-w-xs mx-auto">
                Search the registry, fetch from GitHub, or paste content to see a preview.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
