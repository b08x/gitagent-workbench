import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';
import { z } from 'zod';

export const openaiProvider: ModelProvider = {
  id: 'openai',
  name: 'OpenAI',
  supportsDirectBrowser: false,
  async generate<T extends z.ZodTypeAny = any>(prompt: GenerationPrompt<T>, apiKey: string, modelId: string): Promise<GenerationResult<z.infer<T>>> {
    const openai = createOpenAI({ apiKey });
    const { text, experimental_output } = await generateText({
      model: openai(modelId),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output as z.infer<T> };
  },
  async *stream(prompt, apiKey, modelId) {
    const openai = createOpenAI({ apiKey });
    const { textStream } = streamText({
      model: openai(modelId),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
