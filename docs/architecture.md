# Architecture Overview

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│                                                                  │
│  ┌─────────┐  ┌────────────┐  ┌─────────┐  ┌────────────────┐  │
│  │ Wizard  │  │ Generation │  │ Editor  │  │    Export      │  │
│  │  Steps  │  │ Dashboard  │  │  View   │  │  (ZIP download)│  │
│  └────┬────┘  └─────┬──────┘  └────┬────┘  └───────┬────────┘  │
│       │              │              │                │           │
│  ┌────▼──────────────▼──────────────▼────────────────▼────────┐  │
│  │              AgentContext (useReducer)                      │  │
│  │              SettingsContext (sessionStorage)               │  │
│  └───────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    server.ts (API)   │
                    │    Express + Vite    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼──────┐ ┌───────▼───────┐
     │   AI Provider │ │  Built-in   │ │ local-context  │
     │    Proxies    │ │  Synthesis  │ │   -backend     │
     └───────────────┘ └─────────────┘ └───────────────┘
```

## Core Data Flow

```
User Input → Wizard → AgentWorkspace → Generation Pipeline → Serializer → ZIP
                │              │                │                  │
                │              │                │                  └─ skills/, tools/, agent.yaml, etc.
                │              │                └─ 12 sequential steps with AI generation
                │              └─ Central state: manifest, soul, rules, skills, tools, workflows
                └─ Step-by-step validation with Zod schemas
```

### 1. Configuration Phase

The wizard collects agent configuration through validated steps:
- Identity → Capabilities → Model → Compliance → Structure → Review
- Each step updates the `AgentWorkspace` via `AgentContext`

### 2. Generation Phase

The orchestrator (`lib/generation/orchestrator.ts`) runs applicable steps:

1. **SANITIZE_INPUTS** — Truncates oversized context files to prevent malformed output
2. **GEN_YAML** — Generates the agent manifest (agent.yaml)
3. **GEN_SOUL** — Creates the agent's identity and personality
4. **GEN_INSTRUCTIONS** — Consolidates rules, prompt, and duties into instruction files
5. **GEN_CONFIG** — Sets up runtime configuration
6. **GEN_SKILLS** — Generates skill definitions with instructions
7. **GEN_KNOWLEDGE_DOCS** — Creates knowledge documentation
8. **GEN_TOOLS** — Defines MCP-compatible tool schemas
9. **GEN_SUBAGENTS** — Configures sub-agent definitions (when present)
10. **GEN_WORKFLOWS** — Plans multi-step workflows (full structure only)
11. **GEN_EXAMPLES** — Generates example inputs/outputs (full structure only)
12. **VALIDATE_OUT** — Final validation of generated content

Steps are conditionally executed based on structure type and configuration.

### 3. Export Phase

The serializer (`lib/gitagent/serializer.ts`) converts the workspace into a ZIP archive:
- Strips null values to prevent validation errors
- Adds YAML frontmatter to skill files
- Ensures tool schemas use `input_schema` (not `parameters`)
- Generates sub-agent directories with their own manifests

## Key Modules

### lib/gitagent/ — Core Domain

| File | Purpose |
|------|---------|
| `types.ts` | Central type definitions: `AgentWorkspace`, `AgentManifest`, `StructureType` (9 types) |
| `schemas.ts` | Zod validation schemas for all data structures |
| `serializer.ts` | ZIP export with YAML frontmatter generation |

### lib/generation/ — AI Pipeline

| File | Purpose |
|------|---------|
| `orchestrator.ts` | Sequential step execution with event streaming |
| `steps.ts` | Step definitions and conditional filtering (12 steps) |
| `engine.ts` | Retry logic with provider fallback and local synthesis |
| `handlers/` | Individual step handler implementations |
| `prompts/` | Template prompts for each generation phase |

### lib/providers/ — AI Integrations

| File | Purpose |
|------|---------|
| `index.ts` | Provider registry (7 providers) |
| `types.ts` | `ModelProvider` interface (`generate()`, `stream()`) |
| `anthropic.ts` | Anthropic Claude integration |
| `openai.ts` | OpenAI GPT integration |
| `google.ts` | Google Gemini integration |
| `mistral.ts` | Mistral AI integration |
| `groq.ts` | Groq inference integration |
| `ollama.ts` | Ollama local model integration |
| `openrouter.ts` | OpenRouter multi-provider gateway |

## State Management

### AgentContext

The primary state manager using `useReducer`. Holds the `AgentWorkspace` — the central data structure containing all agent configuration, generated content, and UI state.

Key dispatch actions:
- `SET_IDENTITY`, `SET_CAPABILITIES`, `SET_MODEL`, `SET_COMPLIANCE`, `SET_STRUCTURE`
- `SET_SOUL`, `SET_RULES`, `SET_PROMPT`, `SET_SKILLS`, `SET_TOOLS`
- `SET_WORKFLOWS`, `SET_KNOWLEDGE`, `SET_EXAMPLES`
- `GENERATION_START`, `GENERATION_STEP`, `GENERATION_COMPLETE`

### SettingsContext

Manages API keys (stored in sessionStorage for security), theme preferences, and provider configuration. Keys are never persisted to disk.

### SkillWorkbenchContext

Separate context for the standalone skill editor, independent of the main agent workspace.

### Exported Utilities

**`createDefaultWorkspace(repoName?, targetFramework?, template?): ExtendedWorkspace`** — Factory function that composes a clean `initialState` with optional overrides. Use this when you need to programmatically create a fresh workspace outside of the React tree (e.g., in test fixtures or server-side code).

```typescript
import { createDefaultWorkspace } from './app/context/AgentContext';

const ws = createDefaultWorkspace('my-agent', 'hermes_agent', 'standard');
```

## Git Integration

The Git workbench (`app/workbench/GitIntegration.tsx`) provides an in-app interface for repository management:

- **Version History** — Browse commit history with diff previews
- **Git Repository** — Stage, commit, push, and pull operations
- **Import Agent** — Pull an existing agent package into the workspace

The sidebar badge on "Git Repository" reflects the current branch and number of unpushed commits in real time (`↑2 main`).

Git state is managed as part of `ExtendedWorkspace.git` and initialized via `createDefaultGitState()` in `AgentContext.tsx`. See `lib/gitagent/gitManager.ts` for the underlying Git operations layer.

## The Local Context Backend

An optional sidecar service for hybrid RAG over agent configurations:

- **Ingestion**: Recursively scans directories, chunks files with tiktoken
- **Storage**: SQLite with FTS5 (BM25) and sqlite-vec (vector similarity)
- **Search**: Reciprocal Rank Fusion combining keyword and semantic results
- **Status**: Embedding generation is TODO; requires pre-computed embeddings

See [local-context-backend/README.md](../local-context-backend/README.md) for details.

## Tech Stack

- **Runtime**: React 19, TypeScript ~5.8
- **Build**: Vite 6
- **Styling**: Tailwind CSS v4, Radix UI, shadcn/ui
- **AI**: Vercel AI SDK v6 with `@ai-sdk/*` provider packages
- **Routing**: React Router DOM v7
- **Validation**: Zod
- **Serialization**: js-yaml, jszip
