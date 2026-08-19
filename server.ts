import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { generateText, generateObject, streamText, jsonSchema } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Size: ${req.headers['content-length'] || 0} bytes`);
    next();
  });

  // Maps providerId to env var names
  const PROVIDER_MAP: Record<string, string> = {
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY',
    'google': 'GEMINI_API_KEY',
    'mistral': 'MISTRAL_API_KEY',
    'groq': 'GROQ_API_KEY',
    'openrouter': 'OPENROUTER_API_KEY',
    'ollama': 'OLLAMA_BASE_URL'
  };

  const serverKeys: Record<string, string> = {};
  const envKeys: Set<string> = new Set();
  
  function refreshEnvKeys() {
    Object.entries(PROVIDER_MAP).forEach(([pid, envName]) => {
      if (process.env[envName]) {
        serverKeys[pid] = process.env[envName]!;
        envKeys.add(pid);
      }
      if (pid === 'google' && !serverKeys[pid] && process.env['GOOGLE_API_KEY']) {
        serverKeys[pid] = process.env['GOOGLE_API_KEY']!;
        envKeys.add(pid);
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
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/keys", (req, res) => {
    try {
      const { providerId, key } = req.body;
      if (providerId && typeof key === 'string') {
        if (key === '********') {
          return res.json({ success: true, ignored: true });
        }
        if (key === '') {
          delete serverKeys[providerId];
          envKeys.delete(providerId);
        } else {
          serverKeys[providerId] = key;
        }
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Missing providerId or key" });
      }
    } catch (err: any) {
      res.status(400).json({ error: "Invalid JSON body" });
    }
  });

  // Decoding helper for base64 / escaped prompt payloads
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

  // Direct generation using Google Gen AI SDK
  async function generateWithGoogle(modelId: string, apiKey: string, prompt: any, options: any) {
    const ai = new GoogleGenAI({ apiKey });
    let contents: any = [];

    if (prompt.messages && Array.isArray(prompt.messages) && prompt.messages.length > 0) {
      contents = prompt.messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
      }));
    } else if (prompt.user) {
      contents = [{ role: 'user', parts: [{ text: prompt.user }] }];
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
        // Fallback cleanup if model wrapped in markdown
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
        if (match) {
          const object = JSON.parse(match[1] || match[0]);
          return { object };
        }
      }
    }

    return { text };
  }

  // Direct OpenAI-compatible generation (OpenRouter, OpenAI, Groq, Mistral)
  async function generateWithOpenAICompatible(baseUrl: string, modelId: string, apiKey: string, prompt: any, options: any, extraHeaders: Record<string, string> = {}) {
    const messages: any[] = [];

    if (prompt.system) {
      messages.push({ role: "system", content: prompt.system });
    }

    if (prompt.messages && Array.isArray(prompt.messages)) {
      messages.push(...prompt.messages);
    } else if (prompt.user) {
      messages.push({ role: "user", content: prompt.user });
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
      // Include schema instruction in system prompt if not present
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

  // Universal generation dispatcher that handles all providers smoothly
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
      const model = anthropic(cleanMid);
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
    let { prompt, modelId, providerId, options } = req.body;
    
    // Handle evasive encoding
    prompt = decodePrompt(prompt);
    providerId = providerId || 'google';

    const cleanModelId = normalizeModelId(providerId, modelId);
    let apiKey = serverKeys[providerId];
    
    // If chosen provider has no key or is invalid, check if we have a working google key
    const googleKey = serverKeys['google'] || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    try {
      if (!apiKey) {
        if (googleKey && providerId !== 'google') {
          console.warn(`No key for ${providerId}, falling back to google/gemini-3.7-flash`);
          const fallbackRes = await executeUniversalGeneration('google', 'gemini-3.7-flash', googleKey, prompt, options);
          return res.json(fallbackRes);
        }
        return res.status(401).json({ 
          error: `API key for ${providerId} not configured. Please add an API key in Settings or switch to Gemini.` 
        });
      }

      const result = await executeUniversalGeneration(providerId, cleanModelId, apiKey, prompt, options);
      return res.json(result);
    } catch (primaryError: any) {
      console.warn(`Primary generation with ${providerId}/${cleanModelId} failed:`, primaryError.message);

      // Check if this error can fallback to Google Gemini
      const isRecoverable = 
        primaryError.message?.toLowerCase().includes('limit') ||
        primaryError.message?.toLowerCase().includes('quota') ||
        primaryError.message?.toLowerCase().includes('unauthorized') ||
        primaryError.message?.toLowerCase().includes('forbidden') ||
        primaryError.message?.toLowerCase().includes('api key') ||
        primaryError.message?.toLowerCase().includes('specification version') ||
        primaryError.statusCode === 429 ||
        primaryError.statusCode === 401 ||
        primaryError.statusCode === 403;

      if (isRecoverable && googleKey && providerId !== 'google') {
        try {
          console.log(`Attempting fallback to Google Gemini (gemini-3.7-flash)...`);
          const fallbackRes = await executeUniversalGeneration('google', 'gemini-3.7-flash', googleKey, prompt, options);
          return res.json(fallbackRes);
        } catch (fallbackError: any) {
          console.error("Fallback to Google also failed:", fallbackError);
        }
      }

      let userFriendlyMessage = primaryError.message || "Model generation failed";
      if (userFriendlyMessage.includes('Key limit exceeded')) {
        userFriendlyMessage = `Key limit exceeded for ${providerId}. Please provide your own API key in Settings or switch to Gemini.`;
      }

      res.status(500).json({ 
        error: userFriendlyMessage,
        details: primaryError.details || undefined
      });
    }
  });

  app.post("/api/stream", async (req, res) => {
    refreshEnvKeys();
    let { prompt, modelId, providerId, options } = req.body;
    providerId = providerId || 'google';
    const cleanModelId = normalizeModelId(providerId, modelId);
    let apiKey = serverKeys[providerId];
    const googleKey = serverKeys['google'] || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey && googleKey) {
      providerId = 'google';
      apiKey = googleKey;
    }

    if (!apiKey) {
      return res.status(401).json({ error: `API key for ${providerId} not found on server.` });
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
        // Use universal generation for other endpoints
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
        res.status(500).json({ error: error.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
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
        message: err.message
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
