import { AgentWorkspace } from './types';

export interface GitFileDiff {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'clean';
  summary: string;
  additions: number;
  deletions: number;
}

export interface GitCommit {
  hash: string;
  author: {
    name: string;
    email: string;
  };
  timestamp: number;
  message: string;
  branch: string;
  filesChanged: string[];
  snapshot: Partial<AgentWorkspace>;
  parentHash: string | null;
}

export interface GitRemote {
  name: string;
  url: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'custom';
  branch: string;
  token?: string;
  username?: string;
}

export interface GitTerminalLog {
  id: string;
  command: string;
  output: string;
  timestamp: number;
  type: 'cmd' | 'info' | 'success' | 'warn' | 'error';
}

export interface BranchTrackingInfo {
  name: string;
  isCurrent: boolean;
  isRemoteTracked: boolean;
  trackingRef: string; // e.g. "origin/main" or "Local only"
  remoteName: string; // "origin"
  ahead: number;
  behind: number;
  commitCount: number;
  latestCommitHash?: string;
  latestCommitMessage?: string;
  updatedAt: number;
}

export interface GitRepoState {
  isInitialized: boolean;
  repoName: string;
  currentBranch: string;
  branches: string[];
  remoteBranches?: string[];
  remotes: GitRemote[];
  commits: GitCommit[];
  head: string | null;
  stagedFiles: string[];
  sync: {
    ahead: number;
    behind: number;
    lastSyncedAt: number | null;
    lastPushedAt: number | null;
    lastPulledAt: number | null;
    isSyncing?: boolean;
    error?: string | null;
  };
  terminalLogs: GitTerminalLog[];
}

export const DEFAULT_GITIGNORE = `# GitAgent Environment & Secrets
.env
.env.local
*.secret.key
credentials.json

# Dependencies & Build Output
node_modules/
dist/
build/
.cache/
.vite/

# Logs & Diagnostics
*.log
npm-debug.log*
.DS_Store
Thumbs.db
`;

/**
 * Generate a 7-character hexadecimal commit hash
 */
export function generateCommitHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 7; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Extract an inventory of agent workspace files and serialized content
 */
export function serializeWorkspaceFiles(workspace: Partial<AgentWorkspace>): Record<string, string> {
  const files: Record<string, string> = {};

  // Manifest
  files['.gitagent/manifest.json'] = JSON.stringify(workspace.manifest || {}, null, 2);
  
  // Core persona and rules
  if (workspace.soul) files['SOUL.md'] = workspace.soul;
  if (workspace.rules) files['RULES.md'] = workspace.rules;
  if (workspace.prompt_md) files['PROMPT.md'] = workspace.prompt_md;
  if (workspace.duties) files['DUTIES.md'] = workspace.duties;
  if (workspace.agents_md) files['AGENTS.md'] = workspace.agents_md;
  if (workspace.memory_md) files['MEMORY.md'] = workspace.memory_md;

  // Skills
  if (workspace.skills) {
    Object.entries(workspace.skills).forEach(([name, skill]) => {
      files[`skills/${name}/SKILL.md`] = typeof skill === 'string' 
        ? skill 
        : (skill as any).instructions || JSON.stringify(skill, null, 2);
    });
  }

  // Workflows
  if (workspace.workflows) {
    Object.entries(workspace.workflows).forEach(([name, wf]) => {
      files[`workflows/${name}.json`] = JSON.stringify(wf, null, 2);
    });
  }

  // Configuration
  if (workspace.config) {
    files['config/runtime.json'] = JSON.stringify(workspace.config, null, 2);
  }

  // Gitignore
  files['.gitignore'] = DEFAULT_GITIGNORE;

  return files;
}

/**
 * Compute the diff between the current workspace files and the HEAD commit snapshot
 */
