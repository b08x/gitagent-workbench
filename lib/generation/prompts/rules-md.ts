import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';

export function rulesPrompt(workspace: AgentWorkspace): GenerationPrompt {
  return buildGenerationPrompt('rules-md', 'drafting', workspace);
}
