import { AgentWorkspace } from '../gitagent/types';

export type StepId = 
  | 'SANITIZE_INPUTS'
  | 'GEN_YAML'
  | 'GEN_SOUL'
  | 'GEN_INSTRUCTIONS' // Consolidated Rules, Prompt, Duties
  | 'GEN_CONFIG'
  | 'GEN_SKILLS'
  | 'GEN_KNOWLEDGE_DOCS'
  | 'GEN_TOOLS'
  | 'GEN_SUBAGENTS'
  | 'GEN_WORKFLOWS'
  | 'GEN_EXAMPLES'
  | 'VALIDATE_OUT';

export interface GenerationStep {
  id: StepId;
  label: string;
  isCritical: boolean;
  dependsOn?: StepId[];
}

export const GENERATION_STEPS: GenerationStep[] = [
  { id: 'SANITIZE_INPUTS', label: 'Sanitizing Inputs', isCritical: true },
  { id: 'GEN_YAML', label: 'Generating YAML Manifest', isCritical: true },
  { id: 'GEN_SOUL', label: 'Defining Agent Soul', isCritical: true },
  { id: 'GEN_INSTRUCTIONS', label: 'Generating Core Instructions', isCritical: true },
  { id: 'GEN_CONFIG', label: 'Configuring Agent Runtime', isCritical: false },
  { id: 'GEN_SKILLS', label: 'Generating Skill Logic', isCritical: false },
  { id: 'GEN_KNOWLEDGE_DOCS', label: 'Drafting Knowledge Docs', isCritical: false },
  { id: 'GEN_TOOLS', label: 'Defining Tool Schemas', isCritical: true },
  { id: 'GEN_SUBAGENTS', label: 'Configuring Sub-Agents', isCritical: false },
  { id: 'GEN_WORKFLOWS', label: 'Planning Workflows', isCritical: false },
  { id: 'GEN_EXAMPLES', label: 'Generating Examples', isCritical: false },
  { id: 'VALIDATE_OUT', label: 'Final Validation', isCritical: true },
];

export function getApplicableSteps(workspace: AgentWorkspace): GenerationStep[] {
  const structureType = workspace.meta.structureType;
  const isMinimal = structureType === 'minimal';
  const isFull = structureType === 'full';
  
  return GENERATION_STEPS.filter(step => {
    if (isMinimal && ['GEN_INSTRUCTIONS', 'GEN_WORKFLOWS', 'GEN_EXAMPLES'].includes(step.id)) return false;
    if (step.id === 'GEN_SUBAGENTS') {
      const ext = workspace as any;
      return Object.keys(workspace.subAgents).length > 0 || (ext.subAgentsList && ext.subAgentsList.length > 0);
    }
    if (step.id === 'GEN_WORKFLOWS' && !isFull) return false;
    if (step.id === 'GEN_EXAMPLES' && !isFull) return false;
    return true;
  });
}
