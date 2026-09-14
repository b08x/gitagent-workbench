import * as React from 'react';
import { createContext, useContext, useReducer, ReactNode } from 'react';
import { AgentWorkspace, StructureType, ParsedSkill, SkillEntry, AgentFramework } from '../../lib/gitagent/types';
import { assembleSoul, assembleRules } from '@/lib/gitagent/assembleSystemPrompt';
import { parseMarkdownToFineGrained } from '@/lib/gitagent/parser';
import { inferFrameworkTools } from '@/lib/gitagent/contextToolInference';
import { 
  GitRepoState, 
  createDefaultGitState, 
  executeGitInit, 
  executeGitCommit, 
  executeGitPush, 
  executeGitPull, 
  executeSwitchBranch, 
  executeCreateBranch,
  executeGitSync,
  executeSimulateRemoteBehind
} from '@/lib/gitagent/gitManager';

export interface ScaffoldContextFile {
  name: string;
  type: string;
  content?: string;
  dataUrl?: string;
}

type Action =
  | { type: 'SET_WORKSPACE'; payload: AgentWorkspace }
  | { type: 'UPDATE_META'; payload: Partial<AgentWorkspace['meta']> }
  | { type: 'UPDATE_MANIFEST'; payload: Partial<AgentWorkspace['manifest']> }
  | { type: 'SET_FILE'; payload: { path: string; content: string } }
  | { type: 'UPDATE_WORKSPACE'; payload: Omit<Partial<ExtendedWorkspace>, 'skills'> & { skills?: Record<string, ParsedSkill> | string } }
  | { type: 'ADD_SKILL'; payload: ParsedSkill }
  | { type: 'SET_TEMPLATE'; payload: StructureType }
  | { type: 'ADD_SCAFFOLD_CONTEXT'; payload: ScaffoldContextFile }
  | { type: 'REMOVE_SCAFFOLD_CONTEXT'; payload: string }
  | { type: 'SAVE_SNAPSHOT'; payload: string }
  | { type: 'RESTORE_SNAPSHOT'; payload: number }
  | { type: 'DELETE_SNAPSHOT'; payload: number }
  | { type: 'SET_GIT_STATE'; payload: GitRepoState }
  | { type: 'INIT_GIT'; payload?: { repoName?: string; authorName?: string; authorEmail?: string } }
  | { type: 'COMMIT_GIT'; payload: { message: string; authorName?: string; authorEmail?: string } }
  | { type: 'PUSH_GIT'; payload?: { remoteName?: string } }
  | { type: 'PULL_GIT'; payload?: { remoteName?: string } }
  | { type: 'SWITCH_GIT_BRANCH'; payload: string }
  | { type: 'CREATE_GIT_BRANCH'; payload: string }
  | { type: 'RESTORE_GIT_COMMIT'; payload: string }
  | { type: 'UPDATE_GIT_REMOTE'; payload: { name: string; url: string; provider: 'github' | 'gitlab' | 'bitbucket' | 'custom'; token?: string } }
  | { type: 'SYNC_GIT'; payload?: { remoteName?: string; forceError?: string } }
  | { type: 'SIMULATE_GIT_BEHIND'; payload?: number }
  | { type: 'SET_GIT_SYNC_ERROR'; payload: string | null }
  | { type: 'RESET_WORKSPACE'; payload?: { template?: StructureType; targetFramework?: AgentFramework; repoName?: string; keepHistory?: boolean } };

export interface ToolEntry {
  name: string;
  description: string;
}

export interface SubAgentEntry {
  name: string;
  description: string;
  role: string;
  permissions: string[];
}

export interface A2AServerEntry {
  url: string;
  capabilities: string[];
  authentication: {
    type: 'bearer' | 'api_key' | 'none';
  };
}

export interface DutyRole {
  name: string;
  permissions: string[];
}

export interface ConflictMatrixEntry {
  roles: [string, string];
  reason: string;
}

export interface DutiesConfig {
  purpose: string;
  roles: DutyRole[];
  conflictMatrix: ConflictMatrixEntry[];
  handoffProcedures: string;
}

