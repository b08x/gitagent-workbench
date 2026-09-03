import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { generateText, streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import dotenv from "dotenv";
import cors from "cors";
import { synthesizeAgentSpec } from "./lib/generation/agentSynthesizer";

dotenv.config();

function cleanErrorMessage(err: any): string {
  if (!err) return "Internal generation error";
  let msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  if (typeof msg === 'string' && msg.startsWith('{') && msg.endsWith('}')) {
    try {
      const p = JSON.parse(msg);
      if (p.error?.message) msg = p.error.message;
      else if (p.message) msg = p.message;
    } catch {}
  }
  if (typeof msg === 'string') {
    if (msg.includes('API_KEY_INVALID') || msg.toLowerCase().includes('api key not valid')) {
      return 'Invalid API key provided for the model provider. Please verify your API key in Settings or use the Built-in Engine.';
    }
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      return 'API rate limit or quota exceeded for this provider. Please try again in a moment or switch providers in Settings.';
    }
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
      return 'Authentication failed for model provider. Please check your API key in Settings.';
    }
  }
  return msg;
}

function sanitizeApiKey(key: any): string | null {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (
    trimmed === '' || 
    trimmed === '********' || 
    trimmed === 'undefined' || 
    trimmed === 'null' ||
    trimmed.startsWith('sk-...')
  ) {
    return null;
  }
  return trimmed;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logger
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Size: ${req.headers['content-length'] || 0} bytes`);
    }
    next();
  });

  // Maps providerId to env var names
  const PROVIDER_MAP: Record<string, string[]> = {
    'google': ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'AI_STUDIO_API_KEY', 'API_KEY', 'VITE_GEMINI_API_KEY', 'VITE_GOOGLE_API_KEY'],
    'openai': ['OPENAI_API_KEY', 'VITE_OPENAI_API_KEY'],
    'anthropic': ['ANTHROPIC_API_KEY', 'VITE_ANTHROPIC_API_KEY'],
    'mistral': ['MISTRAL_API_KEY', 'VITE_MISTRAL_API_KEY'],
    'groq': ['GROQ_API_KEY', 'VITE_GROQ_API_KEY'],
    'openrouter': ['OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY'],
    'ollama': ['OLLAMA_BASE_URL']
  };

  const serverKeys: Record<string, string> = {};
  const envKeys: Set<string> = new Set();
  
  function refreshEnvKeys() {
    Object.entries(PROVIDER_MAP).forEach(([pid, envNames]) => {
      for (const envName of envNames) {
        const val = process.env[envName];
        if (val && val.trim() !== '') {
          serverKeys[pid] = val.trim();
          envKeys.add(pid);
          break;
        }
      }
    });
  }

  // Initialize from env
  refreshEnvKeys();

  app.get("/api/health", (req, res) => {
    refreshEnvKeys();
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(), 
      keysPresent: Object.keys(serverKeys),
      envKeys: Array.from(envKeys)
    });
  });

  app.get("/api/providers", (req, res) => {
    refreshEnvKeys();
    const status = Object.keys(PROVIDER_MAP).reduce((acc, pid) => {
      acc[pid] = {
        hasKey: !!serverKeys[pid],
        isEnv: envKeys.has(pid)
      };
      return acc;
    }, {} as Record<string, { hasKey: boolean; isEnv: boolean }>);
    res.json(status);
  });

  // Key testing endpoint to proactively validate user keys
  app.post("/api/test-key", async (req, res) => {
    const { providerId, apiKey: rawKey } = req.body;
    const apiKey = sanitizeApiKey(rawKey) || serverKeys[providerId];

    if (!apiKey) {
      return res.status(400).json({ ok: false, error: "No API key provided to test." });
    }

    try {
      if (providerId === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          config: { maxOutputTokens: 5 }
        });
        if (response) return res.json({ ok: true });
      }

      if (providerId === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (response.ok) return res.json({ ok: true });
        const err = await response.text();
        return res.status(400).json({ ok: false, error: cleanErrorMessage(err) });
      }

      if (providerId === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (response.ok) return res.json({ ok: true });
        const err = await response.text();
        return res.status(400).json({ ok: false, error: cleanErrorMessage(err) });
      }

      if (providerId === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (response.ok) return res.json({ ok: true });
        const err = await response.text();
        return res.status(400).json({ ok: false, error: cleanErrorMessage(err) });
      }

      if (providerId === 'mistral') {
        const response = await fetch('https://api.mistral.ai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (response.ok) return res.json({ ok: true });
        const err = await response.text();
        return res.status(400).json({ ok: false, error: cleanErrorMessage(err) });
      }

      // Default ok for other providers
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(400).json({ ok: false, error: cleanErrorMessage(err) });
    }
  });

  app.get("/api/models/:providerId", async (req, res) => {
    refreshEnvKeys();
    const { providerId } = req.params;
    const apiKey = serverKeys[providerId];

    if (!apiKey) {
      return res.status(401).json({ error: "No API key found for this provider on server." });
    }

    try {
      if (providerId === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const json = await response.json();
        return res.json(json);
      }
      if (providerId === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const json = await response.json();
        return res.json(json);
      }
      if (providerId === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const json = await response.json();
        return res.json(json);
      }
      if (providerId === 'mistral') {
        const response = await fetch('https://api.mistral.ai/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const json = await response.json();
        return res.json(json);
      }
      if (providerId === 'google') {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (response.ok) {
            const json = await response.json();
            if (Array.isArray(json.models)) {
              const liveModels = json.models
                .filter((m: any) => {
                  const id = m.name ? m.name.replace(/^models\//, '') : '';
                  const methods = m.supportedGenerationMethods || [];
                  return methods.includes('generateContent') && !id.includes('deprecated');
                })
                .map((m: any) => {
                  const id = m.name.replace(/^models\//, '');
                  return {
                    id,
                    name: m.displayName ? `${m.displayName}` : id
                  };
                });
              
              if (liveModels.length > 0) {
                return res.json({ data: liveModels });
              }
            }
          }
        } catch (err) {
          console.warn("Failed to fetch live Google models:", err);
        }

        return res.json({ 
          data: [
            { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (Recommended)' },
            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
            { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
          ]
        });
      }
      
      res.status(404).json({ error: "Model fetch only supported for select providers via proxy." });
    } catch (e: any) {
      res.status(500).json({ error: cleanErrorMessage(e) });
    }
  });

  app.post("/api/keys", (req, res) => {
    try {
      const { providerId, key } = req.body;
      if (providerId && typeof key === 'string') {
        const cleaned = sanitizeApiKey(key);
        if (key === '********') {
          return res.json({ success: true, ignored: true });
        }
        if (!cleaned) {
          delete serverKeys[providerId];
          envKeys.delete(providerId);
        } else {
          serverKeys[providerId] = cleaned;
        }
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Missing providerId or key" });
      }
    } catch (err: any) {
      res.status(400).json({ error: "Invalid JSON body" });
    }
  });

  const decodePrompt = (prompt: any) => {
    if (typeof prompt === 'string' && (prompt.startsWith('base64:') || /^[A-Za-z0-9+/]*={0,2}$/.test(prompt))) {
      try {
        const clean = prompt.startsWith('base64:') ? prompt.slice(7) : prompt;
        return JSON.parse(Buffer.from(clean, 'base64').toString('utf-8'));
      } catch (e) {
        return prompt;
      }
    }
    return prompt;
  };

  function normalizeModelId(providerId: string, modelId: string): string {
    if (!modelId) {
      if (providerId === 'google') return 'gemini-3.7-flash';
      if (providerId === 'openai') return 'gpt-4o-mini';
      if (providerId === 'anthropic') return 'claude-3-5-haiku-20241022';
      if (providerId === 'groq') return 'llama-3.3-70b-versatile';
      if (providerId === 'mistral') return 'mistral-small-latest';
      if (providerId === 'ollama') return 'llama3.2';
      return 'openai/gpt-4o-mini';
    }
    if (providerId === 'google' && modelId.startsWith('google/')) {
      return modelId.slice(7);
    }
    if (providerId === 'openai' && modelId.startsWith('openai/')) {
      return modelId.slice(7);
    }
    if (providerId === 'anthropic' && modelId.startsWith('anthropic/')) {
      return modelId.slice(10);
    }
    if (providerId === 'groq' && modelId.startsWith('groq/')) {
      return modelId.slice(5);
    }
    if (providerId === 'mistral' && modelId.startsWith('mistral/')) {
      return modelId.slice(8);
    }
    if (providerId === 'openrouter' && modelId.startsWith('openrouter/')) {
      return modelId.slice(11);
    }
    return modelId;
  }

  function extractUserPromptText(prompt: any): string {
    if (!prompt) return '';
    if (typeof prompt === 'string') return prompt;
    if (prompt.user) {
      return typeof prompt.user === 'string' ? prompt.user : JSON.stringify(prompt.user);
    }
    if (Array.isArray(prompt.messages)) {
      for (let i = prompt.messages.length - 1; i >= 0; i--) {
        const m = prompt.messages[i];
        if (m.role === 'user') {
          if (typeof m.content === 'string') return m.content;
          if (Array.isArray(m.content)) {
            return m.content.map((c: any) => typeof c === 'string' ? c : (c.text || '')).join(' ');
          }
        }
      }
    }
    return '';
  }

  // Direct generation using Google Gen AI SDK
  async function generateWithGoogle(modelId: string, apiKey: string, prompt: any, options: any) {
    const ai = new GoogleGenAI({ apiKey });
    let contents: any = [];

    if (prompt.messages && Array.isArray(prompt.messages) && prompt.messages.length > 0) {
      contents = prompt.messages.map((m: any) => {
        let text = '';
        if (typeof m.content === 'string') {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = m.content.map((c: any) => (typeof c === 'string' ? c : (c.text || JSON.stringify(c)))).join('\n');
        } else {
          text = JSON.stringify(m.content);
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text }]
        };
      });
    } else if (prompt.user) {
      contents = [{ role: 'user', parts: [{ text: typeof prompt.user === 'string' ? prompt.user : JSON.stringify(prompt.user) }] }];
    } else if (typeof prompt === 'string') {
      contents = [{ role: 'user', parts: [{ text: prompt }] }];
    }

    const config: any = {};
    if (prompt.system) {
      config.systemInstruction = prompt.system;
    }
    if (options?.temperature !== undefined) {
      config.temperature = options.temperature;
    }
    if (options?.maxTokens) {
      config.maxOutputTokens = options.maxTokens;
    }
    if (options?.topP !== undefined) {
      config.topP = options.topP;
    }
    if (options?.topK !== undefined) {
      config.topK = options.topK;
    }

    if (prompt.schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = prompt.schema;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config
    });

    const text = response.text || '';
    if (prompt.schema) {
      try {
        const object = JSON.parse(text);
        return { object };
      } catch {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
        if (match) {
          const object = JSON.parse(match[1] || match[0]);
          return { object };
        }
      }
    }

    return { text };
  }

  // Direct OpenAI-compatible generation
  async function generateWithOpenAICompatible(baseUrl: string, modelId: string, apiKey: string, prompt: any, options: any, extraHeaders: Record<string, string> = {}) {
    const messages: any[] = [];

    if (prompt.system) {
      messages.push({ role: "system", content: prompt.system });
    }

    if (prompt.messages && Array.isArray(prompt.messages)) {
      messages.push(...prompt.messages.map((m: any) => {
        let content = m.content;
        if (Array.isArray(content)) {
          content = content.map((c: any) => typeof c === 'string' ? c : (c.text || JSON.stringify(c))).join('\n');
        }
        return { role: m.role, content };
      }));
    } else if (prompt.user) {
      messages.push({ role: "user", content: typeof prompt.user === 'string' ? prompt.user : JSON.stringify(prompt.user) });
    }

    const body: any = {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || undefined,
      top_p: options?.topP ?? 1,
    };

    if (prompt.schema) {
      body.response_format = { type: "json_object" };
      if (!prompt.system?.includes('JSON')) {
        messages.unshift({
          role: "system",
          content: `You must respond with valid JSON matching schema: ${JSON.stringify(prompt.schema)}`
        });
      }
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || "";

    if (prompt.schema) {
      try {
        const object = JSON.parse(text);
        return { object };
      } catch {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
        if (match) {
          const object = JSON.parse(match[1] || match[0]);
          return { object };
        }
      }
    }

    return { text };
  }

  async function executeUniversalGeneration(pid: string, mid: string, key: string, prompt: any, options: any) {
    const cleanMid = normalizeModelId(pid, mid);

    if (pid === 'google') {
      return await generateWithGoogle(cleanMid, key, prompt, options);
    }

    if (pid === 'openrouter') {
      return await generateWithOpenAICompatible(
        'https://openrouter.ai/api/v1',
        cleanMid,
        key,
        prompt,
        options,
        {
          'HTTP-Referer': 'https://gitagent.dev',
          'X-Title': 'GitAgent Workbench'
        }
      );
    }

    if (pid === 'openai') {
      return await generateWithOpenAICompatible('https://api.openai.com/v1', cleanMid, key, prompt, options);
    }

    if (pid === 'groq') {
      return await generateWithOpenAICompatible('https://api.groq.com/openai/v1', cleanMid, key, prompt, options);
    }

    if (pid === 'mistral') {
      return await generateWithOpenAICompatible('https://api.mistral.ai/v1', cleanMid, key, prompt, options);
    }

    if (pid === 'ollama') {
      const baseUrl = key || 'http://localhost:11434/v1';
      return await generateWithOpenAICompatible(baseUrl, cleanMid, 'ollama', prompt, options);
    }

    if (pid === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: key });
      const model = anthropic(cleanMid) as any;
      const res = await generateText({
        model,
        system: prompt.system,
        prompt: prompt.user || (prompt.messages?.[0]?.content ?? ''),
        ...options
      });
      return { text: res.text };
    }

    throw new Error(`Unsupported provider: ${pid}`);
  }

  app.post("/api/compute/v1", async (req, res) => {
    refreshEnvKeys();
    let { prompt, modelId, providerId, options, apiKey: rawClientKey } = req.body;
    
    // Handle evasive encoding
    prompt = decodePrompt(prompt);
    providerId = providerId || 'google';

    const cleanModelId = normalizeModelId(providerId, modelId);
    const clientKey = sanitizeApiKey(rawClientKey);
    let apiKey = clientKey || serverKeys[providerId];
    
    const googleKey = serverKeys['google'];

    // Try primary generation
    try {
      if (apiKey) {
        const result = await executeUniversalGeneration(providerId, cleanModelId, apiKey, prompt, options);
        return res.json(result);
      }
    } catch (primaryError: any) {
      console.warn(`Primary generation with ${providerId}/${cleanModelId} failed:`, primaryError.message);

      // If client key was bad, but server has a serverKey for this provider, try serverKey
      if (clientKey && serverKeys[providerId] && clientKey !== serverKeys[providerId]) {
        try {
          console.log(`Retrying with server environment key for ${providerId}...`);
          const serverRes = await executeUniversalGeneration(providerId, cleanModelId, serverKeys[providerId], prompt, options);
          return res.json(serverRes);
        } catch (serverErr) {
          console.warn(`Server key for ${providerId} also failed`);
        }
      }

      // If provider was not google and we have a working google key, try fallback to google
      if (googleKey && providerId !== 'google') {
        try {
          console.log(`Attempting fallback to Google Gemini (gemini-3.7-flash)...`);
          const fallbackRes = await executeUniversalGeneration('google', 'gemini-3.7-flash', googleKey, prompt, options);
          return res.json(fallbackRes);
        } catch (fallbackError: any) {
          console.error("Fallback to Google also failed:", fallbackError);
        }
      }
    }

    // If we reach here, external LLM calls failed or no keys are configured.
    // Check if the request is an Agent Architect manifest synthesis request
    const isArchitectRequest = prompt && (prompt.schema?.properties?.manifest || prompt.schema?.manifest || (typeof prompt.system === 'string' && prompt.system.includes('AI Architect')));

    if (isArchitectRequest) {
      const userText = extractUserPromptText(prompt);
      const targetFramework = (req.body?.targetFramework || options?.targetFramework || prompt?.targetFramework || prompt?.options?.targetFramework || 'hermes_agent') as any;
      console.log(`Synthesizing agent specification with built-in architecture engine for target harness "${targetFramework}"...`);
      const synth = synthesizeAgentSpec(userText || 'Autonomous Specialist Agent', '', targetFramework);
      return res.json({ object: synth });
    }

    // Return friendly error with recovery hints
    return res.status(400).json({ 
      error: `API key for ${providerId} is invalid or not configured. Please enter a valid API key in Settings or use the Built-in Engine.`,
      needsApiKey: true,
      providerId
    });
  });

  app.post("/api/stream", async (req, res) => {
    refreshEnvKeys();
    let { prompt, modelId, providerId, options, apiKey: rawClientKey } = req.body;
    providerId = providerId || 'google';
    const cleanModelId = normalizeModelId(providerId, modelId);
    const clientKey = sanitizeApiKey(rawClientKey);
    let apiKey = clientKey || serverKeys[providerId];
    const googleKey = serverKeys['google'];

    if (!apiKey && googleKey) {
      providerId = 'google';
      apiKey = googleKey;
    }

    if (!apiKey) {
      return res.status(400).json({ 
        error: `API key for ${providerId} not found. Please provide a valid key in Settings.` 
      });
    }

    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (providerId === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        const responseStream = await ai.models.generateContentStream({
          model: cleanModelId,
          contents: prompt.user || prompt.messages,
          config: {
            systemInstruction: prompt.system,
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
            topP: options?.topP,
            topK: options?.topK,
          }
        });

        for await (const chunk of responseStream) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
          }
        }
      } else {
        const result = await executeUniversalGeneration(providerId, cleanModelId, apiKey, prompt, options);
        if (result.text) {
          res.write(`data: ${JSON.stringify({ chunk: result.text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Proxy Stream Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: cleanErrorMessage(error) });
      } else {
        res.write(`data: ${JSON.stringify({ error: cleanErrorMessage(error) })}\n\n`);
        res.end();
      }
    }
  });

  // Final catch-all for missing API routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Server Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal Server Error", 
        message: cleanErrorMessage(err)
      });
    } else {
      next(err);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
