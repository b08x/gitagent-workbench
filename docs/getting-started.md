# Getting Started with GitAgent Workbench

GitAgent Workbench is a visual environment for creating production-ready AI agent configuration packages — ready to deploy with Hermes, Claude Code, or Antigravity.

## Prerequisites

- Node.js 18+ and npm
- An API key from at least one AI provider (Anthropic, OpenAI, Google, Mistral, Groq, or OpenRouter)

## Installation

```bash
git clone <repo-url>
cd gitagent-workbench
npm install
cp .env.local.example .env.local   # or create manually
npm run dev
```

The UI is available at `http://localhost:3000`.

## Environment Variables

Add API keys for whichever providers you want to use:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...      # or GEMINI_API_KEY
MISTRAL_API_KEY=...
GROQ_API_KEY=gsk_...        # Groq is also available via server-side proxy
OPENROUTER_API_KEY=sk-or-...
```

Keys set here are detected automatically — no need to enter them manually in Settings.

## Your First Agent in 8 Steps

Launch the dev server and click **New Agent** to start the wizard:

1. **Identity** — Name your agent and write a one-sentence purpose statement
2. **Capabilities** — Select skills, tools, and workflow complexity
3. **Model** — Pick an AI provider and model for generation
4. **Compliance** — Set the risk tier and supervision mode
5. **Structure** — Choose a deployment template (`minimal`, `standard`, or `full`)
6. **Generate** — Click **Synthesize** — the pipeline creates all agent files using your chosen LLM
7. **Review & Edit** — Inspect or refine generated files in the built-in editor
8. **Export** — Download a ZIP archive ready for deployment

## Navigation

| Section | Path | Purpose |
|---------|------|---------|
| Dashboard | `/dashboard` | Project overview and quick actions |
| Agent Builder | `/workbench/agent` | Wizard + inspection panel |
| Test Lab | `/workbench/chat` | Chat with your agent interactively |
| Release & Export | `/export` | Download the ZIP package |
| Version History | `/workbench/history` | Browse commit history |
| Git Repository | `/workbench/git` | Stage, commit, and push from within the app |

## Next Steps

- [Architecture Overview](./architecture.md) — How the generation pipeline works
- [API Reference](./api-reference.md) — Local HTTP API endpoints
- [Troubleshooting](./troubleshooting.md) — Common issues and fixes
