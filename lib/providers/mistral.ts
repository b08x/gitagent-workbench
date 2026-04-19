import { createMistral } from '@ai-sdk/mistral';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';
import { z } from 'zod';

export const mistralProvider: ModelProvider = {
  id: 'mistral',
  name: 'Mistral',
  supportsDirectBrowser: false,
  async generate<T extends z.ZodTypeAny = any>(prompt: GenerationPrompt<T>, apiKey: string, modelId: string): Promise<GenerationResult<z.infer<T>>> {
    const mistral = createMistral({ apiKey });
    const { text, experimental_output } = await generateText({
      model: mistral(modelId),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output as z.infer<T> };
  },
  async *stream(prompt, apiKey, modelId) {
    const mistral = createMistral({ apiKey });
    const { textStream } = streamText({
      model: mistral(modelId),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
