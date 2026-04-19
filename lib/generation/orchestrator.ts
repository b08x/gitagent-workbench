import { AgentWorkspace, ParsedSkill, ToolSchema } from '../gitagent/types';
import { providers } from '../providers';
import { generateHermesConfig } from '../gitagent/config-generator';
import { buildGenerationPrompt } from './strategy';
import { validateWorkspace } from './validator';
import { soulPrompt } from './prompts/soul-md';
import { agentYamlPrompt } from './prompts/agent-yaml';
import { skillPrompt } from './prompts/skill-md';
import { referencesReadmePrompt } from './prompts/references-readme';
import { toolYamlPrompt } from './prompts/tool-yaml';
import { retryWithBackoff } from '../utils/retry';
import { getTemplateInstructions } from './templates';
import { getApplicableSteps, StepId } from './steps';
import { z } from 'zod';
import { sanitizePromptContent } from './sanitizer';
import { validateContextLength } from './token-counter';
import { saveWorkspaceSnapshot } from './persistence';
import { GenerationPrompt, GenerationResult } from '../providers/types';

export interface OrchestratorConfig {
  providerId: string;
  apiKey: string;
  modelId: string;
  fallbackModelIds?: string[];
  apiKeys?: Record<string, string>;
  resumeFromStep?: string;
}

export interface OrchestratorEvent {
  step: string;
  substep?: string;
  status: 'start' | 'progress' | 'done' | 'error' | 'skip';
  content?: string;
  workspace?: AgentWorkspace;
}

