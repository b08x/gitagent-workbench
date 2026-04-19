import { providers } from '../providers';
import { retryWithBackoff } from '../utils/retry';
import { GenerationPrompt, GenerationResult } from '../providers/types';
import { OrchestratorConfig } from './types';
import { z } from 'zod';

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
