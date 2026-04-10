# AGENTS.md

This file provides guidance for AI agents working in this repository.

## Project Type

**GitAgent Workbench** - A React TypeScript application that helps users create AI agent configurations through a wizard interface and exports them as downloadable ZIP files.

## Essential Commands

```bash
# Development server (runs on port 3000, accessible externally)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking (no test suite exists)
npm run lint

# Clean build artifacts
npm run clean
```

## Code Organization

```
app/
├── context/          # React Context providers
│   ├── AgentContext.tsx       # Main agent workspace state
│   ├── SettingsContext.tsx    # API keys, theme, preferences
│   └── SkillWorkbenchContext.tsx
├── wizard/           # Multi-step configuration wizard
│   ├── WizardShell.tsx
│   └── steps/        # Identity, Capabilities, Model, Compliance, Structure, Review
├── generation/       # AI-powered content generation dashboard
├── editor/           # Manual file editing view
├── export/           # ZIP export functionality
└── workbench/        # Skill and Workflow workbenches

lib/
├── gitagent/         # Core types, schemas, serializer
│   ├── types.ts      # AgentWorkspace, AgentManifest, etc.
│   ├── schemas.ts    # Zod validation schemas
│   └── serializer.ts # ZIP export with YAML frontmatter
├── generation/       # AI generation pipeline
│   ├── orchestrator.ts  # Sequential generation steps
│   ├── strategy.ts     # Prompt building
│   ├── validator.ts    # Output validation
│   └── prompts/        # Templates per generation phase
└── providers/        # AI provider integrations
    ├── anthropic.ts, openai.ts, google.ts, mistral.ts, openrouter.ts
    └── types.ts     # ModelProvider interface
```

## Architecture Overview

### State Management
- **AgentContext** - Manages `AgentWorkspace` via `useReducer`
- **SettingsContext** - Stores API keys in sessionStorage, theme preference
- **SkillWorkbenchContext** - Separate context for skill editor

### Application Flow
1. **Wizard** (`/wizard`) - Step-by-step: Identity → Capabilities → Model → Compliance → Structure → Review
2. **Generation** (`/generating`) - AI generates agent files using orchestrator
3. **Editor** (`/editor`) - Manual refinement
4. **Export** (`/export`) - Download as ZIP

### AI Providers
Each provider in `lib/providers/` implements:
- `generate(prompt, apiKey)` - Returns `{ object: ... }` for structured output
- `stream(prompt, apiKey)` - Yields text chunks for streaming output

## Critical Gotchas

### Serialization Format Requirements

**Skills MUST have YAML frontmatter:**
- The orchestrator generates ONLY the body (instructions)
- The serializer adds the `---` frontmatter block
- If frontmatter is missing, `gitagent validate` fails with "missing YAML frontmatter"

**Tools MUST use `input_schema`, NOT `parameters`:**
- MCP-compatible format required
- `input_schema: { type: 'object', properties: {...} }`
- If wrong key, `gitagent validate` fails with "Referenced tool X not found"

**Manifest null handling:**
- The serializer's `stripNulls()` removes null/undefined values
- This prevents `additionalProperties` errors in gitagent validate

### Generation Pipeline Steps

The orchestrator conditionally runs steps based on structure type and compliance:

| Step | When |
|------|------|
| GEN_YAML | Always |
| GEN_SOUL | Always |
| GEN_RULES | Non-minimal structures |
| GEN_PROMPT | Non-minimal structures |
| GEN_DUTIES | Non-minimal AND (risk tier != low OR full structure) |
| GEN_SKILLS | Always |
| GEN_TOOLS | Always |
| GEN_WORKFLOWS | Full structure only |
| GEN_EXAMPLES | Full structure only |
| VALIDATE_OUT | Always |

### API Key Environment Variables

```bash
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_API_KEY=...
GEMINI_API_KEY=...    # Note: GEMINI_, not GOOGLE_
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=...
```

## Naming Conventions

- **Structure types**: `minimal`, `standard`, `full`, `inheritance`, `multi-repo`, `monorepo`
- **Risk tiers**: `low`, `standard`, `high`, `critical`
- **Supervision modes**: `always`, `conditional`, `advisory`, `none`
- **Review cadence**: `daily`, `weekly`, `monthly`, `quarterly`, `semi_annual`, `annual`

## Important Patterns

### Adding a New AI Provider
1. Create `lib/providers/<provider>.ts` implementing `ModelProvider` interface
2. Add to `providers` object in `lib/providers/index.ts`
3. Update settings UI to accept the new API key

### Adding a Wizard Step
1. Create component in `app/wizard/steps/`
2. Add route in `WizardShell.tsx`
3. Add validation in `agentReducer` (AgentContext.tsx)

### Modifying Generation Pipeline
1. Update step constants in `orchestrator.ts`
2. Add prompt template in `lib/generation/prompts/`
3. Add generation logic in orchestrator switch statement

## Tech Stack

- **Runtime**: React 19, TypeScript ~5.8
- **Build**: Vite 6
- **Styling**: Tailwind CSS v4, Radix UI components, shadcn/ui
- **AI**: Vercel AI SDK with @ai-sdk/* packages
- **Routing**: React Router DOM v7
- **Validation**: Zod
- **Serialization**: js-yaml, jszip

## No Test Suite

There is no test suite. Run `npm run lint` for type checking only.