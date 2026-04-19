<div align="center">

# GitAgent Workbench

A visual development environment for creating production-ready AI agents through guided configuration and automated code generation.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/b08x/gitagent-workbench)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/react-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)](https://typescriptlang.org/)

</div>

## Features

- **Wizard-Driven Configuration** — Step-by-step agent setup covering identity, capabilities, compliance, and deployment structure
- **Multi-Provider AI Integration** — Native support for Anthropic, OpenAI, Google, Mistral, and OpenRouter APIs
- **Interactive Workbenches** — Dedicated environments for skill development and workflow design
- **Intelligent Generation Pipeline** — Automated creation of agent prompts, skills, tools, and configuration files
- **Live Content Editing** — Built-in editor for refining generated components before export
- **Compliance Framework** — Risk assessment and governance controls for enterprise deployment
- **Export System** — Complete agent packages delivered as downloadable ZIP archives

## Installation

<details>
<summary>Development Setup (Recommended)</summary>

```bash
git clone <repository-url>
cd gitagent-workbench
npm install
npm run dev
```

The development server runs on `http://localhost:3000` with external access enabled.

</details>

<details>
<summary>Production Build</summary>

```bash
npm run build
npm run preview
```

Static files output to the `dist/` directory.

</details>

## Usage

### Quick Start

Launch the development server and work through the guided workflow:

1. **Configure Identity** — Define agent name, purpose, and core characteristics
2. **Select Capabilities** — Choose skills, tools, and workflow requirements
3. **Choose AI Provider** — Configure API credentials for your preferred service
4. **Set Compliance** — Define risk level and governance requirements
5. **Select Structure** — Pick deployment architecture (minimal, standard, full, etc.)
6. **Generate Content** — AI creates prompts, skills, and configuration files
7. **Refine in Workbench** — Use interactive editors for skills and workflows
8. **Export Package** — Download complete agent as ZIP archive

### Structure Types

The application supports six deployment architectures:

| Type | Description |
|------|-------------|
| `minimal` | Basic agent with soul and behavioral rules |
| `standard` | Includes system prompts and compliance duties |
| `full` | Complete agent with skills, tools, and workflows |
| `inheritance` | Extends existing agent configurations |
| `multi-repo` | Distributed deployment across repositories |
| `monorepo` | Consolidated single-repository structure |

### Command Reference

```bash
npm run dev      # Development server on port 3000
npm run build    # Create production build
npm run preview  # Preview production build
npm run lint     # TypeScript type checking
npm run clean    # Remove build artifacts
```

## Configuration

### Environment Variables

Create `.env.local` in the project root with AI provider credentials:

```bash
# Choose one or more providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=sk-or-...
```

The application validates available providers at runtime and surfaces configuration options through the settings interface.

### Settings Management

Application settings persist in browser session storage:

- **Provider Selection** — Active AI provider for generation tasks
- **API Key Management** — Secure credential storage per provider
- **Theme Preferences** — Light/dark mode selection
- **MCP Server Configuration** — External service integrations

Agent workspace state maintains separation between configuration and generated content, enabling iterative refinement without data loss.

## Architecture

The application implements a multi-phase generation pipeline where user configuration drives AI-powered content creation. The wizard captures requirements across six dimensions: identity, capabilities, model selection, compliance, structure, and review.

Generation occurs through a sequential orchestrator that produces discrete agent components:

1. **Manifest** — Core agent metadata and dependencies
2. **Soul** — Core agent personality and identity
3. **Rules** — Behavioral guidelines and constraints
4. **Prompt** — System-level instructions (non-minimal structures)
5. **Duties** — Compliance obligations (risk-tier dependent)
6. **Skills** — Custom capabilities based on user selections
7. **Tools** — MCP-compatible tool definitions
8. **Workflows** — Multi-step process definitions (full structure only)

Interactive workbenches provide dedicated environments for skill development and workflow design, operating independently from the main agent workspace to enable component reuse across multiple agents.

The export system serializes the complete workspace into a structured ZIP archive containing all necessary files for agent deployment in target environments.

## Contributing

Contributions welcome. The codebase follows standard TypeScript/React patterns with clear separation between UI components, state management via React Context, and business logic in the `lib/` directory.

## License

MIT License — See [LICENSE](LICENSE) for details.
