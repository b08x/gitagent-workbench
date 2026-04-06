<div align="center">

# GitAgent Workbench

A visual development environment for creating production-ready AI agents through guided configuration and automated code generation.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)](https://typescriptlang.org/)

</div>

## Features

- **Wizard-Driven Configuration** — Step-by-step agent setup covering identity, capabilities, compliance, and deployment structure
- **Multi-Provider AI Integration** — Native support for Anthropic, OpenAI, Google, Mistral, and OpenRouter APIs
- **Intelligent Generation Pipeline** — Automated creation of agent prompts, skills, tools, and configuration files
- **Live Content Editing** — Built-in editor for refining generated agent components before export
- **Compliance Framework** — Risk assessment and governance controls for enterprise deployment
- **Export System** — Complete agent packages delivered as downloadable ZIP archives
- **Theme Support** — Light and dark modes with persistent user preferences
- **Real-time Validation** — Continuous workspace validation with detailed error reporting

## Installation

<details>
<summary>Development Setup (Recommended)</summary>

```bash
# Clone the repository
git clone <repository-url>
cd gitagent-workbench

# Install dependencies
npm install

# Start development server
npm run dev
```

The application runs on `http://localhost:3000` and accepts external connections.

</details>

<details>
<summary>Production Build</summary>

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Clean build artifacts
npm run clean
```

</details>

## Usage

### Quick Start

1. Launch the development server and navigate to the wizard interface
2. Configure your agent's identity and core capabilities
3. Select your preferred AI provider and configure API credentials
4. Set compliance parameters based on your deployment requirements
5. Choose the agent structure type that matches your project needs
6. Review the configuration and initiate the generation process
7. Edit generated files in the integrated editor as needed
8. Export your complete agent package

### Command Reference

```bash
# Development commands
npm run dev      # Start development server on port 3000
npm run build    # Create production build
npm run preview  # Preview production build locally
npm run lint     # Run TypeScript type checking
npm run clean    # Remove build artifacts
```

### Structure Types

- **Minimal** — Basic agent with soul and behavioral rules
- **Standard** — Includes system prompts and compliance duties
- **Full** — Complete agent with skills, tools, and workflows
- **Inheritance** — Extends existing agent configurations
- **Multi-repo** — Distributed deployment across repositories
- **Monorepo** — Consolidated single-repository structure

## Configuration

### Environment Variables

Create `.env.local` with your AI provider credentials:

```bash
# Choose one or more providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=sk-or-...
```

### Settings Management

Application settings persist in browser session storage and include:

- **Provider Selection** — Active AI provider for generation tasks
- **API Key Management** — Secure credential storage per provider
- **Theme Preferences** — Light/dark mode selection
- **MCP Server Configuration** — External service integrations

Agent workspace state maintains separation between configuration and generated content, enabling iterative refinement without data loss.

## Architecture

The application implements a multi-phase generation pipeline where user configuration drives AI-powered content creation. The wizard captures requirements across six dimensions: identity, capabilities, model selection, compliance, structure, and final review.

Generation occurs through a sequential orchestrator that produces discrete agent components (manifest, soul, rules, prompts, duties, skills, tools) with provider-agnostic streaming for real-time progress feedback.

The export system serializes the complete workspace into a structured ZIP archive containing all necessary files for agent deployment in target environments.

### Key Components

- **Agent Context** — Central state management for workspace configuration
- **Settings Context** — Application preferences and provider credentials  
- **Generation Orchestrator** — AI-powered content creation pipeline
- **Provider Abstraction** — Unified interface across multiple AI services
- **Validation System** — Real-time workspace integrity checking

## Contributing

Contributions welcome. The codebase follows standard TypeScript/React patterns with clear separation between UI, state management, and business logic layers.

## License

MIT