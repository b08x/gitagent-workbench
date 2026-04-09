import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AgentWorkspace, StructureType, ParsedSkill } from '../../lib/gitagent/types';

type Action =
  | { type: 'SET_WORKSPACE'; payload: AgentWorkspace }
  | { type: 'UPDATE_META'; payload: Partial<AgentWorkspace['meta']> }
  | { type: 'UPDATE_MANIFEST'; payload: Partial<AgentWorkspace['manifest']> }
  | { type: 'SET_FILE'; payload: { path: string; content: string } }
  | { type: 'UPDATE_WORKSPACE'; payload: Partial<ExtendedWorkspace> }
  | { type: 'ADD_SKILL'; payload: ParsedSkill }
  | { type: 'SET_TEMPLATE'; payload: 'minimal' | 'standard' | 'full' };

interface ExtendedWorkspace extends AgentWorkspace {
  selectedTemplate: 'minimal' | 'standard' | 'full';
  'core-identity'?: string;
  'communication-style'?: string;
  'values-principles'?: string;
  'domain-expertise'?: string;
  'collaboration-style'?: string;
  'must-always'?: string;
  'must-never'?: string;
  'output-constraints'?: string;
  'interaction-boundaries'?: string;
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

function agentReducer(state: ExtendedWorkspace, action: Action): ExtendedWorkspace {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { ...action.payload, selectedTemplate: state.selectedTemplate };
    case 'UPDATE_META':
      const newState = { ...state, meta: { ...state.meta, ...action.payload } };
      if (action.payload.structureType && ['minimal', 'standard', 'full'].includes(action.payload.structureType)) {
        newState.selectedTemplate = action.payload.structureType as 'minimal' | 'standard' | 'full';
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
