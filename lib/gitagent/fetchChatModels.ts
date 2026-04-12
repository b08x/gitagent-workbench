export interface ModelOption {
  id: string;
  name: string;
  raw?: string;
}

const PROVIDER_PREFIXES: Record<string, string> = {
  anthropic: 'anthropic/',
  openai: 'openai/',
  google: 'google/',
  mistral: 'mistral/',
  groq: 'groq/',
};

export const CURATED_MODELS: Record<string, ModelOption[]> = {
  anthropic: [
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3-mini', name: 'o3-mini' },
  ],
  google: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'codestral-latest', name: 'Codestral' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  ],
  ollama: [
    { id: 'llama3.2', name: 'Llama 3.2' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'CodeLlama' },
  ],
  openrouter: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
  ],
};

/**
 * Fetches the latest available models for a provider.
 * Throws on failure — caller catches and falls back to CURATED_MODELS.
 */
export async function fetchChatModels(
  providerId: string,
  apiKey?: string
): Promise<ModelOption[]> {
  if (providerId === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
    const json = await res.json();
    
    // Filter for models that likely support tools and structured output
    // OpenRouter doesn't always have explicit capability flags in the list endpoint,
    // but we can filter by popular high-capability models or just return all and let user choose.
    return (json.data ?? [])
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        raw: m.id,
      }));
  }

  if (providerId === 'ollama') {
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      if (!res.ok) throw new Error('Ollama not running or unreachable');
      const json = await res.json();
      return (json.models ?? []).map((m: any) => ({
        id: m.name,
        name: m.name,
        raw: m.name
      }));
    } catch (e) {
      return CURATED_MODELS.ollama;
    }
  }

  if (providerId === 'groq' && apiKey) {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const json = await res.json();
      return (json.data ?? []).map((m: any) => ({
        id: m.id,
        name: m.id,
        raw: m.id
      }));
    }
  }

  if (providerId === 'mistral' && apiKey) {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const json = await res.json();
      return (json.data ?? []).map((m: any) => ({
        id: m.id,
        name: m.id,
        raw: m.id
      }));
    }
  }

  // Vercel AI Gateway — no auth needed, CORS-open
  try {
    const res = await fetch('https://ai-gateway.vercel.sh/v1/models');
    if (!res.ok) throw new Error(`Vercel AI Gateway fetch failed: ${res.status}`);
    const json = await res.json();

    const prefix = PROVIDER_PREFIXES[providerId];
    if (!prefix) return CURATED_MODELS[providerId] || [];

    return (json.data ?? [])
      .filter((m: { id: string; name: string }) => m.id.startsWith(prefix))
      .map((m: { id: string; name: string }) => ({
        id: m.id.slice(prefix.length),  // strip prefix for provider calls
        name: m.name,
        raw: m.id,
      }));
  } catch (e) {
    return CURATED_MODELS[providerId] || [];
  }
}
