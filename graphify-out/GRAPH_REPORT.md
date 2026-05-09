# Graph Report - .  (2026-05-08)

## Corpus Check
- 24 files · ~53,763 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 553 nodes · 1733 edges · 27 communities (19 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.81)
- Token cost: 1,450 input · 2,100 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Skill Workbench & Editor|Skill Workbench & Editor]]
- [[_COMMUNITY_Agent Core & Workspace|Agent Core & Workspace]]
- [[_COMMUNITY_Wizard Shell & Navigation|Wizard Shell & Navigation]]
- [[_COMMUNITY_App Layout & Sidebar UI|App Layout & Sidebar UI]]
- [[_COMMUNITY_Settings & Model Config|Settings & Model Config]]
- [[_COMMUNITY_Wizard Steps & Validation|Wizard Steps & Validation]]
- [[_COMMUNITY_Import & Compliance|Import & Compliance]]
- [[_COMMUNITY_Export & Hermes Python|Export & Hermes Python]]
- [[_COMMUNITY_GitAgent Schemas|GitAgent Schemas]]
- [[_COMMUNITY_Generation Orchestrator|Generation Orchestrator]]
- [[_COMMUNITY_Generation Strategy & Config|Generation Strategy & Config]]
- [[_COMMUNITY_Generation Engine & Stream|Generation Engine & Stream]]
- [[_COMMUNITY_AI Providers Registry|AI Providers Registry]]
- [[_COMMUNITY_GitAgent Types & Validation|GitAgent Types & Validation]]
- [[_COMMUNITY_Docs Concepts|Docs Concepts]]
- [[_COMMUNITY_Skill Parser|Skill Parser]]
- [[_COMMUNITY_Dev Server|Dev Server]]
- [[_COMMUNITY_Docs Patterns|Docs Patterns]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Config YAML Prompt|Config YAML Prompt]]
- [[_COMMUNITY_Skill Workbench Context|Skill Workbench Context]]
- [[_COMMUNITY_Skill Workbench Provider|Skill Workbench Provider]]
- [[_COMMUNITY_Agent Provider|Agent Provider]]
- [[_COMMUNITY_Settings Provider|Settings Provider]]
- [[_COMMUNITY_Model Provider|Model Provider]]

