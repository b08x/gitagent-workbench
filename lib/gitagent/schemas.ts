import { z } from 'zod';

export const AgentManifestSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, "Name must be kebab-case"),
  version: z.string().regex(/^\d+\.\d+\.\d+/, "Version must be semver"),
  description: z.string().min(1, "Description is required"),
  author: z.string().optional(),
  extends: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  compliance: z.object({
    risk_tier: z.enum(['low', 'standard', 'high', 'critical'] as const),
    frameworks: z.array(z.string()).optional(),
    supervision: z.object({
      human_in_the_loop: z.enum(['always', 'conditional', 'advisory', 'none'] as const),
      recordkeeping: z.boolean().optional(),
    }).optional(),
  }).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const SkillSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  description: z.string(),
  instructions: z.string(),
});

export const ToolSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  description: z.string(),
  parameters: z.record(z.string(), z.any()),
});
