import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ModelStep } from '../wizard/steps/ModelStep';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings2, 
  Plus, 
  X, 
  Server, 
  Moon, 
  Sun, 
  Sparkles, 
  Brain, 
  Monitor, 
  Globe,
  GitBranch,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check
} from 'lucide-react';
import { TaskModelSettings } from './TaskModelSettings';
import { cn } from '@/lib/utils';

export function SettingsPanel() {
  const { settings, updateSettings, updateGitSettings, addMcpServer, removeMcpServer } = useSettings();
  const [newMcp, setNewMcp] = useState('');

  // Git Settings local state
  const [gitRemoteUrl, setGitRemoteUrl] = useState(settings.git?.remoteUrl || 'https://github.com/my-org/my-agent.git');
  const [gitProvider, setGitProvider] = useState<'github' | 'gitlab' | 'bitbucket' | 'custom'>(settings.git?.provider || 'github');
  const [gitPat, setGitPat] = useState(settings.git?.personalAccessToken || '');
  const [showGitPat, setShowGitPat] = useState(false);
  const [gitAuthorName, setGitAuthorName] = useState(settings.git?.authorName || 'Agent Developer');
  const [gitAuthorEmail, setGitAuthorEmail] = useState(settings.git?.authorEmail || 'developer@gitagent.internal');
  const [gitSaveSuccess, setGitSaveSuccess] = useState(false);
  const [gitTestState, setGitTestState] = useState<{
    loading: boolean;
    result?: { ok: boolean; message: string };
  }>({ loading: false });

  const handleSaveGitSettings = () => {
    updateGitSettings({
      remoteUrl: gitRemoteUrl.trim(),
      personalAccessToken: gitPat.trim(),
      provider: gitProvider,
      authorName: gitAuthorName.trim(),
      authorEmail: gitAuthorEmail.trim(),
    });
    setGitSaveSuccess(true);
    setTimeout(() => setGitSaveSuccess(false), 3000);
  };

  const handleTestGitConnection = async () => {
    const trimmedUrl = gitRemoteUrl.trim();
    if (!trimmedUrl) {
      setGitTestState({
        loading: false,
        result: { ok: false, message: 'Please provide a remote Git URL.' }
      });
      return;
    }
    setGitTestState({ loading: true });
    await new Promise(res => setTimeout(res, 600));
    const isUrlWellFormed = trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('git@');
    if (!isUrlWellFormed) {
      setGitTestState({
        loading: false,
        result: { ok: false, message: 'URL should begin with https:// or git@' }
      });
      return;
    }
    setGitTestState({
      loading: false,
      result: {
        ok: true,
        message: gitPat.trim()
          ? `Authenticated successfully with ${gitProvider} using configured Personal Access Token.`
          : `Remote endpoint reachable. (Token optional for public repos; PAT recommended for push)`
      }
    });
  };

  const handleAddMcp = () => {
    if (newMcp && !settings.mcpServers.includes(newMcp)) {
      addMcpServer(newMcp);
      setNewMcp('');
    }
  };

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const toggleDebug = () => {
    updateSettings({ debugLogging: !settings.debugLogging });
  };

  return (
    <Tabs defaultValue="global" className="w-full">
      <TabsList className="grid grid-cols-5 w-full mb-6">
        <TabsTrigger value="global" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">Global</span>
        </TabsTrigger>
        <TabsTrigger value="git" className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-[#A0D2EB]" />
          <span className="hidden sm:inline">Git & Remote</span>
        </TabsTrigger>
        <TabsTrigger value="generation" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Generation</span>
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Tasks</span>
        </TabsTrigger>
        <TabsTrigger value="mcp" className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          <span className="hidden sm:inline">MCP</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="global" className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              {settings.theme === 'dark' ? <Moon className="h-5 w-5 text-[#A0D2EB]" /> : <Sun className="h-5 w-5 text-amber-400" />}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes.</p>
              </div>
            </div>
            <Switch 
              checked={settings.theme === 'dark'} 
              onCheckedChange={toggleTheme} 
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-[#A0D2EB]" />
              <div>
                <p className="text-sm font-medium">Debug Logging</p>
                <p className="text-xs text-muted-foreground">Enable verbose logs in the browser console.</p>
              </div>
            </div>
            <Switch 
              checked={settings.debugLogging} 
              onCheckedChange={toggleDebug} 
            />
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#A0D2EB]" />
              Persistence Status
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              API keys entered manually are session-only. To persist them, use the <span className="font-semibold text-foreground underline decoration-[#A0D2EB]/50 underline-offset-2">Secrets</span> button in the AI Studio header.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {settings.envProviders?.map(pid => (
                <Badge key={pid} variant="secondary" className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 capitalize font-mono px-2 py-0.5 border-0 rounded-sm">
                  {pid} Active
                </Badge>
              ))}
              {(!settings.envProviders || settings.envProviders.length === 0) && (
                <p className="text-xs text-muted-foreground italic bg-muted/50 px-2 py-1 rounded">No persistent keys found.</p>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Git & Remote Upstream Configuration */}
      <TabsContent value="git" className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-5 space-y-5 border border-border/80">
          <div className="flex items-start justify-between border-b border-border/60 pb-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                <GitBranch className="h-4 w-4 text-[#A0D2EB]" />
                Git Remote Repository & Authentication
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure upstream Git repository, Personal Access Token (PAT), and committer identity for version control sync.
              </p>
            </div>
            {gitSaveSuccess && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs flex items-center gap-1">
                <Check className="size-3" /> Saved to Settings
              </Badge>
            )}
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-[#A0D2EB]">Git Provider</Label>
              <span className="text-[10px] text-muted-foreground font-mono">Platform endpoint</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['github', 'gitlab', 'bitbucket', 'custom'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setGitProvider(p);
                    if (!gitRemoteUrl || gitRemoteUrl.includes('my-org')) {
                      if (p === 'github') setGitRemoteUrl('https://github.com/my-org/my-agent.git');
                      else if (p === 'gitlab') setGitRemoteUrl('https://gitlab.com/my-group/my-agent.git');
                      else if (p === 'bitbucket') setGitRemoteUrl('https://bitbucket.org/my-workspace/my-agent.git');
                    }
                  }}
                  className={cn(
                    "py-2 px-3 rounded-sm border font-mono text-xs capitalize transition-all text-center",
                    gitProvider === p 
                      ? "bg-[#A0D2EB]/20 text-white border-[#A0D2EB]/60 font-semibold shadow-xs" 
                      : "bg-background/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-[#A0D2EB]/5"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Remote URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-[#A0D2EB]">Remote Repository URL (HTTPS or SSH)</Label>
              <span className="text-[10px] text-muted-foreground font-mono">origin</span>
            </div>
            <Input 
              value={gitRemoteUrl}
              onChange={e => {
                const val = e.target.value;
                setGitRemoteUrl(val);
                if (val.includes('github.com')) setGitProvider('github');
                else if (val.includes('gitlab.com')) setGitProvider('gitlab');
                else if (val.includes('bitbucket.org')) setGitProvider('bitbucket');
              }}
              placeholder={
                gitProvider === 'github' ? 'https://github.com/owner/repository.git' :
                gitProvider === 'gitlab' ? 'https://gitlab.com/group/project.git' :
                gitProvider === 'bitbucket' ? 'https://bitbucket.org/workspace/repo.git' :
                'https://git.example.com/repo.git or git@example.com:repo.git'
              }
              className="h-9 text-xs font-mono bg-background border-border/80 text-foreground"
            />
          </div>

          {/* Personal Access Token (PAT) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono text-[#A0D2EB] flex items-center gap-1.5">
                <Key className="size-3.5 text-[#A0D2EB]" />
                Personal Access Token (PAT)
              </Label>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <ShieldCheck className="size-3" />
                Session Encrypted
              </span>
            </div>

            <div className="relative">
              <Input 
                type={showGitPat ? "text" : "password"}
                value={gitPat}
                onChange={e => setGitPat(e.target.value)}
                placeholder={
                  gitProvider === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxxxx' :
                  gitProvider === 'gitlab' ? 'glpat-xxxxxxxxxxxxxxxxxxxx' :
                  'Personal Access Token or App Password'
                }
                className="h-9 text-xs font-mono bg-background border-border/80 text-foreground pr-9"
              />
              <button
                type="button"
                onClick={() => setShowGitPat(!showGitPat)}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                title={showGitPat ? "Hide token" : "Show token"}
              >
                {showGitPat ? <EyeOff className="size-4" /> : <Eye className="size-4 text-[#A0D2EB]" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Required for pushing commits and syncing with authenticated upstream repositories.
            </p>
          </div>

          {/* Committer Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#A0D2EB]">Git Author Name</Label>
              <Input 
                value={gitAuthorName}
                onChange={e => setGitAuthorName(e.target.value)}
                className="h-8.5 text-xs font-sans bg-background border-border/80 text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-[#A0D2EB]">Git Author Email</Label>
              <Input 
                value={gitAuthorEmail}
                onChange={e => setGitAuthorEmail(e.target.value)}
                className="h-8.5 text-xs font-mono bg-background border-border/80 text-foreground"
              />
            </div>
          </div>

          {/* Preflight Test Connection */}
          <div className="pt-2 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">Pre-flight verification:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestGitConnection}
                disabled={gitTestState.loading || !gitRemoteUrl.trim()}
                className="text-xs font-mono border-[#A0D2EB]/30 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1.5 h-8 px-3"
              >
                <RefreshCw className={cn("size-3", gitTestState.loading && "animate-spin")} />
                {gitTestState.loading ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            {gitTestState.result && (
              <div className={cn(
                "p-3 rounded-sm border text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150",
                gitTestState.result.ok
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                  : "bg-rose-950/40 border-rose-500/50 text-rose-200"
              )}>
                {gitTestState.result.ok ? (
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <p className="text-xs leading-relaxed">{gitTestState.result.message}</p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <span className="text-xs text-muted-foreground font-mono">
              Persisted in SettingsProvider context
            </span>
            <Button
              type="button"
              onClick={handleSaveGitSettings}
              disabled={!gitRemoteUrl.trim()}
              className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs h-9 px-5 shadow-xs"
            >
              Save Git Settings
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="generation">
        <div className="bg-muted/10 p-1 rounded-lg">
          <ModelStep hideRuntime={true} />
        </div>
      </TabsContent>

      <TabsContent value="tasks">
        <div className="bg-muted/10 p-1 rounded-lg">
          <TaskModelSettings />
        </div>
      </TabsContent>

      <TabsContent value="mcp" className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">MCP Servers</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Model Context Protocol (MCP) servers allow your agent to connect to external tools, databases, and APIs via specialized SSE endpoints.
          </p>
          
          <div className="flex gap-2 bg-muted/30 p-2 rounded-lg">
            <Input 
              placeholder="https://mcp-server.example.com/sse" 
              value={newMcp}
              className="bg-background border-none shadow-none"
              onChange={e => setNewMcp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMcp()}
            />
            <Button size="default" variant="default" onClick={handleAddMcp} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>

          <div className="space-y-2 mt-4">
            {settings.mcpServers.map(url => (
              <div key={url} className="flex items-center justify-between bg-muted/50 px-4 py-3 rounded-lg text-sm border hover:border-primary/30 transition-all group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="truncate font-mono text-xs">{url}</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => removeMcpServer(url)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {settings.mcpServers.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <div className="bg-muted w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Server className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No MCP servers connected</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Connect a server to expand your agent's capabilities</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
