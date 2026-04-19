import { z } from 'zod';

export interface GenerationPrompt<T extends z.ZodTypeAny = any> {
  system: string;
  user: string;
  schema?: T;
}

export interface GenerationResult<T = any> {
  text: string;
  object?: T;
}

export interface ModelProvider {
  id: string;
  name: string;
  supportsDirectBrowser: boolean;
  generate<T extends z.ZodTypeAny = any>(
    prompt: GenerationPrompt<T>, 
    apiKey: string, 
    modelId: string
  ): Promise<GenerationResult<z.infer<T>>>;
  stream(prompt: GenerationPrompt, apiKey: string, modelId: string): AsyncGenerator<string>;
}
