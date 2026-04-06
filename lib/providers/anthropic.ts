import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';

export const anthropicProvider: ModelProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  supportsDirectBrowser: false,
  async generate(prompt, apiKey, modelId) {
    const anthropic = createAnthropic({ apiKey });
    const { text, experimental_output } = await generateText({
      model: anthropic(modelId || 'claude-3-5-sonnet-20240620'),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output };
  },
  async *stream(prompt, apiKey, modelId) {
    const anthropic = createAnthropic({ apiKey });
    const { textStream } = streamText({
      model: anthropic(modelId || 'claude-3-5-sonnet-20240620'),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
