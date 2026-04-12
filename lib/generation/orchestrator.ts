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

export interface OrchestratorConfig {
  providerId: string;
  apiKey: string;
}

export interface OrchestratorEvent {
  step: string;
  substep?: string;
  status: 'start' | 'progress' | 'done' | 'error' | 'skip';
  content?: string;
  workspace?: AgentWorkspace;
}

export async function* runGeneration(
  workspace: AgentWorkspace,
  config: OrchestratorConfig
): AsyncGenerator<OrchestratorEvent> {
  const provider = providers[config.providerId];
  if (!provider) throw new Error(`Provider ${config.providerId} not found`);

  const structureType = workspace.meta.structureType;
  const isMinimal = structureType === 'minimal';
  const isFull = structureType === 'full';
  const ext = workspace as any;

  const steps = [
    'GEN_YAML',
    'GEN_SOUL',
    ...(isMinimal ? [] : ['GEN_RULES']),
    ...(isMinimal ? [] : ['GEN_PROMPT']),
    ...(!isMinimal && (workspace.manifest.compliance?.risk_tier !== 'low' || isFull)
      ? ['GEN_DUTIES']
      : []),
    'GEN_CONFIG',
    'GEN_SKILLS',
    'GEN_KNOWLEDGE_DOCS',
    'GEN_TOOLS',
    ...(Object.keys(workspace.subAgents).length > 0 || (ext.subAgentsList && ext.subAgentsList.length > 0) ? ['GEN_SUBAGENTS'] : []),
    ...(isFull ? ['GEN_WORKFLOWS'] : []),
    ...(isFull ? ['GEN_EXAMPLES'] : []),
    'VALIDATE_OUT',
  ];

  let ws = { ...workspace };
  const scaffoldContext = (workspace as any).scaffoldContext || [];
  const selectedTemplate = (workspace as any).selectedTemplate;

  const contextPrompt = scaffoldContext.length > 0 
    ? `\n\nAdditional Context from Uploaded Files:\n${scaffoldContext.map((f: any) => `File: ${f.name}\nContent: ${f.content || '[Media File]'}`).join('\n---\n')}`
    : '';

  const templatePrompt = selectedTemplate === 'data-analyst' 
    ? '\n\nTEMPLATE: Data Analyst. Focus on CSV/JSON processing, data cleaning, statistical analysis, and visualization. Ensure tools for data manipulation are prioritized.'
    : selectedTemplate === 'web-scraper'
    ? '\n\nTEMPLATE: Web Scraper. Focus on headless browsing, DOM extraction, rate limiting, and structured data output. Ensure tools for networking and parsing are prioritized.'
    : selectedTemplate === 'researcher'
    ? '\n\nTEMPLATE: Researcher. Focus on deep synthesis, multi-source verification, and citation-heavy markdown outputs. Ensure tools for search and knowledge retrieval are prioritized.'
    : '';

  for (const step of steps) {
    yield { step, status: 'start' };

    try {
      // ── GEN_YAML ───────────────────────────────────────────────────────────
      if (step === 'GEN_YAML') {
        const prompt = agentYamlPrompt(ws);
        if (scaffoldContext.length > 0 || templatePrompt) {
          prompt.user += `\n\nUse the following context and template instructions to help determine appropriate metadata, description, and compliance settings:\n${templatePrompt}${contextPrompt}`;
        }
        const result = await provider.generate(prompt, config.apiKey);
        const generated = result.object || {};
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
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
          yield { step, status: 'progress', content };
        }
        ws = { ...ws, soul: content };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_RULES ──────────────────────────────────────────────────────────
      else if (step === 'GEN_RULES') {
        const prompt = buildGenerationPrompt('rules-md', 'drafting', ws);
        let content = '';
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
        }
        ws = { ...ws, rules: content };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_PROMPT ─────────────────────────────────────────────────────────
      else if (step === 'GEN_PROMPT') {
        const prompt = buildGenerationPrompt('prompt-md', 'drafting', ws);
        let content = '';
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
        }
        ws = { ...ws, prompt_md: content };
        yield { step, status: 'done', workspace: ws };
      }

      // ── GEN_DUTIES ─────────────────────────────────────────────────────────
      else if (step === 'GEN_DUTIES') {
        const prompt = buildGenerationPrompt('duties-md', 'drafting', ws);
        let content = '';
        for await (const chunk of provider.stream(prompt, config.apiKey)) {
          content += chunk;
        }
        ws = { ...ws, duties: content };
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
          const refResult = await provider.generate(refPrompt, config.apiKey);
          const refCatalogue = refResult.object?.references || [];
          
          updatedSkills[name] = {
            ...skill,
            references: refCatalogue
          };
          yield { step, substep: `${name}/references`, status: 'done' };

          // b. Generate SKILL.md
          yield { step, substep: `${name}/SKILL.md`, status: 'start' };
          const prompt = skillPrompt(ws, name, refCatalogue);
          const result = await provider.generate(prompt, config.apiKey);
          const generated = result.object || {};

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
          const result = await provider.generate(prompt, config.apiKey);

          const toolObj = result.object ?? null;
          updatedTools[name] = {
            name: toolObj?.name ?? name,
            description: toolObj?.description ?? `Tool: ${name}`,
            input_schema: toolObj?.input_schema ?? {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Input query or parameters' },
              },
              required: ['query'],
            },
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
        for await (const chunk of provider.stream(goodPrompt, config.apiKey)) {
          good += chunk;
        }
        const badPrompt = { ...goodPrompt };
        badPrompt.system = badPrompt.system.replace('GOOD', 'BAD (outputs to avoid)');
        let bad = '';
        for await (const chunk of provider.stream(badPrompt, config.apiKey)) {
          bad += chunk;
        }
        ws = { ...ws, examples: { goodOutputs: good, badOutputs: bad } };
        yield { step, status: 'done', workspace: ws };
      }

      // ── VALIDATE_OUT ───────────────────────────────────────────────────────
      else if (step === 'VALIDATE_OUT') {
        ws = { ...ws, validationResult: validateWorkspace(ws) };
        yield { step, status: 'done', workspace: ws };
      }

    } catch (error: any) {
      yield { step, status: 'error', content: error.message };
      // Continue to next step — partial output is still useful
    }
  }

  ws = { ...ws, meta: { ...ws.meta, status: 'complete' } };
  yield { step: 'COMPLETE', status: 'done', workspace: ws };
}
