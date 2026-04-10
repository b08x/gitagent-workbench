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
};

export const CURATED_MODELS: Record<string, ModelOption[]> = {
  anthropic: [
    { id: 'claude-opus-4-5', name: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3', name: 'o3' },
    { id: 'o4-mini', name: 'o4 Mini' },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro Preview' },
    { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash Preview' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'codestral-latest', name: 'Codestral' },
  ],
  openrouter: [
    { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
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
    if (!apiKey) throw new Error('OpenRouter requires an API key to list models');
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
    const json = await res.json();
    return (json.data ?? []).map((m: { id: string; name: string }) => ({
      id: m.id,
      name: m.name,
      raw: m.id,
    }));
  }

  // Vercel AI Gateway — no auth needed, CORS-open
  const res = await fetch('https://ai-gateway.vercel.sh/v1/models');
  if (!res.ok) throw new Error(`Vercel AI Gateway fetch failed: ${res.status}`);
  const json = await res.json();

  const prefix = PROVIDER_PREFIXES[providerId];
  if (!prefix) throw new Error(`No gateway prefix for provider: ${providerId}`);

  return (json.data ?? [])
    .filter((m: { id: string; name: string }) => m.id.startsWith(prefix))
    .map((m: { id: string; name: string }) => ({
      id: m.id.slice(prefix.length),  // strip prefix for provider calls
      name: m.name,
      raw: m.id,
    }));
}
