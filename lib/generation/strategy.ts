import config from '../config/agent_instruction_config.json';
import { AgentWorkspace } from '../gitagent/types';
import { GenerationPrompt } from '../providers/types';

type FileType = 'soul-md' | 'rules-md' | 'prompt-md' | 'duties-md' | 'skill-md';
type Phase = 'context_gathering' | 'drafting' | 'review';

const fileToDimensions: Record<FileType, string[]> = {
  'soul-md': ['Abstraction Level', 'Emotional / Rhetorical Intensity', 'Perspective Stability', 'Imagery Density'],
  'rules-md': ['Constraint Adherence', 'Narrative / Logical Progression', 'Perspective Stability'],
  'prompt-md': ['Imagery Density', 'Abstraction Level'],
  'duties-md': ['Constraint Adherence', 'Narrative / Logical Progression'],
  'skill-md': ['Imagery Density', 'Novelty Injection', 'Abstraction Level'],
};

export function buildGenerationPrompt(
  file: FileType,
  phase: Phase,
  workspace: AgentWorkspace
): GenerationPrompt {
  const dimensions = fileToDimensions[file];
  let systemPrompt = `You are generating a ${file} for a gitagent named "${workspace.manifest.name}".\n\n`;
  
  dimensions.forEach(dimName => {
    const dim = config.dimensions.find(d => d.dimension === dimName);
    if (dim) {
      const phaseConfig = dim[phase as keyof typeof dim] as any;
      if (phaseConfig) {
        systemPrompt += `Dimension: ${dimName}\n`;
        systemPrompt += `- Directive: ${phaseConfig.directive}\n`;
        systemPrompt += `- Avoid: ${phaseConfig.failure_mode}\n`;
        systemPrompt += `- Self-Check: ${phaseConfig.self_check}\n\n`;
      }
    }
  });

  systemPrompt += "Global Constraints:\n";
  Object.entries(config.global_intervention_primitives).forEach(([key, val]) => {
    if (key !== 'description') {
      systemPrompt += `- ${key}: ${val}\n`;
    }
  });

  const userPrompt = `Agent Context:\n${JSON.stringify(workspace.manifest, null, 2)}\n\nGenerate the content for ${file}.`;

  return {
    system: systemPrompt,
    user: userPrompt
  };
}
