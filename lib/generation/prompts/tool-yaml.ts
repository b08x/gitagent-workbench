import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { ToolYamlSchema } from '../../gitagent/schemas';

export function toolYamlPrompt(workspace: AgentWorkspace, toolName: string): GenerationPrompt {
  return {
    system: `You are generating an MCP-compatible tool definition for a gitagent.

Output valid JSON with this EXACT structure:
{
  "name": "tool-name",
  "description": "what the tool does",
  "input_schema": {
    "type": "object",
    "properties": {
      "param_name": {
        "type": "string",
        "description": "..."
      }
    },
    "required": ["param_name"]
  }
}

Rules:
- name must be kebab-case
- input_schema.type must be exactly "object"
- properties must have at least one entry
- Do NOT use "parameters" — must use "input_schema"
- Respond with valid JSON only — no markdown, no explanation`,

    user: `Agent: ${workspace.manifest.name || 'unknown'}
Description: ${workspace.manifest.description || ''}
Tool name: ${toolName}

Generate a complete MCP-compatible tool definition for "${toolName}".
Infer appropriate parameters from the tool name and agent context.`,

    schema: ToolYamlSchema,
  };
}
