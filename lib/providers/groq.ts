import { createGroq } from '@ai-sdk/groq';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';

export const groqProvider: ModelProvider = {
  id: 'groq',
  name: 'Groq',
  supportsDirectBrowser: false,
  async generate(prompt, apiKey, modelId) {
    const groq = createGroq({ apiKey });
    const { text, experimental_output } = await generateText({
      model: groq(modelId || 'llama-3.3-70b-versatile'),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output };
  },
  async *stream(prompt, apiKey, modelId) {
    const groq = createGroq({ apiKey });
    const { textStream } = streamText({
      model: groq(modelId || 'llama-3.3-70b-versatile'),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
