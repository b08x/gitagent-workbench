import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';

export const googleProvider: ModelProvider = {
  id: 'google',
  name: 'Google Gemini',
  supportsDirectBrowser: false,
  async generate(prompt, apiKey, modelId) {
    const google = createGoogleGenerativeAI({ apiKey });
    const { text, experimental_output } = await generateText({
      model: google(modelId),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output };
  },
  async *stream(prompt, apiKey, modelId) {
    const google = createGoogleGenerativeAI({ apiKey });
    const { textStream } = streamText({
      model: google(modelId),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
