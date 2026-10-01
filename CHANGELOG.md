## [unreleased]

### 🚀 Features

- Initialize GitAgent Workbench project
- Enhance settings panel and export view
- Enhance navigation and export functionality
- Implement theme switching and settings persistence
- *(agent)* Add compliance fields to AgentManifest
- *(wizard)* Filter models based on agent type
- Enhance agent generation with file-specific profiles
- Integrate shadcn/ui and update dependencies
- Add Workflow Workbench
- *(providers)* Add Groq inference provider with server-side proxy support
- *(git)* Add Git integration workbench (Version History, Repository, Import)
- *(context)* Export `createDefaultWorkspace()` factory from AgentContext for programmatic workspace creation
- *(ui)* Adopt Paper & Ink design system with sharp 0px corners and hex color tokens
- *(generation)* Add `onComplete` callback prop to `GenerationDashboard`; switch to `plannedSteps` architecture with progress bar
- *(workbench)* Add `WIZARD_STEPS`-based explicit stepper with `isArchitectMode` guard in `AgentWorkbench`
- *(workbench)* Add `ResetRestartDialog` for generation pipeline recovery
- *(nav)* Restructure sidebar navigation: Workspace → Repository → Preferences sections with git branch badge

### 🐛 Bug Fixes

- *(fetch-models)* Remove Ollama exclusion from server-side proxy condition

### 📚 Documentation

- Add CLAUDE.md developer guide and rewrite project README