export interface ComplianceConfig {
  risk_tier: 'low' | 'standard' | 'high' | 'critical';
  supervision: {
    human_in_the_loop: 'always' | 'conditional' | 'never';
    kill_switch: boolean;
    override_capability: boolean;
  };
  recordkeeping: {
    audit_logging: boolean;
    retention_period: string;
    log_format: 'structured_json';
  };
  model_risk: {
    ongoing_monitoring: boolean;
  };
  data_governance: {
    pii_handling: 'redact' | 'anonymize' | 'passthrough';
  };
  communications: {
    fair_balanced: boolean;
  };
}

export interface HookEntry {
  event: 'on_session_start' | 'on_error' | 'on_session_end' | 'on_tool_call';
  script: string;
  fail_open: boolean;
}

interface ExtendedWorkspace extends AgentWorkspace {
  selectedTemplate: StructureType;
  isCompilingSpec?: boolean;
  compilationStage?: string;
  compilationElapsed?: number;
  'core-identity'?: string;
  'communication-style'?: string;
  'values-principles'?: string;
  'domain-expertise'?: string;
  'collaboration-style'?: string;
  'must-always'?: string;
  'must-never'?: string;
  'output-constraints'?: string;
  'interaction-boundaries'?: string;
  modelConfig: {
    preferred: string;
    fallback: string[];
    constraints: {
      temperature: number;
      max_tokens: number;
      top_p?: number;
      top_k?: number;
      stop_sequences?: string[];
    };
  };
  runtimeConfig: {
    max_turns: number;
    timeout: number;
  };
  skillsList: SkillEntry[];
  toolsList: ToolEntry[];
  delegation: {
    mode: 'auto' | 'manual' | 'none';
  };
  subAgentsList: SubAgentEntry[];
  a2aServers: A2AServerEntry[];
  dutiesConfig: DutiesConfig;
  complianceConfig: ComplianceConfig;
  hooks: HookEntry[];
  memoryConfig: {
    layers: {
      working: {
        path: string;
        max_lines: number;
        format: 'markdown' | 'plaintext';
        load: 'always' | 'on-demand';
      };
      archive: {
        path: string;
        rotation: 'monthly' | 'weekly' | 'daily';
      };
    };
    updateTriggers: string[];
  };
  scaffoldContext: ScaffoldContextFile[];
  history: {
    snapshots: { timestamp: number; label: string; workspace: ExtendedWorkspace }[];
  };
  snapshots?: Array<{ id: number; label: string; timestamp: Date; state: any }>;
  evals?: { goodOutputs?: string[] };
  runtimeProviderId: string;
  git: GitRepoState;
}

export const initialState: ExtendedWorkspace = {
  selectedTemplate: 'standard',
  meta: {
    structureType: 'standard',
    status: 'intake',
    currentStep: null,
    lastDownloadedAt: null,
  },
  manifest: {},
  modelConfig: {
    preferred: 'claude-sonnet-4-5-20250929',
    fallback: [],
    constraints: {
      temperature: 0.3,
      max_tokens: 4096,
    }
  },
  runtimeConfig: {
    max_turns: 30,
    timeout: 120,
  },
  skillsList: [
    { 
      name: 'research-expert', 
      description: 'Expert at searching and synthesizing information', 
      instructions: '1. Search for the topic using available tools.\n2. Synthesize findings into a concise summary.\n3. Cite sources.',
      category: 'research' 
    }
  ],
  toolsList: [],
  delegation: {
    mode: 'none',
  },
  subAgentsList: [],
  a2aServers: [],
  dutiesConfig: {
    purpose: '',
    roles: [],
    conflictMatrix: [],
    handoffProcedures: '',
  },
  complianceConfig: {
    risk_tier: 'standard',
    supervision: {
      human_in_the_loop: 'conditional',
      kill_switch: true,
      override_capability: true,
    },
    recordkeeping: {
      audit_logging: true,
      retention_period: '6y',
      log_format: 'structured_json',
    },
    model_risk: {
      ongoing_monitoring: true,
    },
    data_governance: {
      pii_handling: 'redact',
    },
    communications: {
      fair_balanced: true,
    },
  },
  hooks: [
    { event: 'on_session_start', script: 'scripts/on-start.sh', fail_open: true },
    { event: 'on_error', script: 'scripts/on-error.sh', fail_open: true },
  ],
  memoryConfig: {
    layers: {
      working: {
        path: 'MEMORY.md',
        max_lines: 200,
        format: 'markdown',
        load: 'always',
      },
      archive: {
        path: 'archive/',
        rotation: 'monthly',
      },
    },
    updateTriggers: ['on_session_end', 'on_explicit_save'],
  },
  soul: null,
  rules: null,
  prompt_md: null,
  duties: null,
  agents_md: null,
  skills: {},
  tools: {},
  workflows: {},
  knowledge: null,
  memory: null,
  memory_md: null,
  examples: { goodOutputs: null, badOutputs: null },
  config: { default: null, production: null },
  subAgents: {},
  targetFramework: 'hermes_agent',
  deploymentTargets: ['cli'],
  hermesConfig: null,
  knowledgeDocs: [],
  memoryBootstrap: null,
  toolPermissions: {
    matrix: {}
  },
  generationConfig: {
    providerId: 'openrouter',
    modelId: '',
    fallbackModelIds: [],
  },
  validationResult: null,
  scaffoldContext: [],
  history: {
    snapshots: [],
  },
  runtimeProviderId: 'anthropic',
  git: createDefaultGitState('my-gitagent'),
};

