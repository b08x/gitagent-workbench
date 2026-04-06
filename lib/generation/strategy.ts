import config from '../config/agent_instruction_config.json';
import { AgentWorkspace } from '../gitagent/types';
import { GenerationPrompt } from '../providers/types';

type FileType = 'soul-md' | 'rules-md' | 'prompt-md' | 'duties-md' | 'skill-md';
type Phase = 'context_gathering' | 'drafting' | 'review';

const fileTypeToProfileKey: Record<FileType, string> = {
  'soul-md': 'SOUL.md',
  'rules-md': 'RULES.md',
  'prompt-md': 'PROMPT.md',
  'duties-md': 'DUTIES.md',
  'skill-md': 'SKILL.md',
};

export function buildGenerationPrompt(
  file: FileType,
  phase: Phase,
  workspace: AgentWorkspace
): GenerationPrompt {
  const profileKey = fileTypeToProfileKey[file];
  const profile = (config as any).file_profiles?.[profileKey];
  
  let systemPrompt = `You are generating a ${file} for a gitagent named "${workspace.manifest.name}".\n\n`;
  
  if (profile) {
    systemPrompt += `Purpose: ${profile._purpose}\n`;
    systemPrompt += `SRE Risk: ${profile._sre_risk}\n\n`;

    // 1. Add profile-specific dimension overrides
    if (profile.dimensions) {
      Object.entries(profile.dimensions).forEach(([dimName, dimConfig]: [string, any]) => {
        systemPrompt += `Dimension: ${dimName} (Register: ${dimConfig.register})\n`;
        systemPrompt += `- Directive: ${dimConfig.directive}\n`;
        systemPrompt += `- Avoid: ${dimConfig.failure_mode}\n`;
        systemPrompt += `- Self-Check: ${dimConfig.self_check}\n\n`;
      });
    }

    // 2. Add pass-through dimensions from base config
    if (profile.pass_through_unchanged) {
      profile.pass_through_unchanged.forEach((dimName: string) => {
        const dim = config.dimensions.find(d => d.dimension === dimName);
        if (dim) {
          const phaseConfig = (dim as any)[phase];
          if (phaseConfig) {
            systemPrompt += `Dimension: ${dimName}\n`;
            systemPrompt += `- Directive: ${phaseConfig.directive}\n`;
            systemPrompt += `- Avoid: ${phaseConfig.failure_mode}\n`;
            systemPrompt += `- Self-Check: ${phaseConfig.self_check}\n\n`;
          }
        }
      });
    }

    if (profile.recommended_sections) {
      systemPrompt += `Recommended Sections:\n${profile.recommended_sections.map((s: string) => `- ${s}`).join('\n')}\n\n`;
    }

    if (profile.anti_patterns) {
      systemPrompt += `Anti-Patterns (DO NOT USE):\n${profile.anti_patterns.map((s: string) => `- ${s}`).join('\n')}\n\n`;
    }
  }

  systemPrompt += "Global Intervention Primitives:\n";
  Object.entries(config.global_intervention_primitives).forEach(([key, val]) => {
    if (key !== 'description') {
      systemPrompt += `- ${key}: ${val}\n`;
    }
  });

  if ((config as any).sre_failure_mode_index) {
    systemPrompt += "\nSRE Failure Mode Index (for Review Phase):\n";
    Object.entries((config as any).sre_failure_mode_index).forEach(([key, val]: [string, any]) => {
      systemPrompt += `- ${key} (SRE Analogue: ${val.sre_analogue})\n`;
      systemPrompt += `  Telemetry: ${val.telemetry}\n`;
      systemPrompt += `  Intervention: ${val.intervention}\n`;
    });
  }

  const userPrompt = `Agent Context:\n${JSON.stringify(workspace.manifest, null, 2)}\n\nGenerate the content for ${file}.`;

  return {
    system: systemPrompt,
    user: userPrompt
  };
}
