import { z } from 'zod';

export type StructureType = 'minimal' | 'standard' | 'full' | 'inheritance' | 'multi-repo' | 'monorepo';

export interface AgentManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  extends?: string;
  dependencies?: string[];
  skills?: string[];
  tools?: string[];
  compliance?: {
    risk_tier: 'low' | 'standard' | 'high' | 'critical';
    frameworks?: string[];
    supervision?: {
      human_in_the_loop: 'always' | 'conditional' | 'advisory' | 'none';
      recordkeeping?: boolean;
    };
  };
  config?: Record<string, any>;
}

export interface ParsedSkill {
  name: string;
  description: string;
  instructions: string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface WorkflowSchema {
  name: string;
  description: string;
  steps: any[];
}

export interface KnowledgeIndex {
  files: string[];
}

export interface MemoryConfig {
  type: string;
  config: Record<string, any>;
}

export interface ValidationError {
  file: string;
  message: string;
  code?: string;
}

export interface ValidationWarning {
  file: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface AgentWorkspace {
  meta: {
    structureType: StructureType;
    status: 'intake' | 'generating' | 'validating' | 'complete' | 'error';
    currentStep: string | null;
    lastDownloadedAt: Date | null;
  };
  manifest: Partial<AgentManifest>;
  soul: string | null;
  rules: string | null;
  prompt_md: string | null;
  duties: string | null;
  agents_md: string | null;
  skills: Record<string, ParsedSkill>;
  tools: Record<string, ToolSchema>;
  workflows: Record<string, WorkflowSchema>;
  knowledge: KnowledgeIndex | null;
  memory: MemoryConfig | null;
  examples: { goodOutputs: string | null; badOutputs: string | null };
  config: { default: Record<string, any> | null; production: Record<string, any> | null };
  subAgents: Record<string, AgentWorkspace>;
  validationResult: ValidationResult | null;
}
