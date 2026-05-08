import { z } from 'zod';

export const ComplianceSupervisionSchema = z.object({
  designated_supervisor: z.string().nullable().optional(),
  review_cadence: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
  human_in_the_loop: z.enum(['always', 'conditional', 'advisory', 'none']),
  escalation_triggers: z.array(z.record(z.string(), z.unknown())).optional(),
  override_capability: z.boolean().optional(),
  kill_switch: z.boolean().optional(),
});

export const ComplianceRecordkeepingSchema = z.object({
  audit_logging: z.boolean().optional(),
  log_format: z.enum(['structured_json', 'plaintext']).optional(),
  retention_period: z.string().optional(),
  log_contents: z.array(z.enum(['prompts_and_responses', 'tool_calls', 'decision_pathways', 'model_version', 'timestamps'])).optional(),
  immutable: z.boolean().optional(),
});

export const AgentComplianceSchema = z.object({
  risk_tier: z.enum(['low', 'standard', 'high', 'critical']),
  frameworks: z.array(z.string()).optional(),
  supervision: ComplianceSupervisionSchema.optional(),
  recordkeeping: ComplianceRecordkeepingSchema.optional(),
  model_risk: z.record(z.string(), z.unknown()).optional(),
  data_governance: z.record(z.string(), z.unknown()).optional(),
  communications: z.record(z.string(), z.unknown()).optional(),
  vendor_management: z.record(z.string(), z.unknown()).optional(),
  segregation_of_duties: z.record(z.string(), z.unknown()).optional(),
});

export const AgentManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  spec_version: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  extends: z.string().optional(),
  dependencies: z.array(z.object({
    name: z.string(),
    source: z.string(),
    version: z.string().optional(),
    mount: z.string().optional(),
    vendor_management: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  skills: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  agents: z.record(z.string(), z.object({
    description: z.string().optional(),
    delegation: z.object({
      mode: z.string().optional(),
      triggers: z.array(z.string()).optional(),
    }).optional(),
  })).optional(),
  delegation: z.object({
    mode: z.string().optional(),
    router: z.string().optional(),
  }).optional(),
  model: z.object({
    preferred: z.string().optional(),
    fallback: z.array(z.string()).optional(),
    constraints: z.object({
      temperature: z.number().optional(),
      max_tokens: z.number().optional(),
      top_p: z.number().optional(),
      top_k: z.number().optional(),
      stop_sequences: z.array(z.string()).optional(),
      presence_penalty: z.number().optional(),
      frequency_penalty: z.number().optional(),
    }).optional(),
  }).optional(),
  runtime: z.object({
    max_turns: z.number().optional(),
    temperature: z.number().optional(),
    timeout: z.number().optional(),
  }).optional(),
  compliance: AgentComplianceSchema.optional(),
  deployment_targets: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  registries: z.array(z.object({ name: z.string(), url: z.string().optional() })).optional(),
});

export const ToolYamlSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.unknown()),
    required: z.array(z.string()).optional(),
  }),
});

export const SkillInstructionSchema = z.object({
  instructions: z.string(),
  frontmatter: z.record(z.string(), z.any()).optional(),
});

export const ReferencesReadmeSchema = z.object({
  references: z.array(z.object({
    filename: z.string(),
    description: z.string(),
    trigger: z.string(),
  })),
});

export const CoreInstructionsSchema = z.object({
  rules: z.string().describe('Markdown content for RULES.md'),
  prompt: z.string().describe('Markdown content for PROMPT.md'),
  duties: z.string().describe('Markdown content for DUTIES.md'),
});
