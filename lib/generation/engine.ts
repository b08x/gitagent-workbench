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
    
    // Only split if NOT openrouter, as openrouter IDs naturally contain slashes
    if (providerId !== 'openrouter' && modelSpec.includes('/')) {
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
          } else {
            const text = await response.text();
            if (text.includes('<title>')) {
              const titleMatch = text.match(/<title>(.*?)<\/title>/);
              if (titleMatch) errorMessage = `Server Error: ${titleMatch[1]}`;
            } else if (text.length > 0) {
              errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
            }
          }
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but received ${contentType || 'unknown'}. Body starts with: ${text.slice(0, 50)}`);
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
    
    // Only split if NOT openrouter
    if (providerId !== 'openrouter' && modelSpec.includes('/')) {
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            errorMessage = errData.error || errorMessage;
          } else {
            const text = await response.text();
            if (text.includes('<title>')) {
              const titleMatch = text.match(/<title>(.*?)<\/title>/);
              if (titleMatch) errorMessage = `Server Error: ${titleMatch[1]}`;
            } else if (text.length > 0) {
              errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
            }
          }
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
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
