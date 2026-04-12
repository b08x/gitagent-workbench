# GEMINI.md - GitAgent Workbench

This file provides foundational context and instructions for AI agents working on the GitAgent Workbench project.

## Project Overview

**GitAgent Workbench** is a visual development environment for building production-ready AI agents. It provides a guided, multi-step wizard to configure agent identity, capabilities, model selection, compliance frameworks, and deployment structures.

The core value proposition is the **Intelligent Generation Pipeline**, which uses LLMs to transform high-level user requirements into a complete, valid agent package (manifest, soul, rules, prompts, skills, tools, and workflows) that can be exported as a ZIP archive.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) (Vite 6, TypeScript 5.8)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [shadcn/ui](https://ui.shadcn.com/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` package)
- **Animation**: [Motion](https://motion.dev/) (Framer Motion 12)
- **Validation**: [Zod](https://zod.dev/)
- **Serialization**: [js-yaml](https://github.com/nodeca/js-yaml), [jszip](https://stuk.github.io/jszip/)
- **Routing**: React Router DOM v7

## Key Commands

```bash
npm run dev      # Start development server on port 3000 (0.0.0.0)
npm run build    # Create production build (dist/)
npm run preview  # Preview production build locally
npm run lint     # TypeScript type checking (No test suite exists)
npm run clean    # Remove build artifacts
```

## Architecture

### Core State Management
- **AgentContext** (`app/context/AgentContext.tsx`): Manages the `AgentWorkspace` via `useReducer`. This is the single source of truth for the agent being built.
- **SettingsContext** (`app/context/SettingsContext.tsx`): Manages API keys (sessionStorage), theme, and app-level preferences.
- **SkillWorkbenchContext** (`app/context/SkillWorkbenchContext.tsx`): Manages the standalone skill editor state.

### Directory Structure
- `app/wizard/`: UI for the multi-step configuration flow (Identity → Capabilities → Model → Compliance → Structure → Review).
- `app/workbench/`: Interactive environments for deep editing (Skills, Workflows, Chat, Knowledge).
- `lib/gitagent/`: Domain logic, central types (`types.ts`), Zod schemas (`schemas.ts`), and serialization (`serializer.ts`).
- `lib/generation/`: The AI pipeline. `orchestrator.ts` runs sequential steps to generate agent files.
- `lib/providers/`: Unified `ModelProvider` interface for Anthropic, OpenAI, Google, Mistral, and OpenRouter.

## Development Conventions & Patterns

### 1. Working with AgentWorkspace
The `AgentWorkspace` is a complex object. Always refer to `lib/gitagent/types.ts` before modifying it.
- **Manifest**: Core metadata (name, description, compliance).
- **Skills**: Stored as `Record<string, ParsedSkill>`.
- **Tools**: Stored as `Record<string, ToolSchema>`.

### 2. Serialization & Validation (Critical)
- **Skills MUST have YAML frontmatter**: The orchestrator generates the instructions; the serializer adds the `---` block.
- **Tools MUST use `input_schema`**: MCP-compatible format is required. Do NOT use `parameters`.
  - Correct: `input_schema: { type: 'object', properties: {...} }`
- **Manifest Null Handling**: Use `stripNulls()` in the serializer to prevent `additionalProperties` errors during external validation.

### 3. Adding New Capabilities
- **New AI Provider**: Implement `ModelProvider` in `lib/providers/`, register it in `index.ts`, and update the settings UI.
- **New Wizard Step**: Create component in `app/wizard/steps/`, add route to `WizardShell.tsx`, and update the reducer validation.
- **Generation Step**: Add a step constant to `orchestrator.ts`, create a prompt template in `lib/generation/prompts/`, and implement the switch case logic.

### 4. Styling & UI
- Use **Tailwind 4** utility classes.
- Prefer **Radix UI** primitives for accessible components.
- Use **Motion** for transitions between wizard steps and workbench panels.

## Critical Gotchas

- **No Test Suite**: There are currently no automated tests. Rely on `npm run lint` for type safety and manual verification.
- **Environment Variables**: API keys in `.env.local` must follow naming conventions: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` (or `GEMINI_API_KEY`), `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`.
- **Structure Types**: Agent generation logic varies significantly between `minimal`, `standard`, and `full` structures. See `orchestrator.ts` for conditional logic.
- **Risk Tiers**: Compliance duties (`GEN_DUTIES`) are only generated for non-low risk tiers or `full` structures.
