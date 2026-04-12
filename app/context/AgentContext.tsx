import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AgentWorkspace, StructureType, ParsedSkill } from '../../lib/gitagent/types';

type Action =
  | { type: 'SET_WORKSPACE'; payload: AgentWorkspace }
  | { type: 'UPDATE_META'; payload: Partial<AgentWorkspace['meta']> }
  | { type: 'UPDATE_MANIFEST'; payload: Partial<AgentWorkspace['manifest']> }
  | { type: 'SET_FILE'; payload: { path: string; content: string } }
  | { type: 'UPDATE_WORKSPACE'; payload: Partial<ExtendedWorkspace> }
  | { type: 'ADD_SKILL'; payload: ParsedSkill }
  | { type: 'SET_TEMPLATE'; payload: 'minimal' | 'standard' | 'full' | 'data-analyst' | 'web-scraper' | 'researcher' }
  | { type: 'ADD_SCAFFOLD_CONTEXT'; payload: ScaffoldContextFile }
  | { type: 'REMOVE_SCAFFOLD_CONTEXT'; payload: string }
  | { type: 'SAVE_SNAPSHOT'; payload: string }
  | { type: 'RESTORE_SNAPSHOT'; payload: number }
  | { type: 'DELETE_SNAPSHOT'; payload: number };

export interface ScaffoldContextFile {
  name: string;
  type: string;
  content?: string;
  dataUrl?: string;
}

export interface SkillEntry {
  name: string;
  description: string;
  instructions: string;
  allowedTools?: string;
  category: 'general' | 'research' | 'code' | 'compliance' | 'communication';
}

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
  selectedTemplate: 'minimal' | 'standard' | 'full' | 'data-analyst' | 'web-scraper' | 'researcher';
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
  runtimeProviderId: string;
}

const initialState: ExtendedWorkspace = {
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
  deploymentTargets: ['cli'],
  hermesConfig: null,
  knowledgeDocs: [],
  memoryBootstrap: null,
  toolPermissions: {
    matrix: {}
  },
  generationConfig: {
    providerId: 'openrouter',
    modelId: 'anthropic/claude-3-5-sonnet-20240620',
  },
  validationResult: null,
  scaffoldContext: [],
  history: {
    snapshots: [],
  },
  runtimeProviderId: 'anthropic',
};

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
        hermesConfig: action.payload.hermesConfig || initialState.hermesConfig,
        knowledgeDocs: action.payload.knowledgeDocs || initialState.knowledgeDocs,
        memoryBootstrap: action.payload.memoryBootstrap || initialState.memoryBootstrap,
        toolPermissions: action.payload.toolPermissions || initialState.toolPermissions,
        generationConfig: action.payload.generationConfig || initialState.generationConfig,
        scaffoldContext: (action.payload as any).scaffoldContext || initialState.scaffoldContext,
        history: (action.payload as any).history || initialState.history,
        runtimeProviderId: (action.payload as any).runtimeProviderId || initialState.runtimeProviderId,
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
      return { ...state, ...action.payload };
    case 'SET_FILE':
      // Simplified file setter
      return { ...state, [action.payload.path]: action.payload.content };
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
