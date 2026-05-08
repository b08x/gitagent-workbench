import { OrchestratorEvent, StepHandlerContext, GenerationStepHandler } from '../types';
import { generateWithRetryAndFallback, streamWithRetryAndFallback } from '../engine';
import { AgentWorkspace } from '../../gitagent/types';
import { 
  AgentManifestSchema, 
  ToolYamlSchema, 
  CoreInstructionsSchema, 
  SkillInstructionSchema, 
  ReferencesReadmeSchema 
} from '../../gitagent/schemas';
import { soulPrompt } from '../prompts/soul-md';
import { agentYamlPrompt } from '../prompts/agent-yaml';
import { skillPrompt } from '../prompts/skill-md';
import { referencesReadmePrompt } from '../prompts/references-readme';
import { toolYamlPrompt } from '../prompts/tool-yaml';
import { generateHermesConfig } from '../../gitagent/config-generator';
import { validateWorkspace } from '../validator';
import { buildGenerationPrompt } from '../strategy';
import { z } from 'zod';

export const SanitizeInputsHandler: GenerationStepHandler = {
  id: 'SANITIZE_INPUTS',
  async *handle({ workspace, config, contextPrompt }) {
    yield { step: this.id, status: 'progress', content: 'Sanitizing and refining agent configuration...' };
    const scaffoldContext = (workspace as any).scaffoldContext || [];
    const selectedTemplate = (workspace as any).selectedTemplate;
    
    const prompt = {
      system: `You are the Editor Assistant. Your job is to sanitize and refine the user's initial agent configuration.
Ensure the name is kebab-case, the description is clear and professional, and the core identity (SOUL) is consistent with the agent's purpose.
If the user provided context files, incorporate key insights from them into the refined configuration.`,
      user: `Current Workspace State:
Name: ${workspace.manifest.name}
Description: ${workspace.manifest.description}
Template: ${selectedTemplate}
Context Files: ${scaffoldContext.map((f: any) => f.name).join(', ')}

Refine the manifest and provide a concise summary of changes.`,
    };

    const result = await generateWithRetryAndFallback(prompt, config);
    yield { step: this.id, status: 'done', content: result.text || 'Configuration sanitized.' };
    return {};
  }
};

export const GenYamlHandler: GenerationStepHandler = {
  id: 'GEN_YAML',
  async *handle({ workspace, config, templatePrompt, contextPrompt }) {
    const prompt = agentYamlPrompt(workspace);
    if (contextPrompt || templatePrompt) {
      prompt.user += `\n\nUse the following context and template instructions to help determine appropriate metadata, description, and compliance settings:\n${templatePrompt}${contextPrompt}`;
    }
    // ENG-103: Mandate Zod schema
    prompt.schema = AgentManifestSchema;
    
    const result = await generateWithRetryAndFallback(prompt, config);
    const generated = result.object!;
    
    return {
      manifest: {
        ...generated,
        name: workspace.manifest.name || generated.name,
        version: workspace.manifest.version || generated.version,
        description: workspace.manifest.description || generated.description,
        author: workspace.manifest.author || generated.author,
        skills: workspace.manifest.skills,
        tools: workspace.manifest.tools,
        compliance: workspace.manifest.compliance || generated.compliance,
      } as any,
    };
  }
};

export const GenSoulHandler: GenerationStepHandler = {
  id: 'GEN_SOUL',
  async *handle({ workspace, config, templatePrompt, contextPrompt }) {
    const prompt = soulPrompt(workspace);
    if (contextPrompt || templatePrompt) {
      prompt.user += `\n\nUse the following context and template instructions to help define the agent's personality and core identity:\n${templatePrompt}${contextPrompt}`;
    }
    let content = '';
    for await (const chunk of streamWithRetryAndFallback(prompt, config)) {
      content += chunk;
      yield { step: this.id, status: 'progress', content };
    }
    return { soul: content };
  }
};

