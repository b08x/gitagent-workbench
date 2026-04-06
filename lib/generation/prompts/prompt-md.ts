import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';

export function promptPrompt(workspace: AgentWorkspace): GenerationPrompt {
  return buildGenerationPrompt('prompt-md', 'drafting', workspace);
}
