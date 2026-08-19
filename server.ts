import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateText, generateObject, streamText, APICallError, InvalidArgumentError, TypeValidationError, jsonSchema } from "ai";
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

  // In-memory key storage for this session (demo purposes as requested)
  // Maps providerId to key. Pre-fill from environment variables.
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

  function mapErrorToStatus(error: any): number {
    if (error instanceof InvalidArgumentError || error instanceof TypeValidationError) return 400;
    if (error instanceof APICallError) {
      if (error.statusCode === 429) return 429;
      if (error.statusCode === 401) return 401;
      if (error.statusCode === 403) return 403;
      return 502; // Bad Gateway for downstream LLM errors
    }
    return 500;
  }

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
      if (providerId === 'anthropic') {
        return res.json({ data: [] });
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
                liveModels.sort((a: any, b: any) => {
                  const getWeight = (id: string) => {
                    if (id.includes('3.7')) return 100;
                    if (id.includes('3.1-pro')) return 95;
                    if (id.includes('3.1-flash')) return 90;
                    if (id.includes('3.1')) return 85;
                    if (id.includes('flash-latest')) return 80;
                    if (id.includes('2.5')) return 70;
                    if (id.includes('2.0')) return 60;
                    if (id.includes('1.5')) return 40;
                    return 10;
                  };
                  return getWeight(b.id) - getWeight(a.id);
                });
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
            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (Advanced Reasoning)' },
            { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
            { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Experimental' },
            { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image' },
            { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash Lite Image' },
            { id: 'gemini-embedding-2-preview', name: 'Gemini Embedding 2' },
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

  // Decoding helper for WAF-evasive payloads
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
    return modelId;
  }

  function getProvider(providerId: string, apiKey: string) {
    switch (providerId) {
      case "openrouter": return createOpenRouter({ apiKey });
      case "anthropic": return createAnthropic({ apiKey });
      case "openai": return createOpenAI({ apiKey });
      case "google": return createGoogleGenerativeAI({ apiKey });
      case "mistral": return createMistral({ apiKey });
      case "groq": return createGroq({ apiKey });
      case "ollama": return createOllama({});
      default: throw new Error(`Unknown provider: ${providerId}`);
    }
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

    const executeGeneration = async (pid: string, mid: string, key: string) => {
      const normalizedMid = normalizeModelId(pid, mid);
      const provider = getProvider(pid, key);
      const model = provider(normalizedMid);

      const generateOptions: any = {
        model,
        system: prompt.system,
        ...options
      };

      if (prompt.messages && prompt.messages.length > 0) {
        generateOptions.messages = prompt.messages;
      } else if (prompt.user) {
        generateOptions.prompt = prompt.user;
      }

      if (prompt.schema) {
        const result = await generateObject({
          ...generateOptions,
          output: 'object',
          schema: jsonSchema(prompt.schema),
        });
        return { object: result.object };
      } else {
        const result = await generateText(generateOptions);
        return { text: result.text };
      }
    };

    try {
      if (!apiKey) {
        if (googleKey && providerId !== 'google') {
          console.warn(`No key for ${providerId}, falling back to google/gemini`);
          const fallbackRes = await executeGeneration('google', 'gemini-3.7-flash', googleKey);
          return res.json(fallbackRes);
        }
        return res.status(401).json({ 
          error: `API key for ${providerId} not configured. Please add an API key in Settings or switch to Gemini.` 
        });
      }

      const result = await executeGeneration(providerId, cleanModelId, apiKey);
      return res.json(result);
    } catch (primaryError: any) {
      console.warn(`Primary generation with ${providerId}/${cleanModelId} failed:`, primaryError.message);

      // Check if this error is a quota / key limit / auth error and we have a Google key fallback
      const isQuotaOrAuth = 
        primaryError.message?.toLowerCase().includes('limit') ||
        primaryError.message?.toLowerCase().includes('quota') ||
        primaryError.message?.toLowerCase().includes('unauthorized') ||
        primaryError.message?.toLowerCase().includes('forbidden') ||
        primaryError.message?.toLowerCase().includes('api key') ||
        primaryError.statusCode === 429 ||
        primaryError.statusCode === 401 ||
        primaryError.statusCode === 403;

      if (isQuotaOrAuth && googleKey && providerId !== 'google') {
        try {
          console.log(`Attempting fallback to Google Gemini (gemini-3.7-flash)...`);
          const fallbackRes = await executeGeneration('google', 'gemini-3.7-flash', googleKey);
          return res.json(fallbackRes);
        } catch (fallbackError: any) {
          console.error("Fallback to Google also failed:", fallbackError);
        }
      }

      const status = mapErrorToStatus(primaryError);
      let userFriendlyMessage = primaryError.message;
      if (primaryError.message?.includes('Key limit exceeded')) {
        userFriendlyMessage = `Key limit exceeded for ${providerId}. Please provide your own API key in Settings or switch to Gemini.`;
      }

      res.status(status).json({ 
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
      const provider = getProvider(providerId, apiKey);
      const model = provider(cleanModelId);

      const result = streamText({
        model,
        system: prompt.system,
        prompt: prompt.user,
        ...options
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of result.textStream) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Proxy Stream Error:", error);
      if (!res.headersSent) {
        const status = mapErrorToStatus(error);
        res.status(status).json({ error: error.message });
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

  // ENG-106: Global Error Handler
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