## God Nodes (most connected - your core abstractions)
1. `useAgentWorkspace()` - 71 edges
2. `Button()` - 36 edges
3. `cn()` - 36 edges
4. `Card` - 35 edges
5. `CardContent` - 34 edges
6. `CardHeader` - 32 edges
7. `CardTitle` - 32 edges
8. `Label` - 25 edges
9. `AgentWorkspace` - 25 edges
10. `useSettings()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `useAgentWorkspace()` --calls--> `Header()`  [EXTRACTED]
  app/context/AgentContext.tsx → src/App.tsx
- `AppContent()` --calls--> `useSettings()`  [EXTRACTED]
  src/App.tsx → app/context/SettingsContext.tsx
- `WizardShell` --calls--> `ALL_HANDLERS`  [INFERRED]
  app/wizard/WizardShell.tsx → lib/generation/handlers/core-handlers.ts
- `ExportView` --calls--> `serializeWorkspace`  [EXTRACTED]
  app/export/ExportView.tsx → lib/gitagent/serializer.ts
- `AgentWorkbench` --calls--> `Resizable Components`  [EXTRACTED]
  app/workbench/AgentWorkbench.tsx → components/ui/resizable.tsx

## Hyperedges (group relationships)
- **Workbench Module Composition** — agentworkbench, agentwizard, identitystep, capabilitiesstep, modelstep [EXTRACTED 0.90]
- **Sidebar Navigation System** — applayout, appsidebar, sidebar, sheet, tooltip [EXTRACTED 0.90]
- **Agent Context State Management** — agentcontext, agentworkspace_extended, skillentry, complianceconfig [EXTRACTED 1.00]
- **Settings Context State Management** — settingscontext, appconfig [EXTRACTED 1.00]
- **Workflow Engine Components** — workflowworkbench, workflowschema, workflowstep [EXTRACTED 0.90]
- **UI Component Library** — resizable, scrollarea, sheet, sidebar, tooltip [EXTRACTED 0.85]

## Communities (27 total, 8 thin omitted)

### Community 0 - "Skill Workbench & Editor"
Cohesion: 0.12
Nodes (48): PERMISSIONS, Props, SubAgentMiniWizard(), SubAgentEntry, initialSkill, SkillWorkbenchContext, SkillWorkbenchContextType, SkillWorkbenchProvider() (+40 more)

### Community 1 - "Agent Core & Workspace"
Cohesion: 0.06
Nodes (55): Agent Generation Pipeline, AgentContext, AgentManifest, AgentManifestSchema, AgentWizard, AgentWorkbench, AgentWorkspace, AgentWorkspace Extended Type (+47 more)

### Community 2 - "Wizard Shell & Navigation"
Cohesion: 0.07
Nodes (39): useAgentWorkspace(), docs, DocsPage(), FileEditor(), FileTree(), ValidationPanel(), assembleRules(), assembleSoul() (+31 more)

### Community 3 - "App Layout & Sidebar UI"
Cohesion: 0.07
Nodes (37): AppLayout(), AppSidebar(), items, SidebarItem, useIsMobile(), SheetContent, SheetContentProps, SheetDescription (+29 more)

### Community 4 - "Settings & Model Config"
Cohesion: 0.1
Nodes (32): FileType, GenerateImproveButton(), GenerateImproveButtonProps, SettingsPanel(), TaskModelSettings(), TASKS, ConflictMatrixEntry, DutyRole (+24 more)

### Community 5 - "Wizard Steps & Validation"
Cohesion: 0.07
Nodes (30): ValidationSummary(), ValidationSummaryProps, A2AServerEntry, Action, AgentContext, AgentProvider(), ComplianceConfig, DutiesConfig (+22 more)

### Community 6 - "Import & Compliance"
Cohesion: 0.09
Nodes (24): parseCLAUDEmd(), ParseResult, GeminiParseResult, GeminiSettings, parseGeminiSettings(), ImportView(), MergeStrategy, ALL_TOOLS (+16 more)

### Community 7 - "Export & Hermes Python"
Cohesion: 0.12
Nodes (19): exportToHermesPython(), HermesPythonExport, PreviewPanel(), ExportView(), assembleCLAUDEmd(), exportGeminiZip(), assembleGeminiSettings(), downloadZip() (+11 more)

### Community 8 - "GitAgent Schemas"
Cohesion: 0.1
Nodes (24): AgentComplianceSchema, AgentManifestSchema, ComplianceRecordkeepingSchema, ComplianceSupervisionSchema, CoreInstructionsSchema, ReferencesReadmeSchema, SkillInstructionSchema, ToolYamlSchema (+16 more)

### Community 9 - "Generation Orchestrator"
Cohesion: 0.1
Nodes (18): GenerationDashboard(), STEP_LABELS, applicableSteps, fileTokens, handler, iterator, templatePrompt, totalTokens (+10 more)

### Community 10 - "Generation Strategy & Config"
Cohesion: 0.14
Nodes (16): instructionsBody, prompt, SkillGenerationConfig, buildGenerationPrompt(), FileType, fileTypeToProfileKey, Phase, generateHermesConfig() (+8 more)

### Community 11 - "Generation Engine & Stream"
Cohesion: 0.1
Nodes (18): content, contentType, decoder, generateWithRetryAndFallback(), lines, models, parsed, parts (+10 more)

### Community 12 - "AI Providers Registry"
Cohesion: 0.32
Nodes (10): anthropicProvider, googleProvider, groqProvider, mistralProvider, ollamaProvider, openaiProvider, openrouterProvider, GenerationPrompt (+2 more)

### Community 13 - "GitAgent Types & Validation"
Cohesion: 0.15
Nodes (14): validateWorkspace(), AgentCompliance, AgentManifest, ComplianceRecordkeeping, ComplianceSupervision, MemoryConfig, MemoryLayer, SkillExample (+6 more)

### Community 14 - "Docs Concepts"
Cohesion: 0.25
Nodes (8): AI Workbench, Custom Tools, Git Sync, GitAgent, Manifest, tools Key, TypeScript, Workflow Automation

### Community 15 - "Skill Parser"
Cohesion: 0.4
Nodes (4): parseSkillMd(), resolveGitHubRawUrl(), SkillParseResult, ParsedSkill

### Community 17 - "Docs Patterns"
Cohesion: 0.5
Nodes (4): Agent Best Practices, Contextual Memory, Specific Instructions, Tool Access

## Knowledge Gaps
- **161 isolated node(s):** `__filename`, `__dirname`, `env`, `TASKS`, `SkillWorkbenchState` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.