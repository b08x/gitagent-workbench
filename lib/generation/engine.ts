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
    
    if (modelSpec.includes('/')) {
      const parts = modelSpec.split('/');
      providerId = parts[0];
      modelId = parts.slice(1).join('/');
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId,
          providerId,
          options: {
            temperature: (config as any).temperature,
            maxTokens: (config as any).maxTokens,
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result as GenerationResult<z.infer<T>>;
    } catch (error: any) {
      lastError = error;
      console.warn(`Failed with ${providerId}/${modelId}:`, error.message);
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
    
    if (modelSpec.includes('/')) {
      const parts = modelSpec.split('/');
      providerId = parts[0];
      modelId = parts.slice(1).join('/');
    }

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId,
          providerId,
          options: {
            temperature: (config as any).temperature,
            maxTokens: (config as any).maxTokens,
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content === '[DONE]') return;
            try {
              const parsed = JSON.parse(content);
              if (parsed.chunk) yield parsed.chunk;
              if (parsed.error) throw new Error(parsed.error);
            } catch (e) {
              console.error('Failed to parse stream chunk:', e);
            }
          }
        }
      }
      return;
    } catch (error: any) {
      lastError = error;
      console.warn(`Streaming failed with ${providerId}/${modelId}:`, error.message);
    }
  }
  throw lastError;
}
