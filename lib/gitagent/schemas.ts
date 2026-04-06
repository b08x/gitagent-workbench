import { z } from 'zod';

// ─── Compliance sub-schemas ────────────────────────────────────────────────

const EscalationTriggerSchema = z.union([
  z.object({ confidence_below: z.number().min(0).max(1) }),
  z.object({ action_type: z.string() }),
  z.object({ error_detected: z.boolean() }),
  z.object({ data_classification_above: z.string() }),
  z.object({ token_count_above: z.number().int() }),
  z.object({ custom: z.string() }),
]);

const SupervisionSchema = z.object({
  designated_supervisor: z.string().nullable().optional(),
  review_cadence: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
  human_in_the_loop: z.enum(['always', 'conditional', 'advisory', 'none']),
  escalation_triggers: z.array(EscalationTriggerSchema).optional(),
  override_capability: z.boolean().optional(),
  kill_switch: z.boolean().optional(),
});

const RecordkeepingSchema = z.object({
  audit_logging: z.boolean().optional(),
  log_format: z.enum(['structured_json', 'plaintext']).optional(),
  retention_period: z.string().regex(/^\d+[ymd]$/).optional(),
  log_contents: z.array(z.enum([
    'prompts_and_responses', 'tool_calls', 'decision_pathways', 'model_version', 'timestamps'
  ])).optional(),
  immutable: z.boolean().optional(),
});

const ModelRiskSchema = z.object({
  inventory_id: z.string().nullable().optional(),
  validation_cadence: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
  validation_type: z.enum(['full', 'targeted', 'change_based']).optional(),
  conceptual_soundness: z.string().nullable().optional(),
  ongoing_monitoring: z.boolean().optional(),
  outcomes_analysis: z.boolean().optional(),
  drift_detection: z.boolean().optional(),
  parallel_testing: z.boolean().optional(),
});

const DataGovernanceSchema = z.object({
  pii_handling: z.enum(['redact', 'encrypt', 'prohibit', 'allow']).optional(),
  data_classification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  consent_required: z.boolean().optional(),
  cross_border: z.boolean().optional(),
  bias_testing: z.boolean().optional(),
  lda_search: z.boolean().optional(),
});

const CommunicationsSchema = z.object({
  type: z.enum(['correspondence', 'retail', 'institutional']).optional(),
  pre_review_required: z.boolean().optional(),
  fair_balanced: z.boolean().optional(),
  no_misleading: z.boolean().optional(),
  disclosures_required: z.boolean().optional(),
});

const VendorManagementSchema = z.object({
  due_diligence_complete: z.boolean().optional(),
  soc_report_required: z.boolean().optional(),
  vendor_ai_notification: z.boolean().optional(),
  subcontractor_assessment: z.boolean().optional(),
});

const SodRoleSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const SegregationOfDutiesSchema = z.object({
  roles: z.array(SodRoleSchema).optional(),
  conflicts: z.array(z.array(z.string())).optional(),
  assignments: z.record(z.string(), z.array(z.string())).optional(),
  isolation: z.object({
    state: z.enum(['separate', 'shared']).optional(),
    credentials: z.enum(['separate', 'shared']).optional(),
  }).optional(),
  handoffs: z.array(z.any()).optional(),
  enforcement: z.enum(['strict', 'advisory']).optional(),
});

// ─── Compliance — recordkeeping is SIBLING of supervision, not child ────────

export const ComplianceSchema = z.object({
  risk_tier: z.enum(['low', 'standard', 'high', 'critical']),
  frameworks: z.array(z.string()).optional(),
  supervision: SupervisionSchema.optional(),
  recordkeeping: RecordkeepingSchema.optional(),
  model_risk: ModelRiskSchema.optional(),
  data_governance: DataGovernanceSchema.optional(),
  communications: CommunicationsSchema.optional(),
  vendor_management: VendorManagementSchema.optional(),
  segregation_of_duties: SegregationOfDutiesSchema.optional(),
});

// ─── Model block ───────────────────────────────────────────────────────────

const ModelConstraintsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().positive().optional(),
  stop_sequences: z.array(z.string()).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
});

const ModelSchema = z.object({
  preferred: z.string().optional(),
  fallback: z.array(z.string()).optional(),
  constraints: ModelConstraintsSchema.optional(),
});

const DependencySchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*/),
  source: z.string(),
  version: z.string().optional(),
  mount: z.string().optional(),
  vendor_management: z.object({
    due_diligence_date: z.string().optional(),
    soc_report: z.boolean().optional(),
    risk_assessment: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
});

const SubAgentSchema = z.object({
  description: z.string().optional(),
  delegation: z.object({
    mode: z.enum(['auto', 'explicit', 'router']).optional(),
    triggers: z.array(z.string()).optional(),
  }).optional(),
});

const RuntimeSchema = z.object({
  max_turns: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  timeout: z.number().int().positive().optional(),
});

const A2ASchema = z.object({
  url: z.string().url().optional(),
  capabilities: z.array(z.string()).optional(),
  authentication: z.object({
    type: z.enum(['none', 'api_key', 'oauth2', 'mtls']).optional(),
    credentials_ref: z.string().optional(),
    required: z.boolean().optional(),
  }).optional(),
  protocols: z.array(z.string()).optional(),
});

const DelegationSchema = z.object({
  mode: z.enum(['auto', 'explicit', 'router']).optional(),
  router: z.string().optional(),
});

// ─── Agent Manifest — strict allowlist of top-level fields ─────────────────

export const AgentManifestSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'Name must be kebab-case'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be semver'),
  description: z.string().min(1, 'Description is required'),
  spec_version: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  extends: z.string().optional(),
  dependencies: z.array(DependencySchema).optional(),
  skills: z.array(z.string().regex(/^[a-z][a-z0-9-]*/)).optional(),
  tools: z.array(z.string().regex(/^[a-z][a-z0-9-]*/)).optional(),
  agents: z.record(z.string(), SubAgentSchema).optional(),
  delegation: DelegationSchema.optional(),
  model: ModelSchema.optional(),
  runtime: RuntimeSchema.optional(),
  a2a: A2ASchema.optional(),
  compliance: ComplianceSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  registries: z.array(z.object({
    name: z.string(),
    url: z.string().url().optional(),
  })).optional(),
});

// ─── Skill frontmatter ─────────────────────────────────────────────────────

export const SkillFrontmatterSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  description: z.string().min(1),
  license: z.string().optional(),
  compatibility: z.string().optional(),
  'allowed-tools': z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ─── Tool schema (MCP-compatible) ──────────────────────────────────────────

export const ToolYamlSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*/),
  description: z.string().min(1),
  input_schema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()).optional(),
  }),
});
