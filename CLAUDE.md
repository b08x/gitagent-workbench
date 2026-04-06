# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitAgent Workbench is a React application that helps users create AI agents through a step-by-step wizard interface. It generates complete agent configurations including prompts, tools, skills, and compliance settings, then exports them as downloadable files.

## Development Commands

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

## Architecture

### Core State Management
The application uses React Context for state management with two primary contexts:
- **AgentContext** (`app/context/AgentContext.tsx`) - Manages the `AgentWorkspace` state for agent configuration
- **SettingsContext** (`app/context/SettingsContext.tsx`) - Handles app settings, API keys, and theme preferences

### Application Flow
1. **Wizard Phase** (`/wizard`) - Multi-step configuration:
   - Identity → Capabilities → Model → Compliance → Structure → Review
2. **Generation Phase** (`/generating`) - AI-powered content creation using the orchestrator
3. **Editor Phase** (`/editor`) - Manual file editing and refinement
4. **Export Phase** (`/export`) - Download agent configuration as ZIP

### AI Provider Integration
The app supports multiple AI providers through a unified interface (`lib/providers/`):
- Anthropic, OpenAI, Google, Mistral, OpenRouter
- Each provider implements `generate()` and `stream()` methods
- API keys are managed through the settings context and stored in sessionStorage

### Generation Pipeline
The orchestrator (`lib/generation/orchestrator.ts`) runs a sequential generation process:
1. **GEN_YAML** - Agent manifest configuration
2. **GEN_SOUL** - Core agent personality/identity
3. **GEN_RULES** - Behavioral guidelines
4. **GEN_PROMPT** - System prompt (for non-minimal structures)
5. **GEN_DUTIES** - Compliance duties (for non-low risk tiers)
6. **GEN_SKILLS** - Custom skills based on capabilities
7. **GEN_TOOLS** - Tool definitions
8. **VALIDATE_OUT** - Final validation

## Key File Locations

### Core Types and Schemas
- **Agent Types**: `lib/gitagent/types.ts` - Central type definitions for `AgentWorkspace`, `AgentManifest`
- **Zod Schemas**: `lib/gitagent/schemas.ts` - Validation schemas
- **Serializer**: `lib/gitagent/serializer.ts` - Export/import logic

### Generation System
- **Orchestrator**: `lib/generation/orchestrator.ts` - Main generation pipeline
- **Strategy**: `lib/generation/strategy.ts` - Prompt building logic
- **Validator**: `lib/generation/validator.ts` - Output validation
- **Prompts**: `lib/generation/prompts/` - Template prompts for each generation phase

### UI Components
- **Wizard Steps**: `app/wizard/steps/` - Each step of the configuration wizard
- **Main Views**: `app/{generation,editor,export}/` - Primary application views
- **UI Kit**: `components/ui/` - Reusable Radix UI components with Tailwind CSS

## Configuration Files

### Agent Instruction Config
`lib/config/agent_instruction_config.json` contains extensive prompt templates and generation strategies with dimensional analysis for context gathering, drafting, and review phases.

### Environment Variables
Create `.env.local` with:
```
# At minimum, set one of these API keys:
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

## Structure Types
The application supports different agent complexity levels:
- **minimal** - Basic agent with just soul and rules
- **standard** - Includes prompt, duties, and basic structure
- **full** - Complete agent with all components
- **inheritance** - Extends existing agents
- **multi-repo** - Distributed across repositories
- **monorepo** - Single repository with multiple agents

## Working with AgentWorkspace

The `AgentWorkspace` interface is the central data structure containing:
- **meta** - Status, structure type, current step
- **manifest** - Agent configuration (name, version, dependencies, compliance)
- **Content files** - soul, rules, prompt_md, duties, agents_md
- **Capabilities** - skills, tools, workflows
- **Infrastructure** - knowledge index, memory config, examples
- **Sub-agents** - Nested agent configurations

## Common Development Patterns

### Adding New Wizard Steps
1. Create step component in `app/wizard/steps/`
2. Update `WizardShell.tsx` routing
3. Add step validation in agent reducer

### Extending AI Providers
1. Implement provider interface in `lib/providers/`
2. Add to provider registry in `lib/providers/index.ts`
3. Update settings UI for new API key

### Modifying Generation Pipeline
1. Update step constants in orchestrator
2. Add prompt template in `lib/generation/prompts/`
3. Implement generation logic in orchestrator switch statement

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Radix UI components
- **AI Integration**: Vercel AI SDK with multiple providers
- **Routing**: React Router DOM v7
- **State**: React Context + useReducer
- **Validation**: Zod schemas
- **Build**: Vite with React plugin