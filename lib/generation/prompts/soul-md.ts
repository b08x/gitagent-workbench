import { AgentWorkspace } from '../../gitagent/types';
import { GenerationPrompt } from '../../providers/types';
import { buildGenerationPrompt } from '../strategy';

export function soulPrompt(workspace: AgentWorkspace): GenerationPrompt {
  const base = buildGenerationPrompt('soul-md', 'drafting', workspace);
  
  base.system += `
Emotion Matrix Strategy:
- Map the agent's core drives along the axes of Intensity and Abstraction.
- Define the "Emotional Baseline" — how the agent responds when idle vs. when tasked.
- Use imagery-dense language to describe the agent's internal state.
- Perspective Stability: Lock to a first-person "I" perspective that is stable and authoritative.
`;

  base.user = `
Agent Identity:
Name: ${workspace.manifest.name}
Description: ${workspace.manifest.description}
Author: ${workspace.manifest.author}

Generate the SOUL.md file. Use the Emotion Matrix strategy to define the agent's core being.
`;

  return base;
}