export function computeWorkingTreeStatus(
  gitState: GitRepoState,
  workspace: Partial<AgentWorkspace>
): {
  isClean: boolean;
  files: GitFileDiff[];
  changedCount: number;
} {
  if (!gitState.isInitialized || !gitState.head) {
    return {
      isClean: false,
      files: [],
      changedCount: 0,
    };
  }

  const currentFiles = serializeWorkspaceFiles(workspace);
  const headCommit = gitState.commits.find(c => c.hash === gitState.head);
  const headFiles = headCommit ? serializeWorkspaceFiles(headCommit.snapshot) : {};

  const diffs: GitFileDiff[] = [];

  // Check current files against HEAD files
  Object.keys(currentFiles).forEach(path => {
    const currentContent = currentFiles[path];
    const headContent = headFiles[path];

    if (headContent === undefined) {
      diffs.push({
        path,
        status: 'added',
        summary: 'New untracked file created',
        additions: currentContent.split('\n').length,
        deletions: 0,
      });
    } else if (currentContent !== headContent) {
      const curLines = currentContent.split('\n').length;
      const headLines = headContent.split('\n').length;
      diffs.push({
        path,
        status: 'modified',
        summary: `File modified (${curLines} lines vs ${headLines} lines)`,
        additions: Math.max(0, curLines - headLines + 3),
        deletions: Math.max(0, headLines - curLines + 2),
      });
    }
  });

  // Check for deleted files
  Object.keys(headFiles).forEach(path => {
    if (currentFiles[path] === undefined) {
      diffs.push({
        path,
        status: 'deleted',
        summary: 'File removed from workspace',
        additions: 0,
        deletions: headFiles[path].split('\n').length,
      });
    }
  });

  return {
    isClean: diffs.length === 0,
    files: diffs,
    changedCount: diffs.length,
  };
}

/**
 * Get the initial default state for Git repository
 */
export function createDefaultGitState(agentName?: string): GitRepoState {
  const safeName = (agentName || 'my-gitagent').toLowerCase().replace(/\s+/g, '-');
  return {
    isInitialized: false,
    repoName: safeName,
    currentBranch: 'main',
    branches: ['main'],
    remotes: [
      {
        name: 'origin',
        url: `https://github.com/my-org/${safeName}.git`,
        provider: 'github',
        branch: 'main',
      }
    ],
    commits: [],
    head: null,
    stagedFiles: [],
    sync: {
      ahead: 0,
      behind: 0,
      lastSyncedAt: null,
      lastPushedAt: null,
      lastPulledAt: null,
      isSyncing: false,
      error: null,
    },
    terminalLogs: [
      {
        id: 'log-welcome',
        command: 'git status',
        output: 'fatal: not a git repository (or any of the parent directories): .git\nRun "git init" to initialize Git version control.',
        timestamp: Date.now(),
        type: 'info',
      }
    ],
  };
}

/**
 * Initialize repository with initial commit
 */
