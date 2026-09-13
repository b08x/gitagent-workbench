import React, { useState, useMemo } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  GitBranch, 
  Github, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  Clock, 
  History as HistoryIcon,
  FileText, 
  Code2, 
  Settings2, 
  FolderGit2, 
  Play, 
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  GitCommitHorizontal,
  HardDrive
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { computeWorkingTreeStatus, DEFAULT_GITIGNORE, GitRemote } from '@/lib/gitagent/gitManager';
import { cn } from '@/lib/utils';

export function GitIntegration() {
  const { state, dispatch } = useAgentWorkspace();
  const navigate = useNavigate();

  // Local interaction states
  const [copied, setCopied] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [authorName, setAuthorName] = useState(state.manifest.author || 'Agent Developer');
  const [authorEmail, setAuthorEmail] = useState('developer@gitagent.internal');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // New branch modal / input
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchInput, setNewBranchInput] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);

  // Remote config modal
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState(state.git?.remotes?.[0]?.url || `https://github.com/my-org/${state.manifest.name?.toLowerCase().replace(/\s+/g, '-') || 'my-agent'}.git`);
  const [remoteProvider, setRemoteProvider] = useState<'github' | 'gitlab' | 'bitbucket' | 'custom'>('github');
  const [remoteToken, setRemoteToken] = useState(state.git?.remotes?.[0]?.token || '');

  // Terminal command input
  const [terminalInput, setTerminalInput] = useState('');

  // Selected commit for detailed inspection
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);

  // Calculate working tree status against HEAD
  const workingTree = useMemo(() => {
    return computeWorkingTreeStatus(state.git, state);
  }, [state.git, state]);

  const repoName = state.git.repoName || state.manifest.name?.toLowerCase().replace(/\s+/g, '-') || 'my-gitagent';
  const currentBranch = state.git.currentBranch || 'main';
  const headCommit = state.git.commits.find(c => c.hash === state.git.head) || state.git.commits[0];
  const selectedCommit = state.git.commits.find(c => c.hash === selectedCommitHash) || headCommit;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Git Actions
  const handleInitRepo = () => {
    dispatch({
      type: 'INIT_GIT',
      payload: {
        repoName,
        authorName,
        authorEmail,
      }
    });
    setSyncFeedback('Git repository initialized with initial commit on main branch.');
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) return;
    dispatch({
      type: 'COMMIT_GIT',
      payload: {
        message: commitMessage.trim(),
        authorName,
        authorEmail,
      }
    });
    setCommitMessage('');
    setSyncFeedback(`Created commit on ${currentBranch}.`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handlePush = () => {
    setIsPushing(true);
    setTimeout(() => {
      dispatch({ type: 'PUSH_GIT' });
      setIsPushing(false);
      setSyncFeedback(`Successfully pushed ${state.git.sync.ahead || 1} commit(s) to origin/${currentBranch}.`);
      setTimeout(() => setSyncFeedback(null), 4000);
    }, 800);
  };

  const handlePull = () => {
    setIsPulling(true);
    setTimeout(() => {
      dispatch({ type: 'PULL_GIT' });
      setIsPulling(false);
      setSyncFeedback(`Pulled updates from origin/${currentBranch}. Working tree is up to date.`);
      setTimeout(() => setSyncFeedback(null), 4000);
    }, 800);
  };

  const handleCreateBranch = () => {
    if (!newBranchInput.trim()) return;
    try {
      dispatch({ type: 'CREATE_GIT_BRANCH', payload: newBranchInput.trim() });
      setNewBranchInput('');
      setShowNewBranchModal(false);
      setBranchError(null);
      setSyncFeedback(`Switched to new branch: ${newBranchInput.trim()}`);
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      setBranchError(err.message || 'Failed to create branch');
    }
  };

  const handleSwitchBranch = (branch: string) => {
    if (branch === currentBranch) return;
    dispatch({ type: 'SWITCH_GIT_BRANCH', payload: branch });
    setSyncFeedback(`Switched to branch: ${branch}`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  const handleSaveRemote = () => {
    dispatch({
      type: 'UPDATE_GIT_REMOTE',
      payload: {
        name: 'origin',
        url: remoteUrlInput,
        provider: remoteProvider,
        token: remoteToken,
      }
    });
    setShowRemoteModal(false);
    setSyncFeedback(`Remote 'origin' updated to ${remoteUrlInput}`);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleRestoreCommit = (hash: string) => {
    if (confirm(`Restore workspace state to commit ${hash}? Any unsaved changes in the working tree will be replaced.`)) {
      dispatch({ type: 'RESTORE_GIT_COMMIT', payload: hash });
      setSyncFeedback(`Workspace restored to commit ${hash}.`);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    if (cmd === 'git status') {
      const statusLog = workingTree.isClean 
        ? `On branch ${currentBranch}\nYour branch is up to date with 'origin/${currentBranch}'.\n\nnothing to commit, working tree clean`
        : `On branch ${currentBranch}\nChanges not staged for commit:\n${workingTree.files.map(f => `\t${f.status === 'modified' ? 'modified:   ' : 'new file:   '}${f.path}`).join('\n')}`;
      
      dispatch({
        type: 'SET_GIT_STATE',
        payload: {
          ...state.git,
          terminalLogs: [
            ...state.git.terminalLogs,
            { id: `log-${Date.now()}`, command: cmd, output: statusLog, timestamp: Date.now(), type: 'info' }
          ]
        }
      });
    } else if (cmd === 'git branch') {
      const output = state.git.branches.map(b => b === currentBranch ? `* ${b}` : `  ${b}`).join('\n');
      dispatch({
        type: 'SET_GIT_STATE',
        payload: {
          ...state.git,
          terminalLogs: [
            ...state.git.terminalLogs,
            { id: `log-${Date.now()}`, command: cmd, output, timestamp: Date.now(), type: 'info' }
          ]
        }
      });
    } else if (cmd === 'git log' || cmd === 'git log --oneline') {
      const output = state.git.commits.map(c => `${c.hash} (${c.branch}) ${c.message}`).join('\n');
      dispatch({
        type: 'SET_GIT_STATE',
        payload: {
          ...state.git,
          terminalLogs: [
            ...state.git.terminalLogs,
            { id: `log-${Date.now()}`, command: cmd, output, timestamp: Date.now(), type: 'info' }
          ]
        }
      });
    } else if (cmd.startsWith('git commit')) {
      const match = cmd.match(/git commit -m ["'](.+)["']/);
      const msg = match ? match[1] : 'Update agent configuration';
      dispatch({ type: 'COMMIT_GIT', payload: { message: msg } });
    } else if (cmd === 'git push' || cmd.startsWith('git push')) {
      handlePush();
    } else if (cmd === 'git pull' || cmd.startsWith('git pull')) {
      handlePull();
    } else {
      dispatch({
        type: 'SET_GIT_STATE',
        payload: {
          ...state.git,
          terminalLogs: [
            ...state.git.terminalLogs,
            { id: `log-${Date.now()}`, command: cmd, output: `Executed: ${cmd}`, timestamp: Date.now(), type: 'info' }
          ]
        }
      });
    }

    setTerminalInput('');
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground p-5 md:p-7 space-y-6 select-text">
      {/* Top Header & Global Git Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-sm bg-[#1E2833] text-[#A0D2EB] border border-[#A0D2EB]/30 flex items-center justify-center shadow-xs">
            <GitBranch className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
                Git Repository
              </h1>
              
              {state.git.isInitialized ? (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-[#1E2833] border border-[#A0D2EB]/20 text-xs font-mono">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span className="text-[#A0D2EB]/70">branch:</span>
                    <strong className="text-foreground">{currentBranch}</strong>
                  </div>

                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] font-mono px-2 py-0.5",
                      workingTree.isClean 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                        : "bg-[#E9C46A]/10 text-[#E9C46A] border-[#E9C46A]/30"
                    )}
                  >
                    {workingTree.isClean ? "Clean Working Tree" : `${workingTree.changedCount} Uncommitted Changes`}
                  </Badge>

                  {state.git.sync.ahead > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-primary/15 text-primary-foreground font-semibold border-primary/30 flex items-center gap-1">
                      <ArrowUp className="size-3 text-primary-foreground" />
                      {state.git.sync.ahead} Ahead of Remote
                    </Badge>
                  )}
                </>
              ) : (
                <Badge variant="outline" className="text-[10px] font-mono text-[#A0D2EB]/80 bg-[#A0D2EB]/10 border-[#A0D2EB]/20">
                  Uninitialized
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full Git version control for agent prompts, skills, workflows, and specifications.
            </p>
          </div>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {state.git.isInitialized && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePull}
                disabled={isPulling}
                className="text-xs font-mono border-[#A0D2EB]/25 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1.5"
                title="Pull changes from remote repository"
              >
                <RefreshCw className={cn("size-3.5", isPulling && "animate-spin")} />
                <span className="hidden sm:inline">Pull</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handlePush}
                disabled={isPushing}
                className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs font-mono gap-1.5 shadow-xs"
                title="Push commits to remote upstream"
              >
                <ArrowUp className={cn("size-3.5", isPushing && "animate-bounce")} />
                <span>Push ({state.git.sync.ahead})</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoteModal(true)}
                className="text-xs font-mono border-[#A0D2EB]/25 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1.5"
                title="Configure upstream remote repository"
              >
                <Settings2 className="size-3.5" />
                <span className="hidden sm:inline">Remote</span>
              </Button>
            </>
          )}

          <Button 
            variant="outline"
            size="sm" 
            onClick={() => navigate('/export')}
            className="border-border text-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs"
          >
            <Download className="size-3.5 text-[#A0D2EB]" />
            <span>Export ZIP</span>
          </Button>
        </div>
      </div>

      {/* Temporary Notification Banner */}
      {syncFeedback && (
        <div className="px-3.5 py-2 rounded-sm bg-[#1E2833] border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* SCENARIO 1: NOT INITIALIZED */}
      {!state.git.isInitialized ? (
        <Card className="bg-[#1E2833] border-[#A0D2EB]/20 rounded-sm shadow-md">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-sm bg-[#A0D2EB]/10 text-[#A0D2EB] flex items-center justify-center">
                <FolderGit2 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Initialize Git Repository for {state.manifest.name || "Agent"}
                </CardTitle>
                <CardDescription className="text-xs text-[#A0D2EB]/70">
                  Track your agent specifications, rules, prompts, and skills in standard Git version control.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium">Repository Name</label>
                <Input 
                  value={repoName} 
                  readOnly 
                  className="h-8.5 font-mono text-xs bg-background border-border/80 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium">Initial Default Branch</label>
                <Input 
                  value="main" 
                  readOnly 
                  className="h-8.5 font-mono text-xs bg-background border-border/80 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium">Author Name</label>
                <Input 
                  value={authorName} 
                  onChange={e => setAuthorName(e.target.value)}
                  className="h-8.5 font-sans text-xs bg-background border-border/80 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium">Author Email</label>
                <Input 
                  value={authorEmail} 
                  onChange={e => setAuthorEmail(e.target.value)}
                  className="h-8.5 font-mono text-xs bg-background border-border/80 text-foreground"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-sm bg-background/60 border border-border/60 space-y-2">
              <span className="text-[11px] font-mono uppercase font-bold text-[#A0D2EB]/70 flex items-center gap-1.5">
                <FileText className="size-3 text-[#A0D2EB]" /> Baseline Repository Layout
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-foreground border-border/80">.gitagent/manifest.json</Badge>
                <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-foreground border-border/80">SOUL.md</Badge>
                <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-foreground border-border/80">RULES.md</Badge>
                <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-foreground border-border/80">PROMPT.md</Badge>
                <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-foreground border-border/80">.gitignore</Badge>
                <Badge variant="outline" className="text-[10px] font-mono bg-card/60 text-foreground border-border/80">skills/*</Badge>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button 
                onClick={handleInitRepo}
                className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs h-9 px-5 rounded-sm shadow-xs flex items-center gap-2"
              >
                <FolderGit2 className="size-4 text-primary-foreground" />
                Initialize Git Repository (`git init`)
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* SCENARIO 2: INITIALIZED REPOSITORY */
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Working Tree & Commit Action (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Working Tree Changes & Staging */}
            <Card className="bg-card border-border/80 rounded-sm shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-[#A0D2EB]/80 flex items-center gap-2">
                    <FileText className="size-3.5 text-[#A0D2EB]" /> Working Tree Status
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparing current agent files with HEAD commit ({headCommit?.hash})
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {workingTree.changedCount} file{workingTree.changedCount === 1 ? '' : 's'} changed
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {workingTree.isClean ? (
                  <div className="py-7 text-center border border-dashed border-[#A0D2EB]/20 rounded-sm bg-[#1A2630]/40">
                    <CheckCircle2 className="size-7 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-mono text-emerald-300 font-medium">Working tree is clean</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      All files match HEAD commit {headCommit?.hash}. Make edits in the Builder or File Editor to stage new changes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {workingTree.files.map(file => (
                      <div 
                        key={file.path}
                        className="flex items-center justify-between px-3 py-2 rounded-sm bg-[#141A20]/70 border border-border/60 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] px-1 py-0 uppercase font-bold",
                              file.status === 'modified' ? "text-[#E9C46A] border-[#E9C46A]/40 bg-[#E9C46A]/10" :
                              file.status === 'added' ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" :
                              "text-rose-400 border-rose-500/40 bg-rose-500/10"
                            )}
                          >
                            {file.status === 'modified' ? 'M' : file.status === 'added' ? 'A' : 'D'}
                          </Badge>
                          <span className="text-foreground truncate">{file.path}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-[10px]">
                          {file.additions > 0 && <span className="text-emerald-400">+{file.additions}</span>}
                          {file.deletions > 0 && <span className="text-rose-400">-{file.deletions}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Commit Form */}
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium">
                        Commit Message
                      </label>
                      <div className="flex items-center gap-1">
                        {['feat:', 'fix:', 'refactor:', 'docs:'].map(prefix => (
                          <button
                            key={prefix}
                            type="button"
                            onClick={() => setCommitMessage(prev => prev.startsWith(prefix) ? prev : `${prefix} ${prev}`)}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-[#1E2833] border border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/15"
                          >
                            {prefix}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea 
                      rows={2}
                      placeholder="e.g., feat: add research skills and compliance boundary rules"
                      value={commitMessage}
                      onChange={e => setCommitMessage(e.target.value)}
                      className="font-sans text-xs bg-background border-border/80 text-foreground resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground truncate">
                      <span className="text-[#A0D2EB]/60">Author:</span>
                      <span className="text-foreground truncate">{authorName}</span>
                    </div>

                    <Button
                      onClick={handleCommit}
                      disabled={!commitMessage.trim()}
                      className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs h-8 px-4 rounded-sm shadow-xs shrink-0 flex items-center gap-1.5"
                    >
                      <GitCommitHorizontal className="size-3.5 text-primary-foreground" />
                      Commit to {currentBranch}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commit History Timeline */}
            <Card className="bg-card border-border/80 rounded-sm shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-[#A0D2EB]/80 flex items-center gap-2">
                  <HistoryIcon className="size-3.5 text-[#A0D2EB]" /> Commit Log ({state.git.commits.length})
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground">Click to inspect or restore</span>
              </CardHeader>

              <CardContent className="p-4 space-y-2.5 max-h-72 overflow-y-auto">
                {state.git.commits.map((commit, idx) => {
                  const isHead = commit.hash === state.git.head;
                  const isSelected = commit.hash === selectedCommit?.hash;

                  return (
                    <div
                      key={commit.hash}
                      onClick={() => setSelectedCommitHash(commit.hash)}
                      className={cn(
                        "p-3 rounded-sm border transition-all cursor-pointer space-y-1.5",
                        isSelected 
                          ? "bg-[#1E2833] border-[#A0D2EB]/40 shadow-xs" 
                          : "bg-background/50 border-border/60 hover:bg-[#1E2833]/60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-[#A0D2EB] bg-[#A0D2EB]/10 px-1.5 py-0.2 rounded-sm shrink-0">
                            {commit.hash}
                          </span>
                          {isHead && (
                            <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              HEAD
                            </Badge>
                          )}
                          <span className="font-sans text-xs font-semibold text-foreground truncate">
                            {commit.message}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreCommit(commit.hash);
                            }}
                            title="Checkout/restore workspace to this commit"
                            className="text-[#A0D2EB]/70 hover:text-foreground hover:bg-[#A0D2EB]/10"
                          >
                            <RotateCcw className="size-3" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(commit.hash, `hash-${commit.hash}`);
                            }}
                            className="text-[#A0D2EB]/70 hover:text-foreground hover:bg-[#A0D2EB]/10"
                          >
                            {copied === `hash-${commit.hash}` ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                        <span>{commit.author.name}</span>
                        <span>{formatDistanceToNow(commit.timestamp, { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Remotes, Branches & Terminal (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Remote Repository Configuration Card */}
            <Card className="bg-card border-border/80 rounded-sm shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-[#A0D2EB]/80 flex items-center gap-2">
                  <Github className="size-3.5 text-[#A0D2EB]" /> Remote Origin
                </CardTitle>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowRemoteModal(true)}
                  className="text-[10px] font-mono text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
                >
                  Edit
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-[#A0D2EB]/60 uppercase">Remote URL</span>
                  <div className="relative group bg-muted/40 border border-border/60 rounded-sm p-2 text-xs font-mono truncate text-foreground pr-8">
                    {state.git.remotes[0]?.url || 'No remote configured'}
                    <button
                      onClick={() => handleCopy(state.git.remotes[0]?.url || '', 'remote-url')}
                      className="absolute right-2 top-2 text-[#A0D2EB]/70 hover:text-foreground"
                    >
                      {copied === 'remote-url' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[#A0D2EB]/60">Sync Status:</span>
                    <span className="text-foreground">
                      {state.git.sync.ahead > 0 ? `${state.git.sync.ahead} ahead` : 'In sync'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button 
                      size="xs"
                      variant="outline" 
                      onClick={handlePull}
                      disabled={isPulling}
                      className="text-xs font-mono border-[#A0D2EB]/30 text-[#A0D2EB] hover:bg-[#A0D2EB]/10"
                    >
                      <ArrowDown className="size-3" /> Pull
                    </Button>

                    <Button 
                      size="xs"
                      onClick={handlePush}
                      disabled={isPushing}
                      className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs font-mono shadow-xs"
                    >
                      <ArrowUp className="size-3 text-primary-foreground" /> Push
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branch Management Card */}
            <Card className="bg-card border-border/80 rounded-sm shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-mono font-bold uppercase tracking-wider text-[#A0D2EB]/80 flex items-center gap-2">
                  <GitBranch className="size-3.5 text-[#A0D2EB]" /> Branches ({state.git.branches.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowNewBranchModal(true)}
                  className="text-[10px] font-mono text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1"
                >
                  <Plus className="size-3" /> New Branch
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-2">
                {state.git.branches.map(branch => {
                  const isCurrent = branch === currentBranch;
                  return (
                    <div 
                      key={branch}
                      onClick={() => handleSwitchBranch(branch)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-sm border text-xs font-mono transition-all cursor-pointer",
                        isCurrent 
                          ? "bg-[#1E2833] border-[#A0D2EB]/40 font-bold text-foreground" 
                          : "bg-background/40 border-border/60 text-muted-foreground hover:bg-[#1E2833]/60 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch className={cn("size-3.5", isCurrent ? "text-[#A0D2EB]" : "text-muted-foreground")} />
                        <span>{branch}</span>
                      </div>
                      {isCurrent && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                          Active
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Interactive Git Terminal Console */}
            <Card className="bg-[#141A20] border-border/80 rounded-sm shadow-xs overflow-hidden">
              <CardHeader className="p-3 bg-[#172129] border-b border-border/60 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-3.5 text-[#A0D2EB]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0D2EB] font-bold">
                    Git Terminal Console
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono text-muted-foreground">ready</span>
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-2">
                <div className="h-44 overflow-y-auto font-mono text-[11px] space-y-1.5 text-foreground pr-1">
                  {state.git.terminalLogs.slice(-8).map(log => (
                    <div key={log.id} className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[#A0D2EB]">
                        <span className="text-muted-foreground">$</span>
                        <span className="font-semibold">{log.command}</span>
                      </div>
                      <pre className={cn(
                        "text-[10px] pl-3 whitespace-pre-wrap leading-relaxed",
                        log.type === 'success' ? "text-emerald-400" :
                        log.type === 'warn' ? "text-[#E9C46A]" :
                        log.type === 'error' ? "text-rose-400" :
                        "text-[#A0D2EB]/70"
                      )}>
                        {log.output}
                      </pre>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleTerminalSubmit} className="pt-2 border-t border-border/60 flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">$</span>
                  <Input 
                    placeholder="e.g. git status, git log, git push, git branch"
                    value={terminalInput}
                    onChange={e => setTerminalInput(e.target.value)}
                    className="h-7 text-xs font-mono bg-background/80 border-border/60 text-foreground"
                  />
                  <Button 
                    type="submit" 
                    size="icon-xs"
                    className="bg-primary hover:brightness-105 text-primary-foreground font-semibold"
                  >
                    <Play className="size-3 text-primary-foreground" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal: New Branch */}
      {showNewBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1E2833] border border-[#A0D2EB]/30 rounded-sm w-full max-w-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <GitBranch className="size-4 text-[#A0D2EB]" /> Create New Git Branch
              </h3>
              <button 
                onClick={() => setShowNewBranchModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium">Branch Name</label>
              <Input 
                placeholder="e.g., feature/memory-engine or patch/guardrails"
                value={newBranchInput}
                onChange={e => {
                  setNewBranchInput(e.target.value);
                  setBranchError(null);
                }}
                onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                className="h-8.5 text-xs font-mono bg-background border-border/80 text-foreground"
                autoFocus
              />
              {branchError && (
                <p className="text-[11px] font-mono text-rose-400">{branchError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowNewBranchModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleCreateBranch}
                disabled={!newBranchInput.trim()}
                className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs"
              >
                Create Branch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Remote Configuration */}
      {showRemoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1E2833] border border-[#A0D2EB]/30 rounded-sm w-full max-w-lg p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Settings2 className="size-4 text-[#A0D2EB]" /> Configure Remote Repository (origin)
              </h3>
              <button 
                onClick={() => setShowRemoteModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-mono text-[#A0D2EB]/80 font-medium">Provider</label>
                <div className="flex gap-2">
                  {(['github', 'gitlab', 'bitbucket', 'custom'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRemoteProvider(p)}
                      className={cn(
                        "px-3 py-1.5 rounded-sm border font-mono text-xs capitalize transition-all",
                        remoteProvider === p 
                          ? "bg-[#A0D2EB]/20 text-white border-[#A0D2EB]/50 font-bold" 
                          : "bg-background/40 border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[#A0D2EB]/80 font-medium">Remote URL (HTTPS / SSH)</label>
                <Input 
                  value={remoteUrlInput}
                  onChange={e => setRemoteUrlInput(e.target.value)}
                  placeholder="https://github.com/org/repo.git or git@gitlab.com:org/repo.git"
                  className="h-8.5 text-xs font-mono bg-background border-border/80 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[#A0D2EB]/80 font-medium">Personal Access Token (PAT) / Key (Optional)</label>
                <Input 
                  type="password"
                  value={remoteToken}
                  onChange={e => setRemoteToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx or glpat-xxxxxxxxxxxx"
                  className="h-8.5 text-xs font-mono bg-background border-border/80 text-foreground"
                />
                <p className="text-[10px] text-muted-foreground">
                  Credentials are used client-side for repository authentication with your Git remote.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowRemoteModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveRemote}
                disabled={!remoteUrlInput.trim()}
                className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs"
              >
                Save Remote
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