export function createDefaultWorkspace(
  repoName: string = 'my-gitagent',
  targetFramework: AgentFramework = 'hermes_agent',
  template: StructureType = 'standard'
): ExtendedWorkspace {
  return {
    ...initialState,
    selectedTemplate: template,
    meta: {
      ...initialState.meta,
      structureType: template,
    },
    targetFramework,
    git: createDefaultGitState(repoName),
    history: {
      snapshots: []
    }
  };
}

function agentReducer(state: ExtendedWorkspace, action: Action): ExtendedWorkspace {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { 
        ...action.payload, 
        selectedTemplate: state.selectedTemplate,
        modelConfig: (action.payload as any).modelConfig || initialState.modelConfig,
        runtimeConfig: (action.payload as any).runtimeConfig || initialState.runtimeConfig,
        skillsList: (action.payload as any).skillsList || initialState.skillsList,
        toolsList: (action.payload as any).toolsList || initialState.toolsList,
        delegation: (action.payload as any).delegation || initialState.delegation,
        subAgentsList: (action.payload as any).subAgentsList || initialState.subAgentsList,
        a2aServers: (action.payload as any).a2aServers || initialState.a2aServers,
        dutiesConfig: (action.payload as any).dutiesConfig || initialState.dutiesConfig,
        complianceConfig: (action.payload as any).complianceConfig || initialState.complianceConfig,
        hooks: (action.payload as any).hooks || initialState.hooks,
        memoryConfig: (action.payload as any).memoryConfig || initialState.memoryConfig,
        deploymentTargets: action.payload.deploymentTargets || initialState.deploymentTargets,
        targetFramework: action.payload.targetFramework || state.targetFramework || initialState.targetFramework,
        hermesConfig: action.payload.hermesConfig || initialState.hermesConfig,
        knowledgeDocs: action.payload.knowledgeDocs || initialState.knowledgeDocs,
        memoryBootstrap: action.payload.memoryBootstrap || initialState.memoryBootstrap,
        toolPermissions: action.payload.toolPermissions || initialState.toolPermissions,
        generationConfig: action.payload.generationConfig || initialState.generationConfig,
        scaffoldContext: (action.payload as any).scaffoldContext || initialState.scaffoldContext,
        history: (action.payload as any).history || initialState.history,
        runtimeProviderId: (action.payload as any).runtimeProviderId || initialState.runtimeProviderId,
        git: (action.payload as any).git || state.git || initialState.git,
      };
    case 'UPDATE_META':
      const newState = { ...state, meta: { ...state.meta, ...action.payload } };
      if (action.payload.structureType && ['minimal', 'standard', 'full', 'data-analyst', 'web-scraper', 'researcher'].includes(action.payload.structureType)) {
        newState.selectedTemplate = action.payload.structureType as any;
      }
      return newState;
    case 'UPDATE_MANIFEST':
      return { ...state, manifest: { ...state.manifest, ...action.payload } };
    case 'UPDATE_WORKSPACE':
      let payload = { ...action.payload };
      
      // Auto-parse soul/rules/skills if they are being updated in bulk
      if (payload.soul) {
        const soulUpdates = parseMarkdownToFineGrained(payload.soul, 'soul');
        payload = { ...payload, ...soulUpdates };
        if (soulUpdates['core-identity']) {
          payload.manifest = { 
            ...(state.manifest || {}), 
            ...(payload.manifest || {}), 
            description: soulUpdates['core-identity'] 
          };
        }
      }
      if (payload.rules) {
        const rulesUpdates = parseMarkdownToFineGrained(payload.rules, 'rules');
        payload = { ...payload, ...rulesUpdates };
      }
      if (payload.skills && typeof payload.skills === 'string') {
        // Special case where skills might be sent as a markdown block
        const skillsUpdates = parseMarkdownToFineGrained(payload.skills, 'skills');
        delete (payload as any).skills;
        
        const effectiveFramework = (payload.targetFramework || state.targetFramework || 'hermes_agent') as AgentFramework;
        const alignedSkillsList = (skillsUpdates.skillsList || []).map(skill => {
          if (!skill.allowedTools || skill.allowedTools.trim() === '') {
            const inferred = inferFrameworkTools({
              name: skill.name,
              description: skill.description,
              category: skill.category,
              instructions: skill.instructions,
              targetFramework: effectiveFramework
            });
            return { ...skill, allowedTools: inferred.tools.join(' ') };
          }
          return skill;
        });

        payload = { 
          ...payload, 
          ...skillsUpdates, 
          skillsList: alignedSkillsList.length > 0 ? alignedSkillsList : (payload.skillsList || state.skillsList)
        };
      }

      return { ...state, ...payload } as ExtendedWorkspace;
    case 'SET_FILE':
      const filePayload = action.payload;
      let nextState = { ...state, [filePayload.path]: filePayload.content };
      
      // Sync from file content back to structured fields
      if (filePayload.path === 'soul') {
        const soulUpdates = parseMarkdownToFineGrained(filePayload.content, 'soul');
        nextState = { ...nextState, ...soulUpdates };
        if (soulUpdates['core-identity']) {
          nextState.manifest = { ...nextState.manifest, description: soulUpdates['core-identity'] };
        }
      } else if (filePayload.path === 'rules') {
        const rulesUpdates = parseMarkdownToFineGrained(filePayload.content, 'rules');
        nextState = { ...nextState, ...rulesUpdates };
      } else if (filePayload.path === 'skills') {
        const skillsUpdates = parseMarkdownToFineGrained(filePayload.content, 'skills');
        nextState = { ...nextState, ...skillsUpdates };
      }

      return nextState;
    case 'SET_TEMPLATE':
      return { ...state, selectedTemplate: action.payload, meta: { ...state.meta, structureType: action.payload } };
    case 'ADD_SKILL':
      return {
        ...state,
        manifest: {
          ...state.manifest,
          skills: Array.from(new Set([...(state.manifest.skills || []), action.payload.name]))
        },
        skills: {
          ...state.skills,
          [action.payload.name]: action.payload
        }
      };
    case 'ADD_SCAFFOLD_CONTEXT':
      return { ...state, scaffoldContext: [...state.scaffoldContext, action.payload] };
    case 'REMOVE_SCAFFOLD_CONTEXT':
      return { ...state, scaffoldContext: state.scaffoldContext.filter(f => f.name !== action.payload) };
    case 'SAVE_SNAPSHOT':
      return {
        ...state,
        history: {
          ...state.history,
          snapshots: [
            { timestamp: Date.now(), label: action.payload, workspace: { ...state } },
            ...state.history.snapshots
          ].slice(0, 20) // Keep last 20
        }
      };
    case 'RESTORE_SNAPSHOT':
      const snapshot = state.history.snapshots.find(s => s.timestamp === action.payload);
      if (!snapshot) return state;
      return { ...snapshot.workspace, history: state.history };
    case 'DELETE_SNAPSHOT':
      return {
        ...state,
        history: {
          ...state.history,
          snapshots: state.history.snapshots.filter(s => s.timestamp !== action.payload)
        }
      };
    case 'SET_GIT_STATE':
      return {
        ...state,
        git: action.payload,
      };
    case 'INIT_GIT': {
      const authorName = action.payload?.authorName || state.manifest.author || 'Agent Developer';
      const authorEmail = action.payload?.authorEmail || 'developer@gitagent.internal';
      const repoName = action.payload?.repoName || state.manifest.name || state.git.repoName || 'my-gitagent';
      const nextGit = executeGitInit(state.git, state, repoName, authorName, authorEmail);
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'COMMIT_GIT': {
      const authorName = action.payload.authorName || state.manifest.author || 'Agent Developer';
      const authorEmail = action.payload.authorEmail || 'developer@gitagent.internal';
      const nextGit = executeGitCommit(state.git, state, action.payload.message, authorName, authorEmail);
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'PUSH_GIT': {
      const nextGit = executeGitPush(state.git, action.payload?.remoteName || 'origin');
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'PULL_GIT': {
      const { nextState: nextGit } = executeGitPull(state.git, action.payload?.remoteName || 'origin');
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'SYNC_GIT': {
      const { nextState } = executeGitSync(state.git, action.payload?.remoteName || 'origin', {
        forceError: action.payload?.forceError,
      });
      return {
        ...state,
        git: nextState,
      };
    }
    case 'SIMULATE_GIT_BEHIND': {
      const nextGit = executeSimulateRemoteBehind(state.git, action.payload || 1);
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'SET_GIT_SYNC_ERROR': {
      return {
        ...state,
        git: {
          ...state.git,
          sync: {
            ...state.git.sync,
            isSyncing: false,
            error: action.payload,
          }
        }
      };
    }
    case 'SWITCH_GIT_BRANCH': {
      const nextGit = executeSwitchBranch(state.git, action.payload);
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'CREATE_GIT_BRANCH': {
      const nextGit = executeCreateBranch(state.git, action.payload);
      return {
        ...state,
        git: nextGit,
      };
    }
    case 'UPDATE_GIT_REMOTE': {
      const existing = state.git.remotes.findIndex(r => r.name === action.payload.name);
      let updatedRemotes = [...state.git.remotes];
      if (existing >= 0) {
        updatedRemotes[existing] = {
          ...updatedRemotes[existing],
          url: action.payload.url,
          provider: action.payload.provider,
          token: action.payload.token,
        };
      } else {
        updatedRemotes.push({
          name: action.payload.name,
          url: action.payload.url,
          provider: action.payload.provider,
          branch: state.git.currentBranch || 'main',
          token: action.payload.token,
        });
      }
      return {
        ...state,
        git: {
          ...state.git,
          remotes: updatedRemotes,
          terminalLogs: [
            ...state.git.terminalLogs,
            {
              id: `log-${Date.now()}`,
              command: `git remote set-url ${action.payload.name} ${action.payload.url}`,
              output: `Remote '${action.payload.name}' updated to ${action.payload.url}`,
              timestamp: Date.now(),
              type: 'info',
            }
          ]
        }
      };
    }
    case 'RESTORE_GIT_COMMIT': {
      const commit = state.git.commits.find(c => c.hash === action.payload);
      if (!commit || !commit.snapshot) return state;
      const restoredWorkspace = commit.snapshot as ExtendedWorkspace;
      return {
        ...restoredWorkspace,
        git: {
          ...state.git,
          head: commit.hash,
          terminalLogs: [
            ...state.git.terminalLogs,
            {
              id: `log-${Date.now()}`,
              command: `git checkout ${commit.hash}`,
              output: `Note: switching to '${commit.hash}'.\nHEAD is now at ${commit.hash} ${commit.message}`,
              timestamp: Date.now(),
              type: 'info',
            }
          ]
        },
        history: state.history,
      };
    }
    case 'RESET_WORKSPACE': {
      const fresh = createDefaultWorkspace(
        action.payload?.repoName || (state.git?.repoName || 'my-gitagent'),
        action.payload?.targetFramework || (state.targetFramework as AgentFramework) || 'hermes_agent',
        action.payload?.template || 'standard'
      );
      if (action.payload?.keepHistory && state.history?.snapshots?.length) {
        fresh.history = state.history;
      }
      return fresh;
    }
    default:
      return state;
  }
}

const AgentContext = createContext<{
  state: ExtendedWorkspace;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);
  return (
    <AgentContext.Provider value={{ state, dispatch }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentWorkspace() {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgentWorkspace must be used within AgentProvider');
  return context;
}
