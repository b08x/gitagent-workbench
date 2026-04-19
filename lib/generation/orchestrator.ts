import { AgentWorkspace } from '../gitagent/types';
import { providers } from '../providers';
import { getTemplateInstructions } from './templates';
import { getApplicableSteps } from './steps';
import { sanitizePromptContent } from './sanitizer';
import { validateContextLength, truncateToLimit } from './token-counter';
import { saveWorkspaceSnapshot } from './persistence';
import { OrchestratorConfig, OrchestratorEvent } from './types';
import { ALL_HANDLERS } from './handlers/core-handlers';

export * from './types';
export * from './engine';

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

  const rawContext = scaffoldContext.length > 0 
    ? `\n\nAdditional Context from Uploaded Files:\n${scaffoldContext.map((f: any) => `File: ${f.name}\nContent: ${sanitizePromptContent(f.content || '[Media File]')}`).join('\n---\n')}`
    : '';

  // ENG-104: Active Context Window Truncation
  const defaultLimit = 100000; // Default conservative limit
  const hardLimit = config.contextLimit || defaultLimit;
  const truncationLimit = Math.floor(hardLimit * 0.8);
  
  const { tokens, exceeds } = validateContextLength(rawContext, truncationLimit);
  let contextPrompt = rawContext;

  if (exceeds) {
    contextPrompt = truncateToLimit(rawContext, truncationLimit);
    yield { 
      step: 'SANITIZE_INPUTS', 
      status: 'progress', 
      content: `Warning: Context size (${tokens} tokens) exceeds 80% of limit (${truncationLimit}). Truncating to stay within safe bounds.` 
    };
  }

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

    const handler = ALL_HANDLERS.find(h => h.id === step);
    if (!handler) {
      yield { step, status: 'skip', content: `No handler found for step: ${step}` };
      continue;
    }

    yield { step, status: 'start' };

    try {
      const iterator = handler.handle({
        workspace: ws,
        config,
        templatePrompt,
        contextPrompt
      });

      let next = await iterator.next();
      while (!next.done) {
        const value = next.value;
        if (value && typeof value === 'object' && 'status' in value) {
          yield value as OrchestratorEvent;
        }
        next = await iterator.next();
      }
      
      const patch = next.value;
      if (patch) {
        ws = { ...ws, ...patch } as AgentWorkspace;
        yield { step, status: 'done', workspace: ws };
      } else {
        yield { step, status: 'done' };
      }
    } catch (error: any) {
      yield { step, status: 'error', content: error.message };
      if (stepConfig.isCritical) {
        throw new Error(`Critical step "${stepConfig.label}" failed: ${error.message}`);
      }
    } finally {
      saveWorkspaceSnapshot(ws);
    }
  }

  ws = { ...ws, meta: { ...ws.meta, status: 'complete' } };
  yield { step: 'COMPLETE', status: 'done', workspace: ws };
}
