import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { parseCLAUDEmd } from '../../lib/gitagent/parseCLAUDEmd';
import { parseGeminiSettings } from '../../lib/gitagent/parseGeminiSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileUp, 
  FolderUp, 
  Archive, 
  Clipboard, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Eye,
  X,
  FileText,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Wrench,
  RotateCcw,
  Check
} from 'lucide-react';
import JSZip from 'jszip';
import yaml from 'js-yaml';
import { SkillEntry, AgentWorkspace } from '../../lib/gitagent/types';

type MergeStrategy = 'overwrite' | 'keep' | 'merge';

interface ScannedFile {
  path: string;
  name: string;
  content: string;
  size: number;
  status: 'accepted' | 'unsupported';
  reason?: string;
  category: 'manifest' | 'soul' | 'rules' | 'skill' | 'knowledge' | 'evals' | 'other';
}

interface MultiFileInspection {
  files: ScannedFile[];
  agentName: string;
  agentDescription: string;
  skills: string[];
  tools: string[];
  childAgents: string[];
  unresolvedReferences: string[];
  rawWorkspace: {
    manifest?: any;
    soul?: string | null;
    rules?: string | null;
    skillsList?: SkillEntry[];
    knowledgeDocs?: Array<{ path: string; description: string; alwaysLoad: boolean; content: string | null }>;
  };
}

