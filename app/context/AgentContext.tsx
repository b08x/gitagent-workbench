import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AgentWorkspace, StructureType, ParsedSkill } from '../../lib/gitagent/types';

type Action =
  | { type: 'SET_WORKSPACE'; payload: AgentWorkspace }
  | { type: 'UPDATE_META'; payload: Partial<AgentWorkspace['meta']> }
  | { type: 'UPDATE_MANIFEST'; payload: Partial<AgentWorkspace['manifest']> }
  | { type: 'SET_FILE'; payload: { path: string; content: string } }
  | { type: 'UPDATE_WORKSPACE'; payload: Partial<AgentWorkspace> }
  | { type: 'ADD_SKILL'; payload: ParsedSkill };

const initialState: AgentWorkspace = {
// ... (rest of the file)
  meta: {
    structureType: 'minimal',
    status: 'intake',
    currentStep: null,
    lastDownloadedAt: null,
  },
  manifest: {},
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
  validationResult: null,
};

function agentReducer(state: AgentWorkspace, action: Action): AgentWorkspace {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return action.payload;
    case 'UPDATE_META':
      return { ...state, meta: { ...state.meta, ...action.payload } };
    case 'UPDATE_MANIFEST':
      return { ...state, manifest: { ...state.manifest, ...action.payload } };
    case 'UPDATE_WORKSPACE':
      return { ...state, ...action.payload };
    case 'SET_FILE':
      // Simplified file setter
      return { ...state, [action.payload.path]: action.payload.content };
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
    default:
      return state;
  }
}

const AgentContext = createContext<{
  state: AgentWorkspace;
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
