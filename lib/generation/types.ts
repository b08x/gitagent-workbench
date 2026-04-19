import { AgentWorkspace } from '../gitagent/types';
import { StepId } from './steps';

export interface OrchestratorConfig {
  providerId: string;
  apiKey: string;
  modelId: string;
  fallbackModelIds?: string[];
  apiKeys?: Record<string, string>;
  resumeFromStep?: string;
  contextLimit?: number; // Maximum tokens for the total prompt
}

export interface OrchestratorEvent {
  step: string;
  substep?: string;
  status: 'start' | 'progress' | 'done' | 'error' | 'skip';
  content?: string;
  workspace?: AgentWorkspace;
}

export interface StepHandlerContext {
  workspace: Readonly<AgentWorkspace>;
  config: OrchestratorConfig;
  templatePrompt: string;
  contextPrompt: string;
}

export interface GenerationStepHandler {
  id: StepId;
  handle(context: StepHandlerContext): AsyncGenerator<OrchestratorEvent, Partial<AgentWorkspace> | void>;
}
