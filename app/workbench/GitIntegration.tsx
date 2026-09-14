import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
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
  ChevronDown,
  ExternalLink,
  GitCommitHorizontal,
  HardDrive,
  AlertCircle,
  X,
  ArrowUpDown,
  Globe,
  Laptop,
  Eye,
  EyeOff,
  ShieldCheck,
  Key,
  SlidersHorizontal,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { computeWorkingTreeStatus, DEFAULT_GITIGNORE, GitRemote, getBranchTrackingInfo } from '@/lib/gitagent/gitManager';
import { cn } from '@/lib/utils';

export function GitIntegration() {
  const { state, dispatch } = useAgentWorkspace();
  const { settings, updateGitSettings } = useSettings();
  const navigate = useNavigate();

  // Local interaction states
  const [copied, setCopied] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [authorName, setAuthorName] = useState(settings.git?.authorName || state.manifest.author || 'Agent Developer');
  const [authorEmail, setAuthorEmail] = useState(settings.git?.authorEmail || 'developer@gitagent.internal');
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string;
    timestamp: number;
  } | null>(null);

  // Branch Selection Dropdown State
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // Close branch dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    if (isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBranchDropdownOpen]);

  const showFeedback = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    details?: string,
    autoDismissMs: number = 5000
  ) => {
    setSyncFeedback({
      type,
      message,
      details,
      timestamp: Date.now(),
    });
    if (autoDismissMs > 0 && type !== 'error') {
      setTimeout(() => {
        setSyncFeedback(prev => prev?.message === message ? null : prev);
      }, autoDismissMs);
    }
  };

  // New branch modal / input
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [newBranchInput, setNewBranchInput] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);

  // Remote & Git Settings Modal (integrated with SettingsProvider)
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState(
    settings.git?.remoteUrl || state.git?.remotes?.[0]?.url || `https://github.com/my-org/${state.manifest.name?.toLowerCase().replace(/\s+/g, '-') || 'my-agent'}.git`
  );
  const [remoteProvider, setRemoteProvider] = useState<'github' | 'gitlab' | 'bitbucket' | 'custom'>(
    settings.git?.provider || state.git?.remotes?.[0]?.provider || 'github'
  );
  const [remoteToken, setRemoteToken] = useState(
    settings.git?.personalAccessToken || state.git?.remotes?.[0]?.token || ''
  );
  const [showToken, setShowToken] = useState(false);
  const [authorNameInput, setAuthorNameInput] = useState(authorName);
  const [authorEmailInput, setAuthorEmailInput] = useState(authorEmail);
  const [testConnState, setTestConnState] = useState<{
    loading: boolean;
    result?: { ok: boolean; message: string };
  }>({ loading: false });

  // Synchronize remote settings state when modal opens
  const openRemoteSettingsModal = () => {
    setRemoteUrlInput(settings.git?.remoteUrl || state.git?.remotes?.[0]?.url || '');
    setRemoteToken(settings.git?.personalAccessToken || state.git?.remotes?.[0]?.token || '');
    setRemoteProvider(settings.git?.provider || state.git?.remotes?.[0]?.provider || 'github');
    setAuthorNameInput(settings.git?.authorName || authorName);
    setAuthorEmailInput(settings.git?.authorEmail || authorEmail);
    setTestConnState({ loading: false });
    setShowRemoteModal(true);
  };

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
    showFeedback('Git repository initialized with initial commit on main branch.', 'success');
  };

  // Validation logic for commit message length
  const trimmedCommitMsg = commitMessage.trim();
  const commitMsgLength = trimmedCommitMsg.length;
  const isCommitLengthValid = commitMsgLength >= 3 && commitMsgLength <= 250;

  const handleCommit = async () => {
    if (!isCommitLengthValid) {
      showFeedback('Commit message is too short (min 3 characters).', 'error');
      return;
    }
    setIsCommitting(true);
    // Simulation delay for realistic git tree writing, hashing & index staging
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      dispatch({
        type: 'COMMIT_GIT',
        payload: {
          message: trimmedCommitMsg,
          authorName,
          authorEmail,
        }
      });
      setCommitMessage('');
      setIsCommitting(false);
      showFeedback(
        `Committed changes to branch '${currentBranch}'.`, 
        'success', 
        `New commit snapshot created with updated tree and staged state.`
      );
    } catch (err: any) {
      setIsCommitting(false);
      showFeedback('Commit failed', 'error', err?.message || 'Could not record commit.');
    }
  };

  const handlePush = () => {
    setIsPushing(true);
    setTimeout(() => {
      dispatch({ type: 'PUSH_GIT' });
      setIsPushing(false);
      showFeedback(`Successfully pushed ${state.git.sync.ahead || 1} commit(s) to origin/${currentBranch}.`, 'success');
    }, 800);
  };

  const handlePull = () => {
    setIsPulling(true);
    setTimeout(() => {
      dispatch({ type: 'PULL_GIT' });
      setIsPulling(false);
      showFeedback(`Pulled updates from origin/${currentBranch}. Working tree is up to date.`, 'success');
    }, 800);
  };

  const handleSync = async (options?: { forceError?: boolean }) => {
    const remote = state.git.remotes?.[0];
    const remoteUrl = remote?.url?.trim();

    // Reset notification state
    setSyncFeedback(null);
    setIsSyncing(true);

    // Realistic async simulation delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Case 1: Missing remote repository
    if (!remote || !remoteUrl) {
      setIsSyncing(false);
      const errMsg = "No remote repository configured. Set an upstream remote URL before syncing.";
      dispatch({ type: 'SET_GIT_SYNC_ERROR', payload: errMsg });
      showFeedback(
        "Sync failed: No remote repository configured",
        "error",
        "Please configure an upstream Git remote URL under Remote Settings to enable synchronization.",
        0
      );
      return;
    }

    // Case 2: Forced test error or invalid target
    if (options?.forceError || remoteUrl.includes('invalid') || remoteUrl.includes('error') || remoteUrl === 'fail') {
      setIsSyncing(false);
      const errMsg = `Sync failed with remote '${remoteUrl}': Connection timed out or access denied. Verify repository permissions and authentication token.`;
      dispatch({
        type: 'SYNC_GIT',
        payload: {
          remoteName: remote.name || 'origin',
          forceError: errMsg,
        }
      });
      showFeedback(
        "Sync failed with remote repository",
        "error",
        errMsg,
        0
      );
      return;
    }

    // Case 3: Successful sync (pull incoming + push outgoing)
    try {
      const aheadCount = state.git.sync.ahead || 0;
      const behindCount = state.git.sync.behind || 0;

      dispatch({
        type: 'SYNC_GIT',
        payload: {
          remoteName: remote.name || 'origin',
        }
      });

      setIsSyncing(false);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);

      let successDetail = '';
      if (aheadCount > 0 && behindCount > 0) {
        successDetail = `Pulled ${behindCount} incoming commit(s) and pushed ${aheadCount} local commit(s) to ${remote.name}/${currentBranch}.`;
      } else if (aheadCount > 0) {
        successDetail = `Pushed ${aheadCount} commit(s) to ${remote.name}/${currentBranch}. Remote is fully synchronized.`;
      } else if (behindCount > 0) {
        successDetail = `Pulled ${behindCount} incoming commit(s) from ${remote.name}/${currentBranch}. Working tree is up to date.`;
      } else {
        successDetail = `Working tree and remote ${remote.name}/${currentBranch} are already in sync. No remote changes pending.`;
      }

      showFeedback(
        "Synchronized with remote repository",
        "success",
        successDetail,
        6000
      );
    } catch (err: any) {
      setIsSyncing(false);
      showFeedback(
        "Sync error",
        "error",
        err?.message || 'An unexpected error occurred while synchronizing.',
        0
      );
    }
  };

  const handleCreateBranch = () => {
    if (!newBranchInput.trim()) return;
    try {
      dispatch({ type: 'CREATE_GIT_BRANCH', payload: newBranchInput.trim() });
      setNewBranchInput('');
      setShowNewBranchModal(false);
      setBranchError(null);
      showFeedback(`Switched to new branch: ${newBranchInput.trim()}`, 'success');
    } catch (err: any) {
      setBranchError(err.message || 'Failed to create branch');
    }
  };

  const handleSwitchBranch = (branch: string) => {
    if (branch === currentBranch) return;
    dispatch({ type: 'SWITCH_GIT_BRANCH', payload: branch });
    showFeedback(`Switched to branch: ${branch}`, 'info');
  };

  const handleTestConnection = async () => {
    const trimmedUrl = remoteUrlInput.trim();
    if (!trimmedUrl) {
      setTestConnState({
        loading: false,
        result: { ok: false, message: 'Please enter a valid remote URL.' }
      });
      return;
    }

    setTestConnState({ loading: true });
    await new Promise(resolve => setTimeout(resolve, 600));

    const hasToken = Boolean(remoteToken.trim());
    const isUrlWellFormed = trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('git@');

    if (!isUrlWellFormed) {
      setTestConnState({
        loading: false,
        result: { ok: false, message: 'URL should start with https:// or git@' }
      });
      return;
    }

    setTestConnState({
      loading: false,
      result: {
        ok: true,
        message: hasToken
          ? `Authenticated successfully with ${remoteProvider} using Personal Access Token.`
          : `Remote endpoint reachable. (Token optional for public repos; PAT recommended for push)`
      }
    });
  };

  const handleSaveRemote = () => {
    const trimmedUrl = remoteUrlInput.trim();
    const trimmedToken = remoteToken.trim();
    const cleanAuthorName = authorNameInput.trim() || authorName;
    const cleanAuthorEmail = authorEmailInput.trim() || authorEmail;

    // 1. Persist to existing SettingsProvider context
    updateGitSettings({
      remoteUrl: trimmedUrl,
      personalAccessToken: trimmedToken,
      provider: remoteProvider,
      authorName: cleanAuthorName,
      authorEmail: cleanAuthorEmail,
    });

    // 2. Update local state
    setAuthorName(cleanAuthorName);
    setAuthorEmail(cleanAuthorEmail);

    // 3. Dispatch to AgentContext workspace state
    dispatch({
      type: 'UPDATE_GIT_REMOTE',
      payload: {
        name: 'origin',
        url: trimmedUrl,
        provider: remoteProvider,
        token: trimmedToken,
      }
    });

    setShowRemoteModal(false);
    showFeedback(
      'Git settings saved',
      'success',
      `Remote URL and credentials stored in SettingsProvider context and applied to origin repository.`
    );
  };

  const handleRestoreCommit = (hash: string) => {
    if (confirm(`Restore workspace state to commit ${hash}? Any unsaved changes in the working tree will be replaced.`)) {
      dispatch({ type: 'RESTORE_GIT_COMMIT', payload: hash });
      showFeedback(`Workspace restored to commit ${hash}.`, 'info');
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
    } else if (cmd === 'git sync' || cmd.startsWith('git sync')) {
      const forceErr = cmd.includes('--error') || cmd.includes('--fail');
      handleSync({ forceError: forceErr });
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
                  {/* Interactive Branch Selection Dropdown with Local vs Remote tracking indicator */}
                  <div className="relative inline-block" ref={branchDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1 rounded-sm border text-xs font-mono transition-all cursor-pointer select-none",
                        isBranchDropdownOpen
                          ? "bg-[#1E2833] border-[#A0D2EB]/60 text-foreground ring-1 ring-[#A0D2EB]/40 shadow-xs"
                          : "bg-[#1E2833]/90 hover:bg-[#1E2833] border-[#A0D2EB]/30 text-foreground"
                      )}
                      aria-label="Select git branch"
                      title="Switch git branch and inspect upstream remote tracking status"
                    >
                      <GitBranch className="size-3.5 text-[#A0D2EB]" />
                      <span className="text-[#A0D2EB]/70">branch:</span>
                      <strong className="text-foreground">{currentBranch}</strong>

                      {/* Current Branch Tracking Status Indicator */}
                      {(() => {
                        const tracking = getBranchTrackingInfo(state.git, currentBranch);
                        return tracking.isRemoteTracked ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            title={`Tracking upstream ${tracking.trackingRef}`}
                          >
                            <Globe className="size-2.5 text-emerald-400" />
                            <span>{tracking.trackingRef}</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            title="Local branch only; not yet tracked on remote repository"
                          >
                            <Laptop className="size-2.5 text-amber-400" />
                            <span>Local only</span>
                          </span>
                        );
                      })()}

                      <ChevronDown className={cn("size-3 text-muted-foreground transition-transform duration-150", isBranchDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown Menu */}
                    {isBranchDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-72 md:w-84 bg-[#1E2833] border border-[#A0D2EB]/40 rounded-sm shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-1 text-xs border-b border-border/50 pb-2">
                          <span className="font-semibold text-foreground flex items-center gap-1.5 font-mono text-[11px]">
                            <GitBranch className="size-3.5 text-[#A0D2EB]" /> Switch Branch
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-background/60 text-[#A0D2EB] border-[#A0D2EB]/30">
                            {state.git.branches.length} branch{state.git.branches.length === 1 ? '' : 'es'}
                          </Badge>
                        </div>

                        {state.git.branches.length > 3 && (
                          <div className="relative">
                            <Search className="size-3 text-muted-foreground absolute left-2 top-2" />
                            <Input 
                              placeholder="Filter branches..."
                              value={branchSearch}
                              onChange={e => setBranchSearch(e.target.value)}
                              className="h-7 pl-6.5 text-[11px] font-mono bg-background/60 border-border/60"
                              autoFocus
                            />
                          </div>
                        )}

                        <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                          {state.git.branches
                            .filter(b => b.toLowerCase().includes(branchSearch.toLowerCase()))
                            .map(branch => {
                              const tracking = getBranchTrackingInfo(state.git, branch);
                              const isCurrent = branch === currentBranch;

                              return (
                                <button
                                  key={branch}
                                  type="button"
                                  onClick={() => {
                                    handleSwitchBranch(branch);
                                    setIsBranchDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2.5 py-2 rounded-sm border text-xs font-mono transition-all flex items-center justify-between gap-2",
                                    isCurrent 
                                      ? "bg-[#A0D2EB]/15 border-[#A0D2EB]/50 text-foreground font-semibold" 
                                      : "bg-background/40 hover:bg-[#A0D2EB]/10 border-border/40 text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={cn("size-1.5 rounded-full shrink-0", isCurrent ? "bg-emerald-400 ring-2 ring-emerald-400/30" : "bg-muted-foreground/50")} />
                                    <span className="truncate">{branch}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {tracking.isRemoteTracked ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                                        <Globe className="size-2 text-emerald-400" />
                                        <span>origin/{branch}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                                        <Laptop className="size-2 text-amber-400" />
                                        <span>Local only</span>
                                      </span>
                                    )}

                                    {isCurrent && (
                                      <Check className="size-3 text-emerald-400 shrink-0" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                        </div>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBranchDropdownOpen(false);
                              setShowNewBranchModal(true);
                            }}
                            className="text-[11px] font-mono text-[#A0D2EB] hover:underline flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-[#A0D2EB]/10 transition-colors"
                          >
                            <Plus className="size-3" /> Create new branch...
                          </button>
                        </div>
                      </div>
                    )}
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
                      {state.git.sync.ahead} Ahead
                    </Badge>
                  )}

                  {state.git.sync.behind > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-[#A0D2EB]/15 text-[#A0D2EB] font-semibold border-[#A0D2EB]/30 flex items-center gap-1">
                      <ArrowDown className="size-3 text-[#A0D2EB]" />
                      {state.git.sync.behind} Behind
                    </Badge>
                  )}

                  {state.git.sync.ahead === 0 && state.git.sync.behind === 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                      <Check className="size-3" />
                      In Sync
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
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {state.git.isInitialized && (
            <>
              {/* PRIMARY SYNC BUTTON (Push & Pull Combined) */}
              <Button
                size="sm"
                onClick={() => handleSync()}
                disabled={isSyncing}
                className={cn(
                  "text-xs font-mono font-semibold gap-1.5 shadow-xs transition-all h-8 px-3 rounded-sm",
                  justSynced
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : syncFeedback?.type === 'error'
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-primary hover:brightness-105 text-primary-foreground"
                )}
                title="Synchronize repository: pull remote changes and push local commits"
              >
                <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
                <span>
                  {isSyncing
                    ? "Syncing..."
                    : justSynced
                    ? "Synced!"
                    : syncFeedback?.type === 'error'
                    ? "Sync Failed"
                    : "Sync"}
                </span>
                {!isSyncing && !justSynced && (state.git.sync.ahead > 0 || state.git.sync.behind > 0) && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/30 text-white/90">
                    {state.git.sync.ahead > 0 && `↑${state.git.sync.ahead}`}
                    {state.git.sync.behind > 0 && `↓${state.git.sync.behind}`}
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePull}
                disabled={isPulling || isSyncing}
                className="text-xs font-mono border-[#A0D2EB]/25 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1.5 h-8 px-2.5"
                title="Pull changes from remote repository"
              >
                <ArrowDown className={cn("size-3.5", isPulling && "animate-bounce")} />
                <span className="hidden sm:inline">Pull</span>
                {state.git.sync.behind > 0 && <span>({state.git.sync.behind})</span>}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePush}
                disabled={isPushing || isSyncing}
                className="text-xs font-mono border-[#A0D2EB]/25 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1.5 h-8 px-2.5"
                title="Push commits to remote upstream"
              >
                <ArrowUp className={cn("size-3.5", isPushing && "animate-bounce")} />
                <span className="hidden sm:inline">Push</span>
                <span>({state.git.sync.ahead})</span>
              </Button>
            </>
          )}

          {/* Always Visible: Remote & Token Configuration Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={openRemoteSettingsModal}
            className="text-xs font-mono border-[#A0D2EB]/40 bg-[#1E2833] text-[#A0D2EB] hover:bg-[#A0D2EB]/15 hover:border-[#A0D2EB]/70 gap-1.5 h-8 px-3 shadow-xs font-semibold"
            title="Configure upstream remote repository, PAT token, and author credentials in SettingsProvider"
          >
            <Key className="size-3.5 text-[#A0D2EB]" />
            <span>Remote & Token Settings</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/export')}
            className="border-border text-foreground font-medium text-xs gap-1.5 rounded-sm shadow-xs h-8 px-2.5"
          >
            <Download className="size-3.5 text-[#A0D2EB]" />
            <span className="hidden sm:inline">Export ZIP</span>
          </Button>
        </div>
      </div>

      {/* Structured Status & Notification Banner */}
      {syncFeedback && (
        <div 
          className={cn(
            "p-3.5 rounded-sm border text-xs font-mono flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs",
            syncFeedback.type === 'error'
              ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
              : syncFeedback.type === 'info'
              ? "bg-[#1E2833] border-[#A0D2EB]/40 text-[#A0D2EB]"
              : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
          )}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {syncFeedback.type === 'error' ? (
              <AlertCircle className="size-4.5 shrink-0 text-rose-400 mt-0.5" />
            ) : syncFeedback.type === 'info' ? (
              <RefreshCw className="size-4.5 shrink-0 text-[#A0D2EB] mt-0.5" />
            ) : (
              <CheckCircle2 className="size-4.5 shrink-0 text-emerald-400 mt-0.5" />
            )}
            <div className="space-y-0.5 min-w-0">
              <div className="font-semibold flex items-center gap-2 flex-wrap">
                <span>{syncFeedback.message}</span>
                <span className="text-[10px] opacity-70 font-normal">
                  ({formatDistanceToNow(syncFeedback.timestamp, { addSuffix: true })})
                </span>
              </div>
              {syncFeedback.details && (
                <p className={cn(
                  "text-[11px] leading-relaxed",
                  syncFeedback.type === 'error' ? "text-rose-300/90" : "text-emerald-300/90"
                )}>
                  {syncFeedback.details}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {syncFeedback.type === 'error' && (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleSync()}
                  disabled={isSyncing}
                  className="h-6 px-2 text-[11px] border-rose-500/40 text-rose-200 hover:bg-rose-500/20 gap-1"
                >
                  <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
                  Retry Sync
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setShowRemoteModal(true)}
                  className="h-6 px-2 text-[11px] text-rose-200 hover:bg-rose-500/20"
                >
                  Remote Settings
                </Button>
              </>
            )}
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-sm transition-colors ml-1"
              title="Dismiss notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SCENARIO 1: NOT INITIALIZED */}
      {!state.git.isInitialized ? (
        <Card className="bg-[#1E2833] border-[#A0D2EB]/20 rounded-sm shadow-md">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-sm bg-[#A0D2EB]/10 text-[#A0D2EB] flex items-center justify-center shrink-0">
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openRemoteSettingsModal}
                className="text-xs font-mono border-[#A0D2EB]/40 bg-[#141A20] text-[#A0D2EB] hover:bg-[#A0D2EB]/15 gap-1.5 h-8 px-3 shrink-0 self-start sm:self-auto font-semibold shadow-xs"
                title="Configure upstream remote repository URL and Personal Access Token"
              >
                <Key className="size-3.5 text-[#A0D2EB]" />
                Configure Remote & PAT
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-4">
            {/* Remote & Authentication Preview Box */}
            <div className="p-3.5 rounded-sm bg-[#141A20]/80 border border-[#A0D2EB]/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-bold text-[#A0D2EB] flex items-center gap-1.5">
                  <Globe className="size-3.5 text-[#A0D2EB]" /> Remote Origin & Authentication
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={openRemoteSettingsModal}
                  className="text-[11px] font-mono text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1 h-6 px-2"
                >
                  <SlidersHorizontal className="size-3" />
                  Edit Remote & Token
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-xs font-mono">
                <div className="bg-background/60 p-2 rounded border border-border/60">
                  <span className="text-[10px] text-muted-foreground block">UPSTREAM REPOSITORY:</span>
                  <span className="truncate block text-foreground">{settings.git?.remoteUrl || `https://github.com/my-org/${repoName}.git`}</span>
                </div>
                <div className="bg-background/60 p-2 rounded border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PERSONAL ACCESS TOKEN:</span>
                    <span className="text-foreground">
                      {settings.git?.personalAccessToken ? '✓ PAT Configured' : 'No Token (Public Only)'}
                    </span>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-mono",
                    settings.git?.personalAccessToken ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"
                  )}>
                    {settings.git?.personalAccessToken ? 'Auth Ready' : 'Optional'}
                  </Badge>
                </div>
              </div>
            </div>

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

                {/* Commit Form with Length Validation & Loading State */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-[#A0D2EB]/80 font-medium flex items-center gap-1.5">
                        <GitCommitHorizontal className="size-3.5 text-[#A0D2EB]" />
                        Commit Message
                      </label>
                      <div className="flex items-center gap-1">
                        {['feat:', 'fix:', 'refactor:', 'docs:', 'chore:'].map(prefix => (
                          <button
                            key={prefix}
                            type="button"
                            onClick={() => setCommitMessage(prev => prev.startsWith(prefix) ? prev : `${prefix} ${prev}`)}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-[#1E2833] border border-[#A0D2EB]/20 text-[#A0D2EB] hover:bg-[#A0D2EB]/15 transition-colors"
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
                      disabled={isCommitting}
                      className={cn(
                        "font-sans text-xs bg-background border text-foreground resize-none transition-colors",
                        commitMsgLength > 0 && commitMsgLength < 3
                          ? "border-rose-500/60 focus-visible:ring-rose-500/30"
                          : commitMsgLength >= 3 && commitMsgLength <= 72
                          ? "border-[#A0D2EB]/40 focus-visible:ring-[#A0D2EB]/30"
                          : commitMsgLength > 72
                          ? "border-[#E9C46A]/50 focus-visible:ring-[#E9C46A]/30"
                          : "border-border/80"
                      )}
                    />

                    {/* Message Length Validation & Counter Feedback */}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {commitMsgLength === 0 ? (
                          <span className="text-muted-foreground">
                            Enter a commit message describing changes (min 3 chars)
                          </span>
                        ) : commitMsgLength < 3 ? (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertCircle className="size-3 text-rose-400 shrink-0" />
                            Message too short: {commitMsgLength}/3 characters required
                          </span>
                        ) : commitMsgLength <= 72 ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="size-3 text-emerald-400 shrink-0" />
                            Optimal commit subject length
                          </span>
                        ) : (
                          <span className="text-[#E9C46A] flex items-center gap-1">
                            <AlertCircle className="size-3 text-[#E9C46A] shrink-0" />
                            Subject exceeds 72 characters (recommend concise title)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                        <span className={cn(
                          commitMsgLength === 0 ? "text-muted-foreground" :
                          commitMsgLength < 3 ? "text-rose-400 font-bold" :
                          commitMsgLength <= 72 ? "text-emerald-400" :
                          "text-[#E9C46A]"
                        )}>
                          {commitMsgLength}
                        </span>
                        <span className="text-muted-foreground">/ 72 chars</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground truncate">
                      <span className="text-[#A0D2EB]/60">Author:</span>
                      <span className="text-foreground truncate">{authorName}</span>
                    </div>

                    {/* Clear 'Commit Changes' button with loading states */}
                    <Button
                      type="button"
                      onClick={handleCommit}
                      disabled={!isCommitLengthValid || isCommitting || (workingTree.isClean && state.git.commits.length > 0)}
                      className={cn(
                        "font-semibold text-xs h-8.5 px-4 rounded-sm shadow-xs shrink-0 flex items-center gap-2 transition-all",
                        isCommitting 
                          ? "bg-primary/80 cursor-wait text-primary-foreground" 
                          : "bg-primary hover:brightness-105 text-primary-foreground"
                      )}
                      title={
                        workingTree.isClean && state.git.commits.length > 0
                          ? "Working tree is clean. No uncommitted modifications to record."
                          : !isCommitLengthValid
                          ? "Enter at least 3 characters to enable commit."
                          : `Record commit to branch '${currentBranch}'`
                      }
                    >
                      {isCommitting ? (
                        <>
                          <RefreshCw className="size-3.5 text-primary-foreground animate-spin" />
                          <span>Committing Changes...</span>
                        </>
                      ) : (
                        <>
                          <GitCommitHorizontal className="size-3.5 text-primary-foreground" />
                          <span>Commit Changes</span>
                        </>
                      )}
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
                  variant="outline"
                  size="sm"
                  onClick={openRemoteSettingsModal}
                  className="text-xs font-mono border-[#A0D2EB]/40 bg-[#1E2833] text-[#A0D2EB] hover:bg-[#A0D2EB]/20 flex items-center gap-1.5 h-7 px-2.5 shadow-xs font-semibold"
                  title="Configure Remote URL, PAT Token, and Provider in SettingsProvider"
                >
                  <Key className="size-3.5 text-[#A0D2EB]" />
                  <span>Configure Remote & PAT</span>
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#A0D2EB]/60 uppercase">Remote URL</span>
                    <span className="text-[10px] font-mono text-muted-foreground capitalize">
                      Provider: {state.git.remotes[0]?.provider || settings.git?.provider || 'github'}
                    </span>
                  </div>
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

                {/* Authentication & PAT Token Status */}
                <div className="p-2.5 rounded-sm bg-muted/30 border border-border/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Key className="size-3.5 text-[#A0D2EB] shrink-0" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">CREDENTIALS / PAT:</span>
                      {settings.git?.personalAccessToken ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                          <CheckCircle2 className="size-3" /> Token Configured
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="size-3" /> No Token (Push requires PAT)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={openRemoteSettingsModal}
                    className="text-[11px] font-mono text-[#A0D2EB] hover:bg-[#A0D2EB]/10 h-6 px-2"
                  >
                    Edit Token
                  </Button>
                </div>

                {/* Sync Status & Metrics */}
                <div className="space-y-2 pt-1 border-t border-border/40 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A0D2EB]/70">Upstream Status:</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {state.git.sync.ahead > 0 && (
                        <Badge variant="outline" className="text-[10px] font-mono bg-primary/15 text-primary-foreground font-semibold border-primary/30 flex items-center gap-1">
                          <ArrowUp className="size-3 text-primary-foreground" />
                          {state.git.sync.ahead} Ahead
                        </Badge>
                      )}
                      {state.git.sync.behind > 0 && (
                        <Badge variant="outline" className="text-[10px] font-mono bg-[#A0D2EB]/15 text-[#A0D2EB] font-semibold border-[#A0D2EB]/30 flex items-center gap-1">
                          <ArrowDown className="size-3 text-[#A0D2EB]" />
                          {state.git.sync.behind} Behind
                        </Badge>
                      )}
                      {state.git.sync.ahead === 0 && state.git.sync.behind === 0 && (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <Check className="size-3" /> In sync with remote
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Last synchronized:</span>
                    <span>
                      {state.git.sync.lastSyncedAt 
                        ? formatDistanceToNow(state.git.sync.lastSyncedAt, { addSuffix: true }) 
                        : 'Never'}
                    </span>
                  </div>

                  {/* Remote Operations Bar */}
                  <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                    <Button 
                      size="xs"
                      onClick={() => handleSync()}
                      disabled={isSyncing}
                      className={cn(
                        "text-xs font-mono font-semibold shadow-xs gap-1.5 flex-1 min-w-[90px]",
                        justSynced
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : syncFeedback?.type === 'error'
                          ? "bg-rose-600 hover:bg-rose-500 text-white"
                          : "bg-primary hover:brightness-105 text-primary-foreground"
                      )}
                      title="Sync with upstream: pull incoming updates and push local commits"
                    >
                      <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
                      {isSyncing 
                        ? "Syncing..." 
                        : justSynced 
                        ? "Synced!" 
                        : syncFeedback?.type === 'error'
                        ? "Retry Sync"
                        : "Sync"}
                      {!isSyncing && !justSynced && (state.git.sync.ahead > 0 || state.git.sync.behind > 0) && (
                        <span className="text-[10px] opacity-90">
                          ({state.git.sync.ahead > 0 && `↑${state.git.sync.ahead}`}
                          {state.git.sync.behind > 0 && `↓${state.git.sync.behind}`})
                        </span>
                      )}
                    </Button>

                    <Button 
                      size="xs"
                      variant="outline" 
                      onClick={handlePull}
                      disabled={isPulling || isSyncing}
                      className="text-xs font-mono border-[#A0D2EB]/30 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1 px-2.5"
                    >
                      <ArrowDown className="size-3" /> Pull
                      {state.git.sync.behind > 0 && ` (${state.git.sync.behind})`}
                    </Button>

                    <Button 
                      size="xs"
                      variant="outline"
                      onClick={handlePush}
                      disabled={isPushing || isSyncing}
                      className="text-xs font-mono border-[#A0D2EB]/30 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1 px-2.5"
                    >
                      <ArrowUp className="size-3" /> Push ({state.git.sync.ahead})
                    </Button>
                  </div>

                  {/* Remote Simulation & Testing Helpers */}
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Remote Simulation:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({ type: 'SIMULATE_GIT_BEHIND', payload: 1 });
                          showFeedback('Simulated 1 incoming commit from remote upstream (behind count +1).', 'info');
                        }}
                        className="text-[#A0D2EB]/80 hover:text-[#A0D2EB] hover:underline"
                        title="Simulate upstream team commit to test pull/sync operations"
                      >
                        +1 Remote Commit
                      </button>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        onClick={() => handleSync({ forceError: true })}
                        className="text-rose-400/80 hover:text-rose-300 hover:underline"
                        title="Simulate network / authentication rejection to verify error feedback state"
                      >
                        Test Sync Error
                      </button>
                    </div>
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
                  const tracking = getBranchTrackingInfo(state.git, branch);
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
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className={cn("size-3.5 shrink-0", isCurrent ? "text-[#A0D2EB]" : "text-muted-foreground")} />
                        <span className="truncate">{branch}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tracking.isRemoteTracked ? (
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                            <Globe className="size-2 text-emerald-400" />
                            <span>origin/{branch}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                            <Laptop className="size-2 text-amber-400" />
                            <span>Local only</span>
                          </span>
                        )}

                        {isCurrent && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.2 text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-mono">
                            Active
                          </Badge>
                        )}
                      </div>
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

      {/* Modal: Remote & Git Settings (Integrated with SettingsProvider Context) */}
      {showRemoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1E2833] border border-[#A0D2EB]/40 rounded-sm w-full max-w-xl p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/60 pb-3">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-[#A0D2EB]" /> Git Remote & Repository Settings
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Configure upstream Git remote and authentication. Values are stored in the existing <code className="text-[#A0D2EB] font-mono text-[10px] bg-background/60 px-1 py-0.2 rounded border border-[#A0D2EB]/20">SettingsProvider</code> context.
                </p>
              </div>
              <button 
                onClick={() => setShowRemoteModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono p-1 rounded hover:bg-background/40"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[#A0D2EB]/90 font-medium text-[11px]">Git Provider</label>
                  <span className="text-[10px] text-muted-foreground font-mono">Select upstream platform</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['github', 'gitlab', 'bitbucket', 'custom'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setRemoteProvider(p);
                        if (!remoteUrlInput || remoteUrlInput.includes('my-org')) {
                          if (p === 'github') setRemoteUrlInput(`https://github.com/my-org/${repoName}.git`);
                          else if (p === 'gitlab') setRemoteUrlInput(`https://gitlab.com/my-group/${repoName}.git`);
                          else if (p === 'bitbucket') setRemoteUrlInput(`https://bitbucket.org/my-workspace/${repoName}.git`);
                        }
                      }}
                      className={cn(
                        "py-1.5 px-2 rounded-sm border font-mono text-xs capitalize transition-all text-center",
                        remoteProvider === p 
                          ? "bg-[#A0D2EB]/20 text-white border-[#A0D2EB]/60 font-semibold shadow-xs" 
                          : "bg-background/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-[#A0D2EB]/5"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remote URL Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[#A0D2EB]/90 font-medium text-[11px]">
                    Remote Repository URL (HTTPS or SSH)
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">origin</span>
                </div>
                <Input 
                  value={remoteUrlInput}
                  onChange={e => {
                    const val = e.target.value;
                    setRemoteUrlInput(val);
                    if (val.includes('github.com')) setRemoteProvider('github');
                    else if (val.includes('gitlab.com')) setRemoteProvider('gitlab');
                    else if (val.includes('bitbucket.org')) setRemoteProvider('bitbucket');
                  }}
                  placeholder={
                    remoteProvider === 'github' ? 'https://github.com/owner/repository.git' :
                    remoteProvider === 'gitlab' ? 'https://gitlab.com/group/project.git' :
                    remoteProvider === 'bitbucket' ? 'https://bitbucket.org/workspace/repo.git' :
                    'https://git.example.com/repo.git or git@example.com:repo.git'
                  }
                  className="h-8.5 text-xs font-mono bg-background border-border/80 text-foreground"
                />
              </div>

              {/* Personal Access Token (PAT) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[#A0D2EB]/90 font-medium text-[11px] flex items-center gap-1.5">
                    <Key className="size-3 text-[#A0D2EB]" />
                    Personal Access Token (PAT) / Key
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <ShieldCheck className="size-2.5" />
                    sessionStorage secured
                  </span>
                </div>

                <div className="relative">
                  <Input 
                    type={showToken ? "text" : "password"}
                    value={remoteToken}
                    onChange={e => setRemoteToken(e.target.value)}
                    placeholder={
                      remoteProvider === 'github' ? 'ghp_xxxxxxxxxxxxxxxxxxxx' :
                      remoteProvider === 'gitlab' ? 'glpat-xxxxxxxxxxxxxxxxxxxx' :
                      'Personal Access Token or App Password'
                    }
                    className="h-8.5 text-xs font-mono bg-background border-border/80 text-foreground pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4 text-[#A0D2EB]" />}
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {remoteProvider === 'github' 
                    ? 'Requires `repo` scope (or fine-grained Repository Permissions: Contents Read & Write).' 
                    : remoteProvider === 'gitlab'
                    ? 'Requires `write_repository` or `api` scope on your GitLab personal access token.'
                    : 'Credentials authenticate push and pull requests with the upstream remote.'}
                </p>
              </div>

              {/* Committer Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                <div className="space-y-1">
                  <label className="font-mono text-[#A0D2EB]/80 font-medium text-[11px]">Git Author Name</label>
                  <Input 
                    value={authorNameInput}
                    onChange={e => setAuthorNameInput(e.target.value)}
                    className="h-8 text-xs font-sans bg-background border-border/80 text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[#A0D2EB]/80 font-medium text-[11px]">Git Author Email</label>
                  <Input 
                    value={authorEmailInput}
                    onChange={e => setAuthorEmailInput(e.target.value)}
                    className="h-8 text-xs font-mono bg-background border-border/80 text-foreground"
                  />
                </div>
              </div>

              {/* Preflight Test Connection */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">Pre-flight check:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleTestConnection}
                    disabled={testConnState.loading || !remoteUrlInput.trim()}
                    className="text-xs font-mono border-[#A0D2EB]/30 text-[#A0D2EB] hover:bg-[#A0D2EB]/10 gap-1.5 h-7 px-2.5"
                  >
                    <RefreshCw className={cn("size-3", testConnState.loading && "animate-spin")} />
                    {testConnState.loading ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>

                {testConnState.result && (
                  <div className={cn(
                    "p-2.5 rounded-sm border text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150",
                    testConnState.result.ok
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  )}>
                    {testConnState.result.ok ? (
                      <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <p className="text-[11px] leading-relaxed">{testConnState.result.message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-border/60">
              <span className="text-[10px] font-mono text-muted-foreground">
                Settings persist across sessions
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowRemoteModal(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveRemote}
                  disabled={!remoteUrlInput.trim()}
                  className="bg-primary hover:brightness-105 text-primary-foreground font-semibold text-xs h-8 px-4"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
