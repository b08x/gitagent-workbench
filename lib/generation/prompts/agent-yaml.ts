import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { AgentManifestSchema } from '../../gitagent/schemas';

export function agentYamlPrompt(workspace: AgentWorkspace): GenerationPrompt {
  const { manifest } = workspace;

  const knownContext = {
    name: manifest.name,
    version: manifest.version || '0.1.0',
    description: manifest.description,
    author: manifest.author,
    skills: manifest.skills || [],
    tools: manifest.tools || [],
    compliance: manifest.compliance,
  };

  return {
    system: `You are generating an agent.yaml manifest for a gitagent repository.
Output valid JSON matching the gitagent agent.yaml schema.

CRITICAL — COMPLIANCE STRUCTURE:
recordkeeping is a TOP-LEVEL sibling of supervision. NEVER nest it inside supervision.

CORRECT:
{
  "compliance": {
    "risk_tier": "standard",
    "supervision": {
      "human_in_the_loop": "conditional",
      "override_capability": true,
      "kill_switch": true
    },
    "recordkeeping": {
      "audit_logging": true,
      "log_format": "structured_json"
    }
  }
}

WRONG — do NOT do this:
{
  "compliance": {
    "supervision": {
      "recordkeeping": { ... }
    }
  }
}

ALLOWED top-level fields only (no others):
name, version, description, spec_version, author, license, extends, dependencies,
skills, tools, agents, delegation, model, runtime, a2a, compliance, tags, metadata, registries

Do NOT include: config, workspace, meta, or any other fields not in that list.
All names must be kebab-case. Version must be semver X.Y.Z.
Respond with valid JSON only — no markdown, no explanation.`,

    user: `Generate agent.yaml for:\n\n${JSON.stringify(knownContext, null, 2)}\n\nExpand with appropriate model preferences and runtime settings. Keep tools and skills arrays exactly as provided.`,

    schema: AgentManifestSchema,
  };
}
