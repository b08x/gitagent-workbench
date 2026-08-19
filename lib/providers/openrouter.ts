import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';
import { z } from 'zod';

export const openrouterProvider: ModelProvider = {
  id: 'openrouter',
  name: 'OpenRouter',
  supportsDirectBrowser: true,
  async generate<T extends z.ZodTypeAny = any>(prompt: GenerationPrompt<T>, apiKey: string, modelId: string): Promise<GenerationResult<z.infer<T>>> {
    const openrouter = createOpenRouter({ 
      apiKey,
      headers: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'GitAgent Workbench'
      }
    });
    const { text, experimental_output } = await generateText({
      model: openrouter(modelId) as any,
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output as z.infer<T> };
  },
  async *stream(prompt, apiKey, modelId) {
    const openrouter = createOpenRouter({ 
      apiKey,
      headers: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'GitAgent Workbench'
      }
    });
    const { textStream } = streamText({
      model: openrouter(modelId) as any,
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