export function executeGitInit(
  state: GitRepoState,
  workspace: Partial<AgentWorkspace>,
  repoName?: string,
  authorName: string = 'Agent Developer',
  authorEmail: string = 'developer@gitagent.internal'
): GitRepoState {
  const name = repoName || state.repoName || 'my-gitagent';
  const initialHash = generateCommitHash();
  const allFiles = Object.keys(serializeWorkspaceFiles(workspace));

  const initialCommit: GitCommit = {
    hash: initialHash,
    author: {
      name: authorName,
      email: authorEmail,
    },
    timestamp: Date.now(),
    message: 'Initial commit: GitAgent skeleton with manifest and baseline configuration',
    branch: 'main',
    filesChanged: allFiles,
    snapshot: JSON.parse(JSON.stringify(workspace)),
    parentHash: null,
  };

  const logs: GitTerminalLog[] = [
    {
      id: `log-${Date.now()}-1`,
      command: `git init -b main ${name}`,
      output: `Initialized empty Git repository in /workspace/${name}/.git/\nSwitched to a new branch 'main'`,
      timestamp: Date.now() - 200,
      type: 'cmd',
    },
    {
      id: `log-${Date.now()}-2`,
      command: `git remote add origin https://github.com/my-org/${name}.git`,
      output: `Added remote origin -> https://github.com/my-org/${name}.git`,
      timestamp: Date.now() - 100,
      type: 'info',
    },
    {
      id: `log-${Date.now()}-3`,
      command: `git commit -m "Initial commit: GitAgent skeleton with manifest and baseline configuration"`,
      output: `[main (root-commit) ${initialHash}] Initial commit: GitAgent skeleton with manifest and baseline configuration\n ${allFiles.length} files changed, 240 insertions(+)`,
      timestamp: Date.now(),
      type: 'success',
    }
  ];

  return {
    ...state,
    isInitialized: true,
    repoName: name,
    currentBranch: 'main',
    branches: ['main'],
    remotes: [
      {
        name: 'origin',
        url: `https://github.com/my-org/${name}.git`,
        provider: 'github',
        branch: 'main',
      }
    ],
    commits: [initialCommit],
    head: initialHash,
    stagedFiles: [],
    sync: {
      ahead: 1,
      behind: 0,
      lastSyncedAt: Date.now(),
      lastPushedAt: null,
      lastPulledAt: null,
      isSyncing: false,
      error: null,
    },
    terminalLogs: [...state.terminalLogs, ...logs],
  };
}

/**
 * Create a new commit from the current workspace state
 */
export function executeGitCommit(
  state: GitRepoState,
  workspace: Partial<AgentWorkspace>,
  message: string,
  authorName: string = 'Agent Developer',
  authorEmail: string = 'developer@gitagent.internal'
): GitRepoState {
  if (!state.isInitialized) {
    throw new Error('Repository is not initialized.');
  }

  const newHash = generateCommitHash();
  const status = computeWorkingTreeStatus(state, workspace);
  const affectedFiles = status.files.map(f => f.path);

  const commit: GitCommit = {
    hash: newHash,
    author: {
      name: authorName,
      email: authorEmail,
    },
    timestamp: Date.now(),
    message: message.trim() || `Update agent specification and rules`,
    branch: state.currentBranch,
    filesChanged: affectedFiles.length > 0 ? affectedFiles : ['manifest.json'],
    snapshot: JSON.parse(JSON.stringify(workspace)),
    parentHash: state.head,
  };

  const log: GitTerminalLog = {
    id: `log-${Date.now()}`,
    command: `git commit -m "${commit.message}"`,
    output: `[${state.currentBranch} ${newHash}] ${commit.message}\n ${commit.filesChanged.length} file${commit.filesChanged.length === 1 ? '' : 's'} changed`,
    timestamp: Date.now(),
    type: 'success',
  };

  return {
    ...state,
    commits: [commit, ...state.commits],
    head: newHash,
    stagedFiles: [],
    sync: {
      ...state.sync,
      ahead: state.sync.ahead + 1,
    },
    terminalLogs: [...state.terminalLogs, log],
  };
}

/**
 * Simulate or perform pushing commits to a remote repository
 */
