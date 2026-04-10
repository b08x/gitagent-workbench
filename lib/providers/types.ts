export interface GenerationPrompt {
  system: string;
  user: string;
  schema?: any;
}

export interface GenerationResult {
  text: string;
  object?: any;
}

export interface ModelProvider {
  id: string;
  name: string;
  supportsDirectBrowser: boolean;
  generate(prompt: GenerationPrompt, apiKey: string, modelId?: string): Promise<GenerationResult>;
  stream(prompt: GenerationPrompt, apiKey: string, modelId?: string): AsyncGenerator<string>;
}
