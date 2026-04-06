export type StructureType = 'minimal' | 'standard' | 'full' | 'inheritance' | 'multi-repo' | 'monorepo';

// ─── Compliance ─────────────────────────────────────────────────────────────

export interface ComplianceSupervision {
  designated_supervisor?: string | null;
  review_cadence?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  human_in_the_loop: 'always' | 'conditional' | 'advisory' | 'none';
  escalation_triggers?: Array<Record<string, unknown>>;
  override_capability?: boolean;
  kill_switch?: boolean;
}

export interface ComplianceRecordkeeping {
  audit_logging?: boolean;
  log_format?: 'structured_json' | 'plaintext';
  retention_period?: string;
  log_contents?: Array<'prompts_and_responses' | 'tool_calls' | 'decision_pathways' | 'model_version' | 'timestamps'>;
  immutable?: boolean;
}

export interface AgentCompliance {
  risk_tier: 'low' | 'standard' | 'high' | 'critical';
  frameworks?: string[];
  supervision?: ComplianceSupervision;
  // NOTE: recordkeeping is a SIBLING of supervision — NOT nested under it
  recordkeeping?: ComplianceRecordkeeping;
  model_risk?: Record<string, unknown>;
  data_governance?: Record<string, unknown>;
  communications?: Record<string, unknown>;
  vendor_management?: Record<string, unknown>;
  segregation_of_duties?: Record<string, unknown>;
}

// ─── Agent Manifest ─────────────────────────────────────────────────────────

export interface AgentManifest {
  name: string;
  version: string;
  description: string;
  spec_version?: string;
  author?: string;
  license?: string;
  extends?: string;
  dependencies?: Array<{
    name: string;
    source: string;
    version?: string;
    mount?: string;
    vendor_management?: Record<string, unknown>;
  }>;
  skills?: string[];
  tools?: string[];
  agents?: Record<string, {
    description?: string;
    delegation?: { mode?: string; triggers?: string[] };
  }>;
  delegation?: { mode?: string; router?: string };
  model?: {
    preferred?: string;
    fallback?: string[];
    constraints?: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      top_k?: number;
      stop_sequences?: string[];
      presence_penalty?: number;
      frequency_penalty?: number;
    };
  };
  runtime?: { max_turns?: number; temperature?: number; timeout?: number };
  a2a?: Record<string, unknown>;
  compliance?: AgentCompliance;
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
  registries?: Array<{ name: string; url?: string }>;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

export interface SkillMetadata {
  author?: string;
  version?: string;
  category?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface SkillExample {
  input: string;
  output: string;
}

export interface SkillDefinition {
  id: string; // Internal ID for the workbench
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  allowedTools: string[];
  metadata: SkillMetadata;
  instructions: string;
  references: Array<{ name: string; content: string }>;
  examples: SkillExample[];
  scripts: string[]; // Just filenames
}

export interface ParsedSkill {
  name: string;
  description: string;
  instructions: string;
  allowedTools?: string[];
  license?: string;
  compatibility?: string;
  metadata?: Record<string, any>;
  references?: Array<{ name: string; content: string }>;
  examples?: Array<{ input: string; output: string }>;
  scripts?: string[];
}

// ─── Tools ──────────────────────────────────────────────────────────────────

export interface ToolSchema {
  name: string;
  description: string;
  // MCP-compatible — required by gitagent spec. NOT `parameters`.
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ─── Workflows ──────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string;
  action: string;
  skill?: string;
  agent?: string;
  tool?: string;
  depends_on?: string[];
  inputs?: Record<string, unknown>;
  outputs?: string[];
  conditions?: string[];
  compliance?: Record<string, unknown>;
}

export interface WorkflowSchema {
  name: string;
  description?: string;
  version?: string;
  inputs?: Array<{ name: string; type: string; required?: boolean; default?: unknown }>;
  outputs?: Array<{ name: string; type: string }>;
  steps: WorkflowStep[];
  error_handling?: { on_step_failure?: string; escalation_target?: string };
}

// ─── Knowledge ──────────────────────────────────────────────────────────────

export interface KnowledgeEntry {
  path: string;
  always_load: boolean;
  description?: string;
}

export interface KnowledgeIndex {
  documents: KnowledgeEntry[];
}

// ─── Memory ─────────────────────────────────────────────────────────────────

export interface MemoryLayer {
  name: string;
  path: string;
  max_lines?: number;
  format?: 'markdown' | 'yaml';
  load?: 'always' | 'on_demand' | 'latest';
  retention?: string;
  rotation?: 'daily' | 'weekly' | 'monthly';
}

export interface MemoryConfig {
  layers: MemoryLayer[];
  update_triggers?: string[];
  archive_policy?: {
    max_entries?: number;
    compress_after?: string;
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ValidationError {
  file: string;
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationWarning {
  file: string;
  field?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ─── Workspace ──────────────────────────────────────────────────────────────

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
  memory_md: string | null;
  examples: { goodOutputs: string | null; badOutputs: string | null };
  config: { default: Record<string, unknown> | null; production: Record<string, unknown> | null };
  subAgents: Record<string, AgentWorkspace>;
  validationResult: ValidationResult | null;
}