export function executeGitPush(
  state: GitRepoState,
  remoteName: string = 'origin'
): GitRepoState {
  const remote = state.remotes.find(r => r.name === remoteName) || state.remotes[0];
  const remoteUrl = remote ? remote.url : 'https://github.com/my-org/my-gitagent.git';
  const commitsPushed = state.sync.ahead || 1;

  const log: GitTerminalLog = {
    id: `log-${Date.now()}`,
    command: `git push ${remoteName} ${state.currentBranch}`,
    output: `Enumerating objects: 14, done.\nCounting objects: 100% (14/14), done.\nCompressing objects: 100% (8/8), done.\nWriting objects: 100% (14/14), 4.12 KiB | 4.12 MiB/s, done.\nTotal 14 (delta 3), reused 0 (delta 0)\nTo ${remoteUrl}\n   ${state.head?.slice(0, 7)}..${state.head} ${state.currentBranch} -> ${state.currentBranch}\n✓ Successfully pushed ${commitsPushed} commit${commitsPushed === 1 ? '' : 's'} to ${remoteName}/${state.currentBranch}`,
    timestamp: Date.now(),
    type: 'success',
  };

  const remoteBranches = Array.from(new Set([...(state.remoteBranches || ['main']), state.currentBranch]));

  return {
    ...state,
    remoteBranches,
    sync: {
      ...state.sync,
      ahead: 0,
      lastPushedAt: Date.now(),
      lastSyncedAt: Date.now(),
      isSyncing: false,
      error: null,
    },
    terminalLogs: [...state.terminalLogs, log],
  };
}

/**
 * Simulate or perform pulling updates from a remote repository
 */
export function executeGitPull(
  state: GitRepoState,
  remoteName: string = 'origin'
): { nextState: GitRepoState; pullMessage: string } {
  const remote = state.remotes.find(r => r.name === remoteName) || state.remotes[0];
  const remoteUrl = remote ? remote.url : 'origin';

  let log: GitTerminalLog;
  let pullMessage: string;

  if (state.sync.behind > 0) {
    pullMessage = `Pulled ${state.sync.behind} upstream updates from ${remoteName}/${state.currentBranch}`;
    log = {
      id: `log-${Date.now()}`,
      command: `git pull ${remoteName} ${state.currentBranch}`,
      output: `From ${remoteUrl}\n * branch            ${state.currentBranch}     -> FETCH_HEAD\nUpdating ${state.head}..${generateCommitHash()}\nFast-forward\n skills/audit/SKILL.md | 24 ++++++++++++++++\n 1 file changed, 24 insertions(+)`,
      timestamp: Date.now(),
      type: 'success',
    };
  } else {
    pullMessage = `Already up to date with ${remoteName}/${state.currentBranch}`;
    log = {
      id: `log-${Date.now()}`,
      command: `git pull ${remoteName} ${state.currentBranch}`,
      output: `From ${remoteUrl}\n * branch            ${state.currentBranch}     -> FETCH_HEAD\nAlready up to date.`,
      timestamp: Date.now(),
      type: 'info',
    };
  }

  const nextState: GitRepoState = {
    ...state,
    sync: {
      ...state.sync,
      behind: 0,
      lastPulledAt: Date.now(),
      lastSyncedAt: Date.now(),
      isSyncing: false,
      error: null,
    },
    terminalLogs: [...state.terminalLogs, log],
  };

  return { nextState, pullMessage };
}

/**
 * Switch the active branch
 */
export function executeSwitchBranch(
  state: GitRepoState,
  targetBranch: string
): GitRepoState {
  if (!state.branches.includes(targetBranch)) {
    throw new Error(`Branch ${targetBranch} does not exist.`);
  }

  const log: GitTerminalLog = {
    id: `log-${Date.now()}`,
    command: `git checkout ${targetBranch}`,
    output: `Switched to branch '${targetBranch}'`,
    timestamp: Date.now(),
    type: 'cmd',
  };

  return {
    ...state,
    currentBranch: targetBranch,
    terminalLogs: [...state.terminalLogs, log],
  };
}

/**
 * Create and checkout a new branch
 */
export function executeCreateBranch(
  state: GitRepoState,
  branchName: string
): GitRepoState {
  const cleanName = branchName.trim().replace(/\s+/g, '-');
  if (!cleanName) throw new Error('Branch name cannot be empty.');
  if (state.branches.includes(cleanName)) throw new Error(`Branch '${cleanName}' already exists.`);

  const log: GitTerminalLog = {
    id: `log-${Date.now()}`,
    command: `git checkout -b ${cleanName}`,
    output: `Switched to a new branch '${cleanName}'`,
    timestamp: Date.now(),
    type: 'success',
  };

  return {
    ...state,
    branches: [...state.branches, cleanName],
    currentBranch: cleanName,
    terminalLogs: [...state.terminalLogs, log],
  };
}

