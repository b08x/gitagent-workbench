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
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'o3-mini', name: 'o3-mini' },
    { id: 'o1', name: 'o1' },
  ],
  google: [
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recommended)' },
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (Advanced Reasoning)' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image' },
    { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash Lite Image' },
    { id: 'gemini-embedding-2-preview', name: 'Gemini Embedding 2' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large' },
    { id: 'mistral-small-latest', name: 'Mistral Small' },
    { id: 'codestral-latest', name: 'Codestral' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile - Recommended)' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Instant)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B' },
    { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B' },
  ],
  ollama: [
    { id: 'llama3.2', name: 'Llama 3.2' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'CodeLlama' },
  ],
  openrouter: [
    { id: 'google/gemini-3.8-flash', name: 'Google Gemini 3.8 Flash' },
    { id: 'google/gemini-3.7-flash', name: 'Google Gemini 3.7 Flash' },
    { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet' },
    { id: 'anthropic/claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  ],
};

/**
 * Filters Groq models to only safe, general-purpose chat completion models.
 * Excludes prompt-guard, specialized audio/transcription, and non-chat models.
 */
export function filterGroqChatModels(models: Array<{ id: string; name?: string }>): ModelOption[] {
  const disallowedKeywords = [
    'orpheus', 'prompt-guard', 'guard', 'whisper', 'audio', 'tts', 'transcribe',
    'embed', 'moderation', 'rerank', 'distil-whisper'
  ];

  const valid = models.filter(m => {
    const id = m.id.toLowerCase();
    return !disallowedKeywords.some(keyword => id.includes(keyword));
  });

  const priorityOrder = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.1-8b-instruct',
    'mixtral-8x7b-32768',
    'deepseek-r1-distill-llama-70b',
    'qwen-2.5-32b',
  ];

  valid.sort((a, b) => {
    const aIdx = priorityOrder.findIndex(p => a.id.toLowerCase().includes(p.toLowerCase()));
    const bIdx = priorityOrder.findIndex(p => b.id.toLowerCase().includes(p.toLowerCase()));
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.id.localeCompare(b.id);
  });

  return valid.map(m => ({
    id: m.id,
    name: m.name || m.id,
    raw: m.id
  }));
}

/**
 * Fetches the latest available models for a provider.
 * Throws on failure — caller catches and falls back to CURATED_MODELS.
 */
export async function fetchChatModels(
  providerId: string,
  apiKey?: string
): Promise<ModelOption[]> {
  // Deduplicate by ID before returning
  const results = await (async () => {
    // Try server-side proxy if no local API key, masked key, or for google/openai/groq
    if (!apiKey || apiKey === '********' || providerId === 'openai' || providerId === 'google' || providerId === 'groq') {
      try {
        const res = await fetch(`/api/models/${providerId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            const mapped = json.data.map((m: any) => ({
              id: m.id,
              name: m.name || m.id,
              raw: m.id
            }));
            return providerId === 'groq' ? filterGroqChatModels(mapped) : mapped;
          }
        }
      } catch (e) {
        console.warn(`Server-side model fetch failed for ${providerId}, falling back to client or curated.`);
      }
    }

    if (providerId === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error(`OpenRouter models fetch failed: ${res.status}`);
      const json = await res.json();
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
        const mapped = (json.data ?? []).map((m: any) => ({
          id: m.id,
          name: m.id,
          raw: m.id
        }));
        const filtered = filterGroqChatModels(mapped);
        return filtered.length > 0 ? filtered : CURATED_MODELS.groq;
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
  })();

  const seen = new Set<string>();
  return results.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}
