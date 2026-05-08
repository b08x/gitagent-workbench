import { createOllama } from 'ollama-ai-provider';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';
import { z } from 'zod';

export const ollamaProvider: ModelProvider = {
  id: 'ollama',
  name: 'Ollama',
  supportsDirectBrowser: true, // Localhost usually doesn't have CORS issues if configured
  async generate<T extends z.ZodTypeAny = any>(prompt: GenerationPrompt<T>, _apiKey: string, modelId: string): Promise<GenerationResult<z.infer<T>>> {
    const ollama = createOllama();
    const { text, experimental_output } = await generateText({
      model: ollama(modelId) as any,
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output as z.infer<T> };
  },
  async *stream(prompt, _apiKey, modelId) {
    const ollama = createOllama();
    const { textStream } = streamText({
      model: ollama(modelId) as any,
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