export function ImportView() {
  const { state, dispatch } = useAgentWorkspace();
  const navigate = useNavigate();

  // Single-file tab states
  const [content, setContent] = useState('');
  const [parsed, setParsed] = useState<ReturnType<typeof parseCLAUDEmd> | null>(null);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [strategies, setStrategies] = useState<Record<string, MergeStrategy>>({});
  const [importSuccess, setImportSuccess] = useState(false);

  // Gemini specific state
  const [geminiMd, setGeminiMd] = useState('');
  const [geminiSettings, setGeminiSettings] = useState('');

  // Multi-file inspection state
  const [multiInspection, setMultiInspection] = useState<MultiFileInspection | null>(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<ScannedFile | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [multiFileError, setMultiFileError] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // ── Multi-File Project Processing ──────────────────────────────────────────

  const processFileBundle = async (fileList: { path: string; content: string; size: number }[]) => {
    setIsReadingFiles(true);
    setMultiFileError(null);

    try {
      const scanned: ScannedFile[] = [];
      let detectedRoot = '';

      // Check for common root directory prefix if all files share it
      const allPaths = fileList.map(f => f.path);
      if (allPaths.length > 0 && allPaths.every(p => p.includes('/'))) {
        const firstSegment = allPaths[0].split('/')[0];
        if (allPaths.every(p => p.startsWith(firstSegment + '/'))) {
          detectedRoot = firstSegment + '/';
        }
      }

      for (const item of fileList) {
        // Enforce safe path: reject path traversal
        if (item.path.includes('..') || item.path.startsWith('/')) {
          scanned.push({
            path: item.path,
            name: item.path.split('/').pop() || item.path,
            content: '',
            size: item.size,
            status: 'unsupported',
            reason: 'Unsafe path traversal rejected (contains .. or root slash)',
            category: 'other'
          });
          continue;
        }

        // Ignore hidden OS files
        if (item.path.includes('__MACOSX') || item.path.includes('.DS_Store') || item.path.endsWith('.gitkeep')) {
          continue;
        }

        const normalized = detectedRoot ? item.path.replace(detectedRoot, '') : item.path;
        const lower = normalized.toLowerCase();

        let category: ScannedFile['category'] = 'other';
        let status: ScannedFile['status'] = 'unsupported';
        let reason = 'Unrecognized agent specification file; will be ignored';

        if (lower === 'agent.yaml' || lower === 'agent.yml' || lower === 'manifest.json') {
          category = 'manifest';
          status = 'accepted';
          reason = '';
        } else if (lower === 'soul.md') {
          category = 'soul';
          status = 'accepted';
          reason = '';
        } else if (lower === 'rules.md') {
          category = 'rules';
          status = 'accepted';
          reason = '';
        } else if (lower.startsWith('skills/') && lower.endsWith('skill.md')) {
          category = 'skill';
          status = 'accepted';
          reason = '';
        } else if (lower.startsWith('skills/')) {
          category = 'skill';
          status = 'accepted';
          reason = '';
        } else if (lower.startsWith('knowledge/')) {
          category = 'knowledge';
          status = 'accepted';
          reason = '';
        } else if (lower.startsWith('evals/') || lower.startsWith('tests/')) {
          category = 'evals';
          status = 'accepted';
          reason = '';
        }

        scanned.push({
          path: normalized,
          name: normalized.split('/').pop() || normalized,
          content: item.content,
          size: item.size,
          status,
          reason: status === 'unsupported' ? reason : undefined,
          category
        });
      }

      // Build inspection metadata
      let agentName = 'agent';
      let agentDescription = '';
      const toolsSet = new Set<string>();
      const skillsSet = new Set<string>();
      const childAgentsSet = new Set<string>();
      const unresolved: string[] = [];

      const draftWorkspace: MultiFileInspection['rawWorkspace'] = {
        skillsList: [],
        knowledgeDocs: []
      };

      // 1. Process Manifest
      const manifestFile = scanned.find(f => f.status === 'accepted' && f.category === 'manifest');
      if (manifestFile) {
        try {
          let parsedManifest: any = null;
          if (manifestFile.path.endsWith('.json')) {
            parsedManifest = JSON.parse(manifestFile.content);
          } else {
            parsedManifest = yaml.load(manifestFile.content);
          }
          if (parsedManifest) {
            draftWorkspace.manifest = parsedManifest;
            agentName = parsedManifest.name || agentName;
            agentDescription = parsedManifest.description || agentDescription;

            if (Array.isArray(parsedManifest.tools)) {
              parsedManifest.tools.forEach((t: string) => toolsSet.add(t));
            } else if (typeof parsedManifest.tools === 'object' && parsedManifest.tools !== null) {
              Object.keys(parsedManifest.tools).forEach(t => toolsSet.add(t));
            }

            if (Array.isArray(parsedManifest.skills)) {
              parsedManifest.skills.forEach((s: string) => skillsSet.add(s));
            }

            if (Array.isArray(parsedManifest.delegates || parsedManifest.subagents || parsedManifest.child_agents)) {
              const children = parsedManifest.delegates || parsedManifest.subagents || parsedManifest.child_agents;
              children.forEach((c: any) => childAgentsSet.add(typeof c === 'string' ? c : (c.name || 'subagent')));
            }
          }
        } catch (e: any) {
          unresolved.push(`Manifest parse warning: ${e.message}`);
        }
      }

      // 2. Process Soul
      const soulFile = scanned.find(f => f.status === 'accepted' && f.category === 'soul');
      if (soulFile) {
        draftWorkspace.soul = soulFile.content;
      }

      // 3. Process Rules
      const rulesFile = scanned.find(f => f.status === 'accepted' && f.category === 'rules');
      if (rulesFile) {
        draftWorkspace.rules = rulesFile.content;
      }

      // 4. Process Skills
      const skillFiles = scanned.filter(f => f.status === 'accepted' && f.category === 'skill' && f.path.endsWith('SKILL.md'));
      const parsedSkillEntries: SkillEntry[] = [];

      for (const sf of skillFiles) {
        const pathParts = sf.path.split('/');
        const skillName = pathParts.length > 2 ? pathParts[1] : sf.name.replace(/\.md$/i, '');
        skillsSet.add(skillName);

        // Try to parse YAML frontmatter from SKILL.md
        let instructions = sf.content;
        let skillDesc = '';
        const allowedTools: string[] = [];

        if (sf.content.startsWith('---')) {
          const endFrontmatter = sf.content.indexOf('---', 3);
          if (endFrontmatter !== -1) {
            const frontmatterStr = sf.content.slice(3, endFrontmatter).trim();
            instructions = sf.content.slice(endFrontmatter + 3).trim();
            try {
              const fm: any = yaml.load(frontmatterStr);
              if (fm) {
                skillDesc = fm.description || '';
                if (Array.isArray(fm.allowedTools)) {
                  fm.allowedTools.forEach((t: string) => {
                    allowedTools.push(t);
                    toolsSet.add(t);
                  });
                }
              }
            } catch {
              // Ignore frontmatter parse errors
            }
          }
        }

        parsedSkillEntries.push({
          name: skillName,
          description: skillDesc || `Skill from ${sf.path}`,
          instructions,
          allowedTools: allowedTools.join(' '),
          category: 'general',
          scope: 'global'
        });
      }
      draftWorkspace.skillsList = parsedSkillEntries;

      // Check unresolved skill references
      skillsSet.forEach(sName => {
        if (!parsedSkillEntries.some(e => e.name.toLowerCase() === sName.toLowerCase())) {
          unresolved.push(`Skill "${sName}" declared in manifest but no SKILL.md was found in skills/${sName}/`);
        }
      });

      // 5. Process Knowledge files
      const knowledgeFiles = scanned.filter(f => f.status === 'accepted' && f.category === 'knowledge');
      draftWorkspace.knowledgeDocs = knowledgeFiles.map(kf => ({
        path: kf.path,
        description: kf.name,
        alwaysLoad: false,
        content: kf.content
      }));

      setMultiInspection({
        files: scanned,
        agentName,
        agentDescription,
        skills: Array.from(skillsSet),
        tools: Array.from(toolsSet),
        childAgents: Array.from(childAgentsSet),
        unresolvedReferences: unresolved,
        rawWorkspace: draftWorkspace
      });

      if (scanned.length > 0) {
        setSelectedPreviewFile(scanned.find(f => f.status === 'accepted') || scanned[0]);
      }
    } catch (err: any) {
      setMultiFileError(err.message || 'Failed to parse project bundle');
    } finally {
      setIsReadingFiles(false);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsReadingFiles(true);
      const zip = await JSZip.loadAsync(file);
      const extractedFiles: { path: string; content: string; size: number }[] = [];

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('string');
          extractedFiles.push({
            path: relativePath,
            content,
            size: content.length
          });
        }
      }

      await processFileBundle(extractedFiles);
    } catch (err: any) {
      setMultiFileError(`Failed to read ZIP archive: ${err.message}`);
      setIsReadingFiles(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsReadingFiles(true);
      const extractedFiles: { path: string; content: string; size: number }[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const relativePath = (f as any).webkitRelativePath || f.name;
        const text = await f.text();
        extractedFiles.push({
          path: relativePath,
          content: text,
          size: f.size
        });
      }

      await processFileBundle(extractedFiles);
    } catch (err: any) {
      setMultiFileError(`Failed to read folder: ${err.message}`);
      setIsReadingFiles(false);
    }
  };

  const handleApplyMultiImport = () => {
    if (!multiInspection) return;

    const mergedWorkspace: any = {
      ...state,
      manifest: {
        ...state.manifest,
        ...(multiInspection.rawWorkspace.manifest || {}),
        name: multiInspection.agentName,
        description: multiInspection.agentDescription || state.manifest.description,
        tools: multiInspection.tools,
        skills: multiInspection.skills
      },
      soul: multiInspection.rawWorkspace.soul ?? state.soul,
      rules: multiInspection.rawWorkspace.rules ?? state.rules,
      skillsList: multiInspection.rawWorkspace.skillsList?.length ? multiInspection.rawWorkspace.skillsList : state.skillsList,
      knowledgeDocs: multiInspection.rawWorkspace.knowledgeDocs?.length ? multiInspection.rawWorkspace.knowledgeDocs : state.knowledgeDocs
    };

    dispatch({ type: 'SET_WORKSPACE', payload: mergedWorkspace });
    dispatch({
      type: 'COMMIT_GIT',
      payload: {
        message: `Import multi-file agent "${multiInspection.agentName}" with ${multiInspection.files.filter(f => f.status === 'accepted').length} specification files`
      }
    });

    setImportSuccess(true);
    setTimeout(() => navigate('/editor'), 1500);
  };

  const handleDiscardMultiImport = () => {
    setMultiInspection(null);
    setSelectedPreviewFile(null);
    setMultiFileError(null);
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  // ── Single-File (CLAUDE.md / Gemini) Handlers ──────────────────────────────

  const handleParse = () => {
    if (!content.trim()) return;
    const result = parseCLAUDEmd(content);
    setParsed(result);
    
    const initialSelected: Record<string, boolean> = {};
    const initialStrategies: Record<string, MergeStrategy> = {};
    
    if (result.partial.manifest) initialSelected.manifest = true;
    if (result.partial.soul) initialSelected.soul = true;
    if (result.partial.rules) initialSelected.rules = true;
    if (Object.keys(result.partial.skills || {}).length > 0) initialSelected.skills = true;
    if (Object.keys(result.partial.tools || {}).length > 0) initialSelected.tools = true;
    if (result.partial.memoryBootstrap) initialSelected.memory = true;

    Object.keys(initialSelected).forEach(key => {
      initialStrategies[key] = 'overwrite';
    });

    setSelectedFields(initialSelected);
    setStrategies(initialStrategies);
    setImportSuccess(false);
  };

  const handleGeminiParse = () => {
    if (!geminiMd.trim()) return;
    
    const mdResult = parseCLAUDEmd(geminiMd);
    const settingsResult = parseGeminiSettings(geminiSettings);
    
    const combinedPartial = { ...mdResult.partial };
    const combinedWarnings = [...mdResult.warnings, ...settingsResult.warnings];

    if (settingsResult.modelPreferred || settingsResult.tools || settingsResult.humanInTheLoop) {
      combinedPartial.manifest = {
        ...combinedPartial.manifest,
        name: combinedPartial.manifest?.name || 'agent',
        version: combinedPartial.manifest?.version || '0.1.0',
        description: combinedPartial.manifest?.description || '',
        model: settingsResult.modelPreferred ? { preferred: settingsResult.modelPreferred } : combinedPartial.manifest?.model,
        tools: settingsResult.tools || combinedPartial.manifest?.tools,
        compliance: settingsResult.humanInTheLoop ? {
          ...combinedPartial.manifest?.compliance,
          risk_tier: combinedPartial.manifest?.compliance?.risk_tier || 'low',
          supervision: { human_in_the_loop: settingsResult.humanInTheLoop }
        } : combinedPartial.manifest?.compliance
      };
    }

    setParsed({ partial: combinedPartial, warnings: combinedWarnings });

    const initialSelected: Record<string, boolean> = {};
    const initialStrategies: Record<string, MergeStrategy> = {};
    
    if (combinedPartial.manifest) initialSelected.manifest = true;
    if (combinedPartial.soul) initialSelected.soul = true;
    if (combinedPartial.rules) initialSelected.rules = true;
    if (Object.keys(combinedPartial.skills || {}).length > 0) initialSelected.skills = true;
    if (Object.keys(combinedPartial.tools || {}).length > 0) initialSelected.tools = true;
    if (combinedPartial.memoryBootstrap) initialSelected.memory = true;

    Object.keys(initialSelected).forEach(key => {
      initialStrategies[key] = 'overwrite';
    });

    setSelectedFields(initialSelected);
    setStrategies(initialStrategies);
    setImportSuccess(false);
  };

  const handleImport = () => {
    if (!parsed) return;

    const { partial } = parsed;
    const newWorkspace = { ...state };

    const applyField = (key: string, value: any) => {
      if (!selectedFields[key]) return;
      
      const strategy = strategies[key];
      const existing = (newWorkspace as any)[key];

      if (strategy === 'keep' && existing) return;
      
      if (strategy === 'merge' && existing && typeof existing === 'string' && typeof value === 'string') {
        (newWorkspace as any)[key] = existing + '\n\n---\n\n' + value;
      } else if (strategy === 'merge' && existing && typeof existing === 'object' && typeof value === 'object') {
        (newWorkspace as any)[key] = { ...existing, ...value };
      } else {
        (newWorkspace as any)[key] = value;
      }
    };

    if (selectedFields.manifest && partial.manifest) {
      newWorkspace.manifest = { ...state.manifest, ...partial.manifest };
    }

    applyField('soul', partial.soul);
    applyField('rules', partial.rules);
    applyField('skills', partial.skills);
    applyField('tools', partial.tools);
    applyField('memoryBootstrap', partial.memoryBootstrap);

    dispatch({ type: 'SET_WORKSPACE', payload: newWorkspace });
    setImportSuccess(true);
    setTimeout(() => navigate('/editor'), 1500);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-5 md:p-8 select-text">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-border/80 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-sm bg-primary/10 text-primary flex items-center justify-center terracotta-glow-sm shrink-0">
              <FileUp className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Import Agent Workspace</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Multi-file folder & ZIP archive import, CLAUDE.md, and Gemini specs with pre-import inspection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/editor')}
              className="text-xs font-mono cursor-pointer"
            >
              Cancel & Return to Editor
            </Button>
          </div>
        </div>

        {importSuccess && (
          <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="font-bold text-sm">Agent Imported Successfully</AlertTitle>
            <AlertDescription className="text-xs">
              Committed import to repository history. Redirecting to workspace editor...
            </AlertDescription>
          </Alert>
        )}

        {multiFileError && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle className="font-bold text-sm">Import Notice</AlertTitle>
            <AlertDescription className="text-xs">
              {multiFileError}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="multifile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="multifile" className="font-mono text-xs">
              Archive / Folder (Multi-File)
            </TabsTrigger>
            <TabsTrigger value="claude" className="font-mono text-xs">
              CLAUDE.md Single File
            </TabsTrigger>
            <TabsTrigger value="gemini" className="font-mono text-xs">
              Gemini Settings
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Multi-File Folder / Archive Upload & Inspection */}
          <TabsContent value="multifile" className="space-y-6">
            {!multiInspection ? (
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderUp className="size-4 text-primary" /> Multi-File Project Import
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Import an entire agent workspace from an uncompressed directory or `.zip` archive. Accepts standard canonical layouts (`agent.yaml`, `SOUL.md`, `RULES.md`, `skills/&lt;name&gt;/SKILL.md`, and optional `knowledge/` assets).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Folder Upload Box */}
                    <div 
                      onClick={() => folderInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-border hover:border-primary/80 bg-muted/20 hover:bg-muted/40 transition-all rounded-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer select-none group"
                    >
                      <input 
                        type="file" 
                        ref={folderInputRef}
                        // @ts-ignore
                        webkitdirectory="" 
                        directory="" 
                        multiple 
                        onChange={handleFolderUpload}
                        className="hidden" 
                      />
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderUp className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">Select Agent Folder</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Uploads entire project directory tree
                        </p>
                      </div>
                      <Button variant="secondary" size="xs" className="pointer-events-none mt-1 text-xs">
                        Browse Folder...
                      </Button>
                    </div>

                    {/* ZIP Archive Upload Box */}
                    <div 
                      onClick={() => zipInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-border hover:border-primary/80 bg-muted/20 hover:bg-muted/40 transition-all rounded-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer select-none group"
                    >
                      <input 
                        type="file" 
                        ref={zipInputRef}
                        accept=".zip,application/zip" 
                        onChange={handleZipUpload}
                        className="hidden" 
                      />
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Archive className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">Select .ZIP Archive</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Extracts and parses all bundled specification files
                        </p>
                      </div>
                      <Button variant="secondary" size="xs" className="pointer-events-none mt-1 text-xs">
                        Browse ZIP File...
                      </Button>
                    </div>
                  </div>

                  {isReadingFiles && (
                    <div className="p-4 border border-border bg-muted/30 font-mono text-xs flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary animate-ping" />
                      <span>Reading and verifying bundle files...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Pre-Import Source Inspection View */
              <div className="space-y-6">
                {/* 1. Pre-Import Overview & Actions */}
                <Card className="border-2 border-primary bg-card shadow-sm">
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="amber" className="text-[10px] font-mono">
                            PRE-IMPORT INSPECTION (UNCOMMITTED)
                          </Badge>
                          <h2 className="text-lg font-bold text-foreground">
                            {multiInspection.agentName}
                          </h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {multiInspection.agentDescription || "No description provided in manifest."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDiscardMultiImport}
                          className="text-xs font-mono text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                        >
                          <X className="size-3.5 mr-1" /> Discard Import
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleApplyMultiImport}
                          className="text-xs font-mono font-bold shadow-xs cursor-pointer gap-1.5"
                        >
                          <Check className="size-3.5" /> Apply Import to Workspace
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Metadata Summary Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="p-2.5 border border-border bg-muted/30">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold block">Accepted Files</span>
                        <strong className="text-sm text-foreground">
                          {multiInspection.files.filter(f => f.status === 'accepted').length}
                        </strong>
                        <span className="text-[10px] text-muted-foreground block">of {multiInspection.files.length} total</span>
                      </div>

                      <div className="p-2.5 border border-border bg-muted/30">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold block">Declared Skills</span>
                        <strong className="text-sm text-primary">
                          {multiInspection.skills.length}
                        </strong>
                        <span className="text-[10px] text-muted-foreground block">
                          {multiInspection.skills.slice(0, 2).join(', ')}{multiInspection.skills.length > 2 ? '...' : ''}
                        </span>
                      </div>

                      <div className="p-2.5 border border-border bg-muted/30">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold block">Assigned Tools</span>
                        <strong className="text-sm text-foreground">
                          {multiInspection.tools.length}
                        </strong>
                        <span className="text-[10px] text-muted-foreground block">runtime mapped</span>
                      </div>

                      <div className="p-2.5 border border-border bg-muted/30">
                        <span className="text-[10px] uppercase text-muted-foreground font-bold block">Child Agents</span>
                        <strong className="text-sm text-foreground">
                          {multiInspection.childAgents.length}
                        </strong>
                        <span className="text-[10px] text-muted-foreground block">delegation targets</span>
                      </div>
                    </div>

                    {/* Warnings & Unresolved References Banner */}
                    {multiInspection.unresolvedReferences.length > 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs font-sans space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                          <span>Unresolved References Detected:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90 dark:text-amber-200/90">
                          {multiInspection.unresolvedReferences.map((ref, i) => (
                            <li key={i}>{ref}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. File Inventory & Live File Inspector */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: File Inventory Table */}
                  <Card className="border border-border">
                    <CardHeader className="py-3 px-4 border-b border-border">
                      <CardTitle className="text-xs uppercase tracking-wider font-mono flex items-center justify-between">
                        <span>File Inventory ({multiInspection.files.length})</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Click row to inspect content
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
                      {multiInspection.files.map((file, idx) => {
                        const isSelected = selectedPreviewFile?.path === file.path;
                        return (
                          <div 
                            key={idx}
                            onClick={() => setSelectedPreviewFile(file)}
                            className={`p-2.5 text-xs font-mono flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                            }`}
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              {file.status === 'accepted' ? (
                                <FileCode className="size-4 text-primary shrink-0" />
                              ) : (
                                <AlertTriangle className="size-4 text-muted-foreground/60 shrink-0" />
                              )}
                              <span className="truncate font-medium text-foreground">{file.path}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {file.status === 'accepted' ? (
                                <Badge variant="green" className="text-[8px] py-0 px-1">
                                  ACCEPTED
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[8px] py-0 px-1 text-muted-foreground border-border bg-muted">
                                  UNSUPPORTED
                                </Badge>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {file.size} B
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Right: File Preview Drawer */}
                  <Card className="border border-border flex flex-col overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Eye className="size-3.5 text-primary shrink-0" />
                        <span className="font-mono text-xs font-bold truncate">
                          {selectedPreviewFile?.path || "Select a file to preview"}
                        </span>
                      </div>
                      {selectedPreviewFile?.status === 'unsupported' && (
                        <span className="text-[10px] text-amber-600 font-sans">
                          {selectedPreviewFile.reason}
                        </span>
                      )}
                    </CardHeader>
                    <div className="flex-1 max-h-96 overflow-y-auto p-4 bg-surface-container-lowest font-mono text-[11px] leading-relaxed text-foreground select-text whitespace-pre-wrap">
                      {selectedPreviewFile?.content || (
                        <span className="text-muted-foreground italic">
                          No file selected or empty file contents.
                        </span>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: CLAUDE.md Paste Import */}
          <TabsContent value="claude" className="space-y-6">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Import from Single CLAUDE.md</CardTitle>
                <CardDescription className="text-xs">
                  Paste the content of your CLAUDE.md file below to parse into manifest, soul, and rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="# agent-name\n\n## Soul\n..."
                    className="min-h-[260px] font-mono text-xs"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <Button variant="secondary" size="xs" onClick={() => setContent('')}>
                      Clear
                    </Button>
                    <Button size="xs" onClick={handleParse}>
                      Parse Content
                    </Button>
                  </div>
                </div>

                {parsed && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm">Detected Sections</h3>
                      <Button size="xs" onClick={handleImport} className="font-bold">
                        Apply to Workspace
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      {Object.keys(selectedFields).map((field) => (
                        <div key={field} className="flex flex-col gap-2 p-3 border border-border rounded-sm bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                id={`select-${field}`} 
                                checked={selectedFields[field]}
                                onCheckedChange={(checked) => setSelectedFields(prev => ({ ...prev, [field]: !!checked }))}
                              />
                              <Label htmlFor={`select-${field}`} className="font-bold capitalize text-xs">{field}</Label>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {field === 'skills' ? Object.keys(parsed.partial.skills || {}).length : 
                               field === 'tools' ? Object.keys(parsed.partial.tools || {}).length : 1} items
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Gemini Configuration Import */}
          <TabsContent value="gemini" className="space-y-6">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Import Gemini Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Paste GEMINI.md instructions and optional settings JSON.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono font-bold">GEMINI.md Content</Label>
                    <Textarea
                      placeholder="# Agent Name\n\n## Instructions..."
                      className="min-h-[220px] font-mono text-xs"
                      value={geminiMd}
                      onChange={(e) => setGeminiMd(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono font-bold">Settings JSON (Optional)</Label>
                    <Textarea
                      placeholder='{\n  "modelPreferred": "gemini-2.5-pro",\n  "tools": ["web_search"]\n}'
                      className="min-h-[220px] font-mono text-xs"
                      value={geminiSettings}
                      onChange={(e) => setGeminiSettings(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={handleGeminiParse} className="font-mono text-xs">
                    Parse Gemini Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
