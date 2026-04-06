import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { ToolSchema } from '../../gitagent/schemas';

export function toolYamlPrompt(workspace: AgentWorkspace, toolName: string): GenerationPrompt {
  return {
    system: "Generate a valid tool YAML manifest in JSON format.",
    user: `Agent Context: ${workspace.manifest.name}\nTool Name: ${toolName}`,
    schema: ToolSchema
  };
}
