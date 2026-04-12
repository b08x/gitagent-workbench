import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';
import { z } from 'zod';

export const skillMdOutputSchema = z.object({
  instructions: z.string().describe('The markdown instructions body for the skill'),
  frontmatter: z.object({
    name: z.string(),
    description: z.string(),
    version: z.string(),
    metadata: z.object({
      hermes: z.object({
        tags: z.array(z.string()),
        category: z.string()
      }),
      'allowed-tools': z.string().describe('Space-separated canonical tool names')
    })
  })
});

export function skillPrompt(
  workspace: AgentWorkspace, 
  skillName: string,
  references: Array<{ filename: string; description: string; trigger: string }> = []
): GenerationPrompt {
  const base = buildGenerationPrompt('skill-md', 'drafting', workspace);
  
  const progressiveDisclosure = `
PROGRESSIVE DISCLOSURE PATTERN:
The agent doesn't load references automatically. The SKILL.md must explicitly instruct
the agent when to load a reference using skill_view().
Example: "For API details, use: skill_view('${skillName}', 'references/api-docs.md')"
This is a token efficiency pattern — references are only loaded when needed.
`;

  base.system = `
You are generating a SKILL.md file for a gitagent.
Abstraction Level: low (be precise and technical).
Imagery Density: minimal (avoid flowery language).

AGENT IDENTITY CONTEXT (SOUL.md):
${workspace.soul || 'No soul defined.'}

PERMITTED TOOLS FOR THIS SKILL:
${workspace.skills[skillName]?.allowedTools?.join(', ') || 'None'}

${progressiveDisclosure}

INSTRUCTIONS:
- Generate the instructions body in Markdown.
- Include a ## References section at the bottom listing each catalogue entry with the correct skill_view() call.
- The ## References section is NOT free-form prose — it is a structured list with exact skill_view() syntax.
- Use the provided references catalogue to build this section.

SELF-CHECK:
- Does the ## References section use exact skill_view() syntax for every entry?
- Is the Imagery Density minimal?
- Is the Abstraction Level low?

${base.system}
`;

  base.user = `
Skill Name: ${skillName}
Description: ${workspace.skills[skillName]?.description || ''}
Category: ${workspace.skills[skillName]?.category || ''}
Allowed Tools: ${workspace.skills[skillName]?.allowedTools?.join(' ') || ''}

${references.length > 0 ? `Proposed References Catalogue:\n${JSON.stringify(references, null, 2)}` : ''}

Generate the SKILL.md content (instructions and frontmatter).
`;

  base.schema = skillMdOutputSchema;

  return base;
}