/**
 * Compute detailed branch information and local vs remote tracking status
 */
export function getBranchTrackingInfo(state: GitRepoState, branchName: string): BranchTrackingInfo {
  const isCurrent = state.currentBranch === branchName;
  const remote = state.remotes.find(r => r.name === 'origin') || state.remotes[0];
  const remoteBranches = state.remoteBranches || ['main'];
  const hasValidRemote = Boolean(remote?.url && remote.url.trim() !== '');
  
  // A branch is considered remote-tracked if the remote is configured and the branch is either 'main' or in remoteBranches
  const isRemoteTracked = hasValidRemote && (branchName === 'main' || remoteBranches.includes(branchName) || remote?.branch === branchName);
  const branchCommits = state.commits.filter(c => c.branch === branchName || (branchName === 'main' && !c.branch));
  const latestCommit = branchCommits[0] || state.commits[0];

  return {
    name: branchName,
    isCurrent,
    isRemoteTracked,
    trackingRef: isRemoteTracked ? `${remote?.name || 'origin'}/${branchName}` : 'Local only',
    remoteName: remote?.name || 'origin',
    ahead: isCurrent ? (state.sync?.ahead || 0) : 0,
    behind: isCurrent ? (state.sync?.behind || 0) : 0,
    commitCount: branchCommits.length,
    latestCommitHash: latestCommit?.hash,
    latestCommitMessage: latestCommit?.message,
    updatedAt: latestCommit?.timestamp || Date.now(),
  };
}

/**
 * Execute Git Sync (Perform pull of remote updates and push of local commits)
 */
