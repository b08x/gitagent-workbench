import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateText, streamText, Output, APICallError, InvalidArgumentError, TypeValidationError } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory key storage for this session (demo purposes as requested)
  // Maps providerId to key. Pre-fill from environment variables.
  const PROVIDER_MAP: Record<string, string> = {
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY',
    'google': 'GOOGLE_API_KEY',
    'mistral': 'MISTRAL_API_KEY',
    'groq': 'GROQ_API_KEY',
    'openrouter': 'OPENROUTER_API_KEY',
  };

  const serverKeys: Record<string, string> = {};

  // ENG-105: Explicit Allowed Models List to prevent Arbitrary Model Invocation
  const ALLOWED_MODELS = new Set([
    // Anthropic
    "claude-3-5-sonnet-20240620", "claude-3-5-haiku-20241022", "claude-3-opus-20240229",
    // OpenAI
    "gpt-4o", "gpt-4o-mini", "o3-mini",
    // Google
    "gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash",
    // Mistral
    "mistral-large-latest", "mistral-small-latest", "codestral-latest",
    // Groq
    "llama-3.3-70b-versatile", "mixtral-8x7b-32768",
    // Ollama (Allow standard ones)
    "llama3.2", "mistral", "codellama",
    // OpenRouter (Includes provider prefixes)
    "anthropic/claude-3-5-sonnet-20240620", "openai/gpt-4o", "google/gemini-2.0-flash-exp"
  ]);

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
  
  // Initialize from env
  Object.entries(PROVIDER_MAP).forEach(([pid, envName]) => {
    if (process.env[envName]) {
      serverKeys[pid] = process.env[envName]!;
    }
  });

  app.get("/api/providers", (req, res) => {
    const status = Object.keys(PROVIDER_MAP).reduce((acc, pid) => {
      acc[pid] = !!serverKeys[pid];
      return acc;
    }, {} as Record<string, boolean>);
    res.json(status);
  });

  app.post("/api/keys", (req, res) => {
    const { providerId, key } = req.body;
    if (providerId && key) {
      serverKeys[providerId] = key;
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Missing providerId or key" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, modelId, providerId, options } = req.body;
      
      // ENG-105: Validate modelId against allowlist
      if (!ALLOWED_MODELS.has(modelId)) {
        return res.status(403).json({ error: `Model ${modelId} is not on the allowed list.` });
      }

      const apiKey = serverKeys[providerId];
      
      if (!apiKey) {
        return res.status(401).json({ error: `API key for ${providerId} not found on server.` });
      }

      const provider = getProvider(providerId, apiKey);
      const model = provider(modelId);

      const result = await generateText({
        model,
        system: prompt.system,
        prompt: prompt.user,
        experimental_output: prompt.schema ? Output.object({ schema: prompt.schema }) : undefined,
        ...options
      });

      res.json({ text: result.text, object: result.experimental_output });
    } catch (error: any) {
      console.error("Proxy Generate Error:", error);
      const status = mapErrorToStatus(error);
      res.status(status).json({ error: error.message });
    }
  });

  app.post("/api/stream", async (req, res) => {
    try {
      const { prompt, modelId, providerId, options } = req.body;

      // ENG-105: Validate modelId against allowlist
      if (!ALLOWED_MODELS.has(modelId)) {
        return res.status(403).json({ error: `Model ${modelId} is not on the allowed list.` });
      }

      const apiKey = serverKeys[providerId];

      if (!apiKey) {
        return res.status(401).json({ error: `API key for ${providerId} not found on server.` });
      }

      const provider = getProvider(providerId, apiKey);
      const model = provider(modelId);

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

startServer();
