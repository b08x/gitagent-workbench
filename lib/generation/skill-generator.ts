import { AgentWorkspace, SkillDefinition } from '../gitagent/types';
import { providers } from '../providers';
import { buildGenerationPrompt } from './strategy';

export interface SkillGenerationConfig {
  providerId: string;
  apiKey: string;
}

export async function* generateSkillInstructions(
  skill: SkillDefinition,
  workspace: AgentWorkspace,
  config: SkillGenerationConfig
): AsyncGenerator<{ status: 'start' | 'progress' | 'done' | 'error'; content?: string }> {
  const provider = providers[config.providerId];
  if (!provider) throw new Error(`Provider ${config.providerId} not found`);

  yield { status: 'start' };

  try {
    // We use the 'skill-md' profile from the v2 config
    // The buildGenerationPrompt function in strategy.ts already handles this
    const prompt = buildGenerationPrompt('skill-md', 'drafting', {
      ...workspace,
      manifest: {
        ...workspace.manifest,
        name: skill.name,
        description: skill.description
      }
    });

    let instructions = '';
    for await (const chunk of provider.stream(prompt, config.apiKey)) {
      instructions += chunk;
      yield { status: 'progress', content: instructions };
    }

    // Strip any accidental frontmatter the model may have included
    const instructionsBody = instructions
      .replace(/^---[\s\S]*?---\n?/, '')
      .trim();

    yield { status: 'done', content: instructionsBody };
  } catch (error: any) {
    yield { status: 'error', content: error.message };
  }
}
