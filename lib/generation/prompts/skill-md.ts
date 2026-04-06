import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';

export function skillPrompt(workspace: AgentWorkspace, skillName: string): GenerationPrompt {
  const base = buildGenerationPrompt('skill-md', 'drafting', workspace);
  base.user += `\n\nSkill Name: ${skillName}`;
  return base;
}
