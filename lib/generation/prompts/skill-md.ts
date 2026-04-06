import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';

export function skillPrompt(workspace: AgentWorkspace, skillName: string): GenerationPrompt {
  const base = buildGenerationPrompt('skill-md', 'drafting', workspace);
  const titleCase = skillName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

  base.system = `You are generating the instructions body for a SKILL.md file in a gitagent repository.

CRITICAL: Do NOT include YAML frontmatter. Do NOT output --- delimiters. Do NOT include
name, description, or any frontmatter fields. The frontmatter is added separately by
the serializer. Write ONLY the instructions body starting with a markdown heading.

The instructions body must:
- Start with # ${titleCase}
- Include ## Overview describing what this skill does
- Include ## Instructions with step-by-step behavioral guidance
- Include ## Examples with 1-2 concrete examples if appropriate
- Be specific to the agent domain and purpose
- Be written as directives to the agent ("When X, do Y")

${base.system}`;

  base.user = `Agent: ${workspace.manifest.name || 'unnamed'}
Description: ${workspace.manifest.description || ''}
Skill: ${skillName}

Generate the instructions body for the ${skillName} skill.
IMPORTANT: NO frontmatter, NO --- delimiters. Start directly with the # heading.`;

  return base;
}
