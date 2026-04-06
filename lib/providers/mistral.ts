import { createMistral } from '@ai-sdk/mistral';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';

export const mistralProvider: ModelProvider = {
  id: 'mistral',
  name: 'Mistral',
  supportsDirectBrowser: false,
  async generate(prompt, apiKey) {
    const mistral = createMistral({ apiKey });
    const { text, experimental_output } = await generateText({
      model: mistral('mistral-large-latest'),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output };
  },
  async *stream(prompt, apiKey) {
    const mistral = createMistral({ apiKey });
    const { textStream } = streamText({
      model: mistral('mistral-large-latest'),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