export function executeGitSync(
  state: GitRepoState,
  remoteName: string = 'origin',
  options?: {
    forceError?: string;
  }
): { nextState: GitRepoState; success: boolean; message: string; error?: string } {
  const remote = state.remotes.find(r => r.name === remoteName) || state.remotes[0];

  // Error condition 1: No remote configured
  if (!remote || !remote.url || remote.url.trim() === '') {
    const errorMsg = "No remote repository configured. Please configure an upstream remote URL before syncing.";
    const log: GitTerminalLog = {
      id: `log-${Date.now()}`,
      command: `git sync ${remoteName} ${state.currentBranch}`,
      output: `fatal: No remote repository specified. Please set a remote URL with 'git remote add ${remoteName} <url>'`,
      timestamp: Date.now(),
      type: 'error',
    };
    return {
      nextState: {
        ...state,
        sync: {
          ...state.sync,
          isSyncing: false,
          error: errorMsg,
        },
        terminalLogs: [...state.terminalLogs, log],
      },
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }

  // Error condition 2: Forced error or invalid remote URL/tokens
  if (options?.forceError || remote.url.includes('invalid') || remote.url.includes('error') || remote.url === 'fail') {
    const errorMsg = options?.forceError || `Sync failed: Could not authenticate with remote ${remote.url}. Check your personal access token or branch permissions.`;
    const log: GitTerminalLog = {
      id: `log-${Date.now()}`,
      command: `git sync ${remoteName} ${state.currentBranch}`,
      output: `To ${remote.url}\n ! [rejected]        ${state.currentBranch} -> ${state.currentBranch} (authentication failed or pre-receive hook declined)\nfatal: Authentication failed for '${remote.url}'\nerror: failed to sync some refs to remote repository`,
      timestamp: Date.now(),
      type: 'error',
    };
    return {
      nextState: {
        ...state,
        sync: {
          ...state.sync,
          isSyncing: false,
          error: errorMsg,
        },
        terminalLogs: [...state.terminalLogs, log],
      },
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }

  // Success flow: Pull incoming + Push outgoing
  const pulledCount = state.sync.behind;
  const pushedCount = state.sync.ahead;
  const now = Date.now();

  const logs: GitTerminalLog[] = [
    {
      id: `log-${now}-1`,
      command: `git pull --rebase ${remoteName} ${state.currentBranch}`,
      output: pulledCount > 0
        ? `From ${remote.url}\n * branch            ${state.currentBranch}     -> FETCH_HEAD\nFast-forwarding: pulled ${pulledCount} commit(s) from upstream.\nSuccessfully integrated remote branch.`
        : `From ${remote.url}\n * branch            ${state.currentBranch}     -> FETCH_HEAD\nAlready up to date.`,
      timestamp: now,
      type: pulledCount > 0 ? 'success' : 'info',
    },
    {
      id: `log-${now}-2`,
      command: `git push ${remoteName} ${state.currentBranch}`,
      output: pushedCount > 0
        ? `To ${remote.url}\n   ${state.head?.slice(0, 7)}..${state.head} ${state.currentBranch} -> ${state.currentBranch}\n✓ Successfully pushed ${pushedCount} commit(s) to ${remoteName}/${state.currentBranch}.`
        : `Everything up-to-date with ${remoteName}/${state.currentBranch}.`,
      timestamp: now + 50,
      type: pushedCount > 0 ? 'success' : 'info',
    },
    {
      id: `log-${now}-3`,
      command: `git status -sb`,
      output: `## ${state.currentBranch}...${remoteName}/${state.currentBranch} [synchronized]`,
      timestamp: now + 100,
      type: 'cmd',
    },
  ];

  let summaryMsg = '';
  if (pushedCount > 0 && pulledCount > 0) {
    summaryMsg = `Sync complete: Pulled ${pulledCount} commit(s) and pushed ${pushedCount} commit(s) with ${remoteName}/${state.currentBranch}.`;
  } else if (pushedCount > 0) {
    summaryMsg = `Sync complete: Pushed ${pushedCount} commit(s) to ${remoteName}/${state.currentBranch}. Remote is now synchronized.`;
  } else if (pulledCount > 0) {
    summaryMsg = `Sync complete: Pulled ${pulledCount} incoming commit(s) from ${remoteName}/${state.currentBranch}.`;
  } else {
    summaryMsg = `Sync complete: Working tree and remote ${remoteName}/${state.currentBranch} are already in sync.`;
  }

  return {
    nextState: {
      ...state,
      sync: {
        ahead: 0,
        behind: 0,
        lastSyncedAt: now,
        lastPushedAt: pushedCount > 0 ? now : state.sync.lastPushedAt || now,
        lastPulledAt: pulledCount > 0 ? now : state.sync.lastPulledAt || now,
        isSyncing: false,
        error: null,
      },
      terminalLogs: [...state.terminalLogs, ...logs],
    },
    success: true,
    message: summaryMsg,
  };
}

/**
 * Simulate receiving incoming updates from remote (fetching remote commits)
 */
export function executeSimulateRemoteBehind(
  state: GitRepoState,
  commitsBehind: number = 1
): GitRepoState {
  const log: GitTerminalLog = {
    id: `log-${Date.now()}`,
    command: `git fetch origin ${state.currentBranch}`,
    output: `remote: Counting objects: 5, done.\nremote: Total 3 (delta 1)\nUnpacking objects: 100% (3/3), done.\nFrom ${state.remotes[0]?.url || 'origin'}\n * branch            ${state.currentBranch}     -> FETCH_HEAD\nYour branch is behind by ${commitsBehind} commit(s), and can be fast-forwarded.`,
    timestamp: Date.now(),
    type: 'info',
  };

  return {
    ...state,
    sync: {
      ...state.sync,
      behind: (state.sync.behind || 0) + commitsBehind,
      error: null,
    },
    terminalLogs: [...state.terminalLogs, log],
  };
}
