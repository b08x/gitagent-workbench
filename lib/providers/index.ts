import { anthropicProvider } from './anthropic';
import { openaiProvider } from './openai';
import { googleProvider } from './google';
import { mistralProvider } from './mistral';
import { openrouterProvider } from './openrouter';
import { ModelProvider } from './types';

export const providers: Record<string, ModelProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  google: googleProvider,
  mistral: mistralProvider,
  openrouter: openrouterProvider,
};
