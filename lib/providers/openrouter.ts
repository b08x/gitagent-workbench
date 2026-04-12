import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText, Output } from 'ai';
import { ModelProvider, GenerationPrompt, GenerationResult } from './types';

export const openrouterProvider: ModelProvider = {
  id: 'openrouter',
  name: 'OpenRouter',
  supportsDirectBrowser: true,
  async generate(prompt, apiKey, modelId) {
    const openrouter = createOpenRouter({ 
      apiKey,
      headers: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'GitAgent Workbench'
      }
    });
    const { text, experimental_output } = await generateText({
      model: openrouter(modelId || 'anthropic/claude-3-5-sonnet-20240620'),
      system: prompt.system,
      prompt: prompt.user,
      experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
    });
    return { text, object: experimental_output };
  },
  async *stream(prompt, apiKey, modelId) {
    const openrouter = createOpenRouter({ 
      apiKey,
      headers: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'GitAgent Workbench'
      }
    });
    const { textStream } = streamText({
      model: openrouter(modelId || 'anthropic/claude-3-5-sonnet-20240620'),
      system: prompt.system,
      prompt: prompt.user,
    });
    for await (const chunk of textStream) {
      yield chunk;
    }
  }
};
