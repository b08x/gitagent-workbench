import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';

export function dutiesPrompt(workspace: AgentWorkspace): GenerationPrompt {
  return buildGenerationPrompt('duties-md', 'drafting', workspace);
}