export const GenInstructionsHandler: GenerationStepHandler = {
  id: 'GEN_INSTRUCTIONS',
  async *handle({ workspace, config, templatePrompt, contextPrompt }) {
    yield { step: this.id, status: 'progress', content: 'Generating Rules, Prompt, and Duties...' };
    
    const prompt = {
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
Name: ${workspace.manifest.name}
Description: ${workspace.manifest.description}
Manifest: ${JSON.stringify(workspace.manifest, null, 2)}
Soul: ${workspace.soul}
${templatePrompt}${contextPrompt}

Generate the instruction set.`,
      schema: CoreInstructionsSchema
    };

    const result = await generateWithRetryAndFallback(prompt, config);
    if (result.object) {
      return {
        rules: result.object.rules,
        prompt_md: result.object.prompt,
        duties: result.object.duties
      };
    }
  }
};

export const GenConfigHandler: GenerationStepHandler = {
  id: 'GEN_CONFIG',
  async *handle({ workspace }) {
    return { hermesConfig: generateHermesConfig(workspace) };
  }
};

export const GenSkillsHandler: GenerationStepHandler = {
  id: 'GEN_SKILLS',
  async *handle({ workspace, config }) {
    const skillNames = workspace.manifest.skills || [];
    // ENG-102: Atomic staging
    const stagedSkills = { ...workspace.skills };

    for (const name of skillNames) {
      const skill = stagedSkills[name];
      
      // a. Generate references/README.md catalogue
      yield { step: this.id, substep: `${name}/references`, status: 'start' };
      const refPrompt = referencesReadmePrompt(
        name,
        skill.description,
        skill.allowedTools,
        skill.category
      );
      // ENG-103
      refPrompt.schema = ReferencesReadmeSchema;
      
      const refResult = await generateWithRetryAndFallback(refPrompt, config);
      const refCatalogue = refResult.object!.references;
      
      stagedSkills[name] = {
        ...skill,
        references: refCatalogue
      };
      yield { step: this.id, substep: `${name}/references`, status: 'done' };

      // b. Generate SKILL.md
      yield { step: this.id, substep: `${name}/SKILL.md`, status: 'start' };
      const prompt = skillPrompt(workspace, name, refCatalogue);
      // ENG-103
      prompt.schema = SkillInstructionSchema;
      
      const result = await generateWithRetryAndFallback(prompt, config);
      const generated = result.object!;

      stagedSkills[name] = {
        ...stagedSkills[name],
        instructions: generated.instructions || '',
        metadata: {
          ...stagedSkills[name].metadata,
          frontmatter: generated.frontmatter
        } as any
      };
      yield { step: this.id, substep: `${name}/SKILL.md`, status: 'done' };
    }

    return { skills: stagedSkills };
  }
};

export const GenKnowledgeDocsHandler: GenerationStepHandler = {
  id: 'GEN_KNOWLEDGE_DOCS',
  async *handle({ workspace }) {
    yield { step: this.id, status: 'progress', content: 'Checking knowledge documents...' };
    const docsToGen = (workspace.knowledgeDocs || []).filter(d => !d.content);
    if (docsToGen.length === 0) {
      yield { step: this.id, status: 'done', content: 'All knowledge documents have content.' };
    } else {
      yield { 
        step: this.id, 
        status: 'skip', 
        content: `Generation deferred for: ${docsToGen.map(d => d.path).join(', ')}` 
      };
    }
  }
};

export const GenToolsHandler: GenerationStepHandler = {
  id: 'GEN_TOOLS',
  async *handle({ workspace, config }) {
    const toolNames = workspace.manifest.tools || [];
    // ENG-102: Atomic staging
    const stagedTools = { ...workspace.tools };

    for (const name of toolNames) {
      yield { step: `GEN_TOOL:${name}`, status: 'start' };
      const prompt = toolYamlPrompt(workspace, name);
      // ENG-103
      prompt.schema = ToolYamlSchema;
      
      const result = await generateWithRetryAndFallback(prompt, config);
      const toolObj = result.object!;

      stagedTools[name] = {
        name: toolObj.name,
        description: toolObj.description,
        input_schema: toolObj.input_schema,
      };
      yield { step: `GEN_TOOL:${name}`, status: 'done' };
    }

    return { tools: stagedTools };
  }
};

export const GenSubAgentsHandler: GenerationStepHandler = {
  id: 'GEN_SUBAGENTS',
  async *handle({ workspace }) {
    const subAgents = { ...workspace.subAgents };
    const subAgentNames = Object.keys(subAgents);
    const matrix = workspace.toolPermissions?.matrix || {};
    const subAgentTools = Object.entries(matrix)
      .filter(([_, cols]) => cols['sub-agent'] === true)
      .map(([tool, _]) => tool);

    for (const name of subAgentNames) {
      subAgents[name].manifest = {
        ...subAgents[name].manifest,
        tools: subAgentTools
      };
    }
    
    // Also handle subAgentsList from wizard if applicable
    const partial: Partial<AgentWorkspace> = { subAgents };
    if ((workspace as any).subAgentsList) {
      (partial as any).subAgentsList = (workspace as any).subAgentsList.map((a: any) => ({
        ...a,
        tools: subAgentTools
      }));
    }

    return partial;
  }
};

export const GenWorkflowsHandler: GenerationStepHandler = {
  id: 'GEN_WORKFLOWS',
  async *handle() {
    return {};
  }
};

export const GenExamplesHandler: GenerationStepHandler = {
  id: 'GEN_EXAMPLES',
  async *handle({ workspace, config }) {
    const goodPrompt = buildGenerationPrompt('soul-md', 'review', workspace as any);
    goodPrompt.system = `Generate 3-5 examples of GOOD outputs for a gitagent named "${workspace.manifest.name}". Format as markdown with ## Example N headers.`;
    goodPrompt.user = `Agent: ${workspace.manifest.name}\nDomain: ${workspace.manifest.description}\n\nGenerate good-outputs.md.`;
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
    
    return { examples: { goodOutputs: good, badOutputs: bad } };
  }
};

export const ValidateOutHandler: GenerationStepHandler = {
  id: 'VALIDATE_OUT',
  async *handle({ workspace }) {
    const validationResult = validateWorkspace(workspace as any);
    return { validationResult };
  }
};

export const ALL_HANDLERS: GenerationStepHandler[] = [
  SanitizeInputsHandler,
  GenYamlHandler,
  GenSoulHandler,
  GenInstructionsHandler,
  GenConfigHandler,
  GenSkillsHandler,
  GenKnowledgeDocsHandler,
  GenToolsHandler,
  GenSubAgentsHandler,
  GenWorkflowsHandler,
  GenExamplesHandler,
  ValidateOutHandler,
];
