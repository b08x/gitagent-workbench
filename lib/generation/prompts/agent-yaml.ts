import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { AgentManifestSchema } from '../../gitagent/schemas';

export function agentYamlPrompt(workspace: AgentWorkspace): GenerationPrompt {
  return {
    system: "You are a gitagent architect. Generate a valid agent.yaml manifest in JSON format.",
    user: `Agent Context:
Name: ${workspace.manifest.name}
Description: ${workspace.manifest.description}
Skills: ${workspace.manifest.skills?.join(', ')}
Tools: ${workspace.manifest.tools?.join(', ')}
Risk Tier: ${workspace.manifest.compliance?.risk_tier}

Generate the JSON manifest matching the agent.yaml schema.`,
    schema: AgentManifestSchema
  };
}
