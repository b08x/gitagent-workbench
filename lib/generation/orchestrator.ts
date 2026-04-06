import { AgentWorkspace, ParsedSkill, ToolSchema } from '../gitagent/types';
import { providers } from '../providers';
import { buildGenerationPrompt } from './strategy';
import { validateWorkspace } from './validator';
import { soulPrompt } from './prompts/soul-md';
import { agentYamlPrompt } from './prompts/agent-yaml';

export interface OrchestratorConfig {
  providerId: string;
  apiKey: string;
}

export interface OrchestratorEvent {
  step: string;
  status: 'start' | 'progress' | 'done' | 'error';
  content?: string;
  workspace?: AgentWorkspace;
}

export async function* runGeneration(
  workspace: AgentWorkspace,
  config: OrchestratorConfig
): AsyncGenerator<OrchestratorEvent> {
  const provider = providers[config.providerId];
  if (!provider) throw new Error(`Provider ${config.providerId} not found`);

  const steps = [
    'GEN_YAML',
    'GEN_SOUL',
    'GEN_RULES',
    'GEN_PROMPT',
    'GEN_DUTIES',
    'GEN_SKILLS',
    'GEN_TOOLS',
    'VALIDATE_OUT'
  ];

  for (const step of steps) {
    yield { step, status: 'start' };

    try {
      if (step === 'GEN_YAML') {
        const prompt = agentYamlPrompt(workspace);
        const result = await provider.generate(prompt, config.apiKey);
        workspace.manifest = result.object || {};
        yield { step, status: 'done', workspace };
      } else if (step === 'GEN_SOUL') {
        const prompt = soulPrompt(workspace);
        let content = '';
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
          yield { step, status: 'progress', content };
        }
        workspace.soul = content;
        yield { step, status: 'done', workspace };
      } else if (step === 'GEN_RULES') {
        const prompt = buildGenerationPrompt('rules-md', 'drafting', workspace);
        let content = '';
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
        }
        workspace.rules = content;
        yield { step, status: 'done', workspace };
      } else if (step === 'GEN_PROMPT' && workspace.meta.structureType !== 'minimal') {
        const prompt = buildGenerationPrompt('prompt-md', 'drafting', workspace);
        let content = '';
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
        }
        workspace.prompt_md = content;
        yield { step, status: 'done', workspace };
      } else if (step === 'GEN_DUTIES' && (workspace.manifest.compliance?.risk_tier !== 'low')) {
        const prompt = buildGenerationPrompt('duties-md', 'drafting', workspace);
        const result = await provider.generate(prompt, config.apiKey);
        workspace.duties = result.text;
        yield { step, status: 'done', workspace };
      } else if (step === 'GEN_SKILLS') {
        // For each skill in manifest
        const skillNames = workspace.manifest.skills || [];
        for (const name of skillNames) {
          const prompt = buildGenerationPrompt('skill-md', 'drafting', workspace);
          prompt.user += `\n\nSkill Name: ${name}`;
          const result = await provider.generate(prompt, config.apiKey);
          workspace.skills[name] = {
            name,
            description: `Generated skill for ${name}`,
            instructions: result.text
          };
        }
        yield { step, status: 'done', workspace };
      } else if (step === 'GEN_TOOLS') {
        const toolNames = workspace.manifest.tools || [];
        for (const name of toolNames) {
          // Tool generation logic
          workspace.tools[name] = {
            name,
            description: `Generated tool for ${name}`,
            parameters: { type: 'object', properties: {} }
          };
        }
        yield { step, status: 'done', workspace };
      } else if (step === 'VALIDATE_OUT') {
        workspace.validationResult = validateWorkspace(workspace);
        yield { step, status: 'done', workspace };
      }
    } catch (error: any) {
      yield { step, status: 'error', content: error.message };
      return;
    }
  }

  workspace.meta.status = 'complete';
  yield { step: 'COMPLETE', status: 'done', workspace };
}
