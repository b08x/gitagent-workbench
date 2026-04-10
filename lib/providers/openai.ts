import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';

export const openaiProvider: ModelProvider = {
  id: 'openai',
  name: 'OpenAI',
  supportsDirectBrowser: false,
  async generate(prompt, apiKey, modelId) {
    const openai = createOpenAI({ apiKey });
    const { text, experimental_output } = await generateText({
      model: openai(modelId || 'gpt-4o'),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output };
  },
  async *stream(prompt, apiKey, modelId) {
    const openai = createOpenAI({ apiKey });
    const { textStream } = streamText({
      model: openai(modelId || 'gpt-4o'),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