export async function generateWithRetryAndFallback<T extends z.ZodTypeAny = any>(
  prompt: GenerationPrompt<T>,
  config: OrchestratorConfig
): Promise<GenerationResult<z.infer<T>>> {
  const models = [config.modelId, ...(config.fallbackModelIds || [])];
  let lastError: any;

  for (const modelSpec of models) {
    let providerId = config.providerId;
    let modelId = modelSpec;
    if (modelSpec.includes('/') && providers[modelSpec.split('/')[0]]) {
      const parts = modelSpec.split('/');
      providerId = parts[0];
      modelId = parts.slice(1).join('/');
    }
    const provider = providers[providerId];
    const apiKey = config.apiKeys?.[providerId] || config.apiKey;

    if (!provider || !apiKey) continue;

    try {
      return await retryWithBackoff(() => provider.generate(prompt, apiKey, modelId));
    } catch (error: any) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function* streamWithRetryAndFallback(
  prompt: GenerationPrompt,
  config: OrchestratorConfig
): AsyncGenerator<string> {
  const models = [config.modelId, ...(config.fallbackModelIds || [])];
  let lastError: any;

  for (const modelSpec of models) {
    let providerId = config.providerId;
    let modelId = modelSpec;
    if (modelSpec.includes('/') && providers[modelSpec.split('/')[0]]) {
      const parts = modelSpec.split('/');
      providerId = parts[0];
      modelId = parts.slice(1).join('/');
    }
    const provider = providers[providerId];
    const apiKey = config.apiKeys?.[providerId] || config.apiKey;

    if (!provider || !apiKey) continue;

    try {
      // We retry the stream creation and the first chunk if possible
      // In many cases, 429 happens on the first chunk or connection
      const stream = provider.stream(prompt, apiKey, modelId);
      for await (const chunk of stream) {
        yield chunk;
      }
      return;
    } catch (error: any) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function* runGeneration(
  workspace: AgentWorkspace,
  config: OrchestratorConfig
): AsyncGenerator<OrchestratorEvent> {
  const provider = providers[config.providerId];
  if (!provider) throw new Error(`Provider ${config.providerId} not found`);

  const applicableSteps = getApplicableSteps(workspace);
  let ws = { ...workspace };
  const scaffoldContext = (workspace as any).scaffoldContext || [];
  const selectedTemplate = (workspace as any).selectedTemplate;

  const contextPrompt = scaffoldContext.length > 0 
    ? `\n\nAdditional Context from Uploaded Files:\n${scaffoldContext.map((f: any) => `File: ${f.name}\nContent: ${sanitizePromptContent(f.content || '[Media File]')}`).join('\n---\n')}`
    : '';

  validateContextLength(contextPrompt);

  const templatePrompt = getTemplateInstructions(selectedTemplate);
  let skip = config.resumeFromStep ? true : false;

  for (const stepConfig of applicableSteps) {
    const step = stepConfig.id;

    if (skip) {
      if (step === config.resumeFromStep) {
        skip = false;
      } else {
        yield { step, status: 'done', content: 'Already completed (skipped)' };
        continue;
      }
    }

    yield { step, status: 'start' };

    try {
      // ── SANITIZE_INPUTS ───────────────────────────────────────────────────
      if (step === 'SANITIZE_INPUTS') {
        yield { step, status: 'progress', content: 'Sanitizing and refining agent configuration...' };
        const prompt = {
          system: `You are the Editor Assistant. Your job is to sanitize and refine the user's initial agent configuration.
Ensure the name is kebab-case, the description is clear and professional, and the core identity (SOUL) is consistent with the agent's purpose.
If the user provided context files, incorporate key insights from them into the refined configuration.`,
          user: `Current Workspace State:
Name: ${ws.manifest.name}
Description: ${ws.manifest.description}
Template: ${selectedTemplate}
Context Files: ${scaffoldContext.map((f: any) => f.name).join(', ')}

Refine the manifest and provide a concise summary of changes.`,
        };

        const result = await generateWithRetryAndFallback(prompt, config);
        // We don't strictly update the workspace here unless we want to force changes,
        // but we'll use this as a "pre-flight" check.
        yield { step, status: 'done', content: result.text || 'Configuration sanitized.' };
      }

      // ── GEN_YAML ───────────────────────────────────────────────────────────
      else if (step === 'GEN_YAML') {
        const prompt = agentYamlPrompt(ws);
        if (scaffoldContext.length > 0 || templatePrompt) {
          prompt.user += `\n\nUse the following context and template instructions to help determine appropriate metadata, description, and compliance settings:\n${templatePrompt}${contextPrompt}`;
        }
        const result = await generateWithRetryAndFallback(prompt, config);
        const generated = (result.object as any) || {};
        ws = {
          ...ws,
          manifest: {
            ...generated,
            name: ws.manifest.name || generated.name,
            version: ws.manifest.version || generated.version,
            description: ws.manifest.description || generated.description,
            author: ws.manifest.author || generated.author,
            skills: ws.manifest.skills,
            tools: ws.manifest.tools,
            compliance: ws.manifest.compliance || generated.compliance,
          },
        };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_SOUL ───────────────────────────────────────────────────────────
      else if (step === 'GEN_SOUL') {
        const prompt = soulPrompt(ws);
        if (scaffoldContext.length > 0 || templatePrompt) {
          prompt.user += `\n\nUse the following context and template instructions to help define the agent's personality and core identity:\n${templatePrompt}${contextPrompt}`;
        }
        let content = '';
        for await (const chunk of streamWithRetryAndFallback(prompt, config)) {
          content += chunk;
          yield { step, status: 'progress', content };
        }
        ws = { ...ws, soul: content };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_INSTRUCTIONS ──────────────────────────────────────────────────
      else if (step === 'GEN_INSTRUCTIONS') {
        yield { step, status: 'progress', content: 'Generating Rules, Prompt, and Duties...' };
        const instructionSchema = z.object({
          rules: z.string().describe('Markdown content for RULES.md'),
          prompt: z.string().describe('Markdown content for PROMPT.md'),
          duties: z.string().describe('Markdown content for DUTIES.md'),
        });

        const prompt: GenerationPrompt<typeof instructionSchema> = {
          system: `You are the Instruction Architect. Generate the core behavior instructions for the agent.
You must return a structured JSON object containing:
- rules: A comprehensive RULES.md content.
- prompt: A concise PROMPT.md content.
- duties: A DUTIES.md content clarifying responsibilities.

Follow these quality guidelines:
1. Rules should prioritize safety, identity, and tool constraints.
2. The prompt should be optimized for LLM readability.
3. Duties should define clear success metrics.`,
          user: `Agent Identity:
Name: ${ws.manifest.name}
Description: ${ws.manifest.description}
Manifest: ${JSON.stringify(ws.manifest, null, 2)}
Soul: ${ws.soul}
${templatePrompt}${contextPrompt}

Generate the instruction set.`,
          schema: instructionSchema
        };

        const result = await generateWithRetryAndFallback(prompt, config);
        if (result.object) {
          ws = {
            ...ws,
            rules: result.object.rules,
            prompt_md: result.object.prompt,
            duties: result.object.duties
          };
        }
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_CONFIG ─────────────────────────────────────────────────────────
      else if (step === 'GEN_CONFIG') {
        ws.hermesConfig = generateHermesConfig(ws);
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_SKILLS ─────────────────────────────────────────────────────────
      // Generates one SKILL.md per declared skill name.
      // Now includes references/ scaffold and progressive disclosure.
      else if (step === 'GEN_SKILLS') {
        const skillNames = ws.manifest.skills || [];
        const updatedSkills = { ...ws.skills };

        for (const name of skillNames) {
          const skill = updatedSkills[name];
          
          // a. Generate references/README.md catalogue
          yield { step, substep: `${name}/references`, status: 'start' };
          const refPrompt = referencesReadmePrompt(
            name,
            skill.description,
            skill.allowedTools,
            skill.category
          );
          const refResult = await generateWithRetryAndFallback(refPrompt, config);
          const refCatalogue = (refResult.object as any)?.references || [];
          
          updatedSkills[name] = {
            ...skill,
            references: refCatalogue
          };
          yield { step, substep: `${name}/references`, status: 'done' };

          // b. Generate SKILL.md
          yield { step, substep: `${name}/SKILL.md`, status: 'start' };
          const prompt = skillPrompt(ws, name, refCatalogue);
          const result = await generateWithRetryAndFallback(prompt, config);
          const generated = (result.object as any) || {};

          updatedSkills[name] = {
            ...updatedSkills[name],
            instructions: generated.instructions || '',
            metadata: {
              ...updatedSkills[name].metadata,
              frontmatter: generated.frontmatter
            }
          };
          yield { step, substep: `${name}/SKILL.md`, status: 'done' };
        }

        ws = { ...ws, skills: updatedSkills };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_KNOWLEDGE_DOCS ─────────────────────────────────────────────────
      else if (step === 'GEN_KNOWLEDGE_DOCS') {
        yield { step, status: 'progress', content: 'Checking knowledge documents...' };
        const docsToGen = (ws.knowledgeDocs || []).filter(d => !d.content);
        if (docsToGen.length === 0) {
          yield { step, status: 'done', content: 'All knowledge documents have content.' };
        } else {
          yield { 
            step, 
            status: 'skip', 
            content: `Generation deferred for: ${docsToGen.map(d => d.path).join(', ')}` 
          };
        }
      }

      // ── GEN_TOOLS ──────────────────────────────────────────────────────────
      // Generates one tools/<n>.yaml per declared tool name.
      // Each tool MUST have input_schema (MCP-compatible) — NOT `parameters`.
      // Without this step, gitagent validate fails: "Referenced tool X not found".
      else if (step === 'GEN_TOOLS') {
        const toolNames = ws.manifest.tools || [];
        const updatedTools = { ...ws.tools };

        for (const name of toolNames) {
          yield { step: `GEN_TOOL:${name}`, status: 'start' };
          const prompt = toolYamlPrompt(ws, name);
          const result = await generateWithRetryAndFallback(prompt, config);

          const toolObj = (result.object as any) ?? null;
          const input_schema = toolObj?.input_schema ?? toolObj?.parameters ?? {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Input query or parameters' },
            },
            required: ['query'],
          };

          updatedTools[name] = {
            name: toolObj?.name ?? name,
            description: toolObj?.description ?? `Tool: ${name}`,
            input_schema,
          };
          yield { step: `GEN_TOOL:${name}`, status: 'done' };
        }

        ws = { ...ws, tools: updatedTools };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_SUBAGENTS ──────────────────────────────────────────────────────
      else if (step === 'GEN_SUBAGENTS') {
        const subAgentNames = Object.keys(ws.subAgents);
        const matrix = ws.toolPermissions?.matrix || {};
        const subAgentTools = Object.entries(matrix)
          .filter(([_, cols]) => cols['sub-agent'] === true)
          .map(([tool, _]) => tool);

        for (const name of subAgentNames) {
          ws.subAgents[name].manifest = {
            ...ws.subAgents[name].manifest,
            tools: subAgentTools
          };
        }
        
        // Also handle subAgentsList from wizard if applicable
        if ((ws as any).subAgentsList) {
          (ws as any).subAgentsList = (ws as any).subAgentsList.map((a: any) => ({
            ...a,
            tools: subAgentTools
          }));
        }

        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_WORKFLOWS ──────────────────────────────────────────────────────
      else if (step === 'GEN_WORKFLOWS') {
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_EXAMPLES ───────────────────────────────────────────────────────
      else if (step === 'GEN_EXAMPLES') {
        const goodPrompt = buildGenerationPrompt('soul-md', 'review', ws);
        goodPrompt.system = `Generate 3-5 examples of GOOD outputs for a gitagent named "${ws.manifest.name}". Format as markdown with ## Example N headers.`;
        goodPrompt.user = `Agent: ${ws.manifest.name}\nDomain: ${ws.manifest.description}\n\nGenerate good-outputs.md.`;
        let good = '';
        for await (const chunk of streamWithRetryAndFallback(goodPrompt, config)) {
          good += chunk;
        }
        const badPrompt = { ...goodPrompt };
        badPrompt.system = badPrompt.system.replace('GOOD', 'BAD (outputs to avoid)');
        let bad = '';
        for await (const chunk of streamWithRetryAndFallback(badPrompt, config)) {
          bad += chunk;
        }
        ws = { ...ws, examples: { goodOutputs: good, badOutputs: bad } };
        yield { step, status: 'done', workspace: ws };
      }

      // ── VALIDATE_OUT ───────────────────────────────────────────────────────
      else if (step === 'VALIDATE_OUT') {
        ws = { ...ws, validationResult: validateWorkspace(ws) };
        saveWorkspaceSnapshot(ws);
        yield { step, status: 'done', workspace: ws };
      }

    } catch (error: any) {
      yield { step, status: 'error', content: error.message };
      
      if (stepConfig.isCritical) {
        throw new Error(`Critical step "${stepConfig.label}" failed: ${error.message}`);
      }
      // Continue to next step for non-critical failures
    } finally {
      // Snapshot state after each step attempt (even if non-critical error)
      saveWorkspaceSnapshot(ws);
    }
  }

  ws = { ...ws, meta: { ...ws.meta, status: 'complete' } };
  yield { step: 'COMPLETE', status: 'done', workspace: ws };
}
