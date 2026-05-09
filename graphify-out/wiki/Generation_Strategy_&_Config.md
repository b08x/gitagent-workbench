# Generation Strategy & Config

> 24 nodes · cohesion 0.14

## Key Concepts

- **AgentWorkspace** (25 connections) — `lib/gitagent/types.ts`
- **strategy.ts** (16 connections) — `lib/generation/strategy.ts`
- **buildGenerationPrompt()** (14 connections) — `lib/generation/strategy.ts`
- **skill-generator.ts** (10 connections) — `lib/generation/skill-generator.ts`
- **skill-md.ts** (9 connections) — `lib/generation/prompts/skill-md.ts`
- **soul-md.ts** (8 connections) — `lib/generation/prompts/soul-md.ts`
- **duties-md.ts** (7 connections) — `lib/generation/prompts/duties-md.ts`
- **prompt-md.ts** (7 connections) — `lib/generation/prompts/prompt-md.ts`
- **rules-md.ts** (7 connections) — `lib/generation/prompts/rules-md.ts`
- **config-generator.ts** (5 connections) — `lib/gitagent/config-generator.ts`
- **skillPrompt()** (3 connections) — `lib/generation/prompts/skill-md.ts`
- **soulPrompt()** (3 connections) — `lib/generation/prompts/soul-md.ts`
- **generateHermesConfig()** (2 connections) — `lib/gitagent/config-generator.ts`
- **dutiesPrompt()** (2 connections) — `lib/generation/prompts/duties-md.ts`
- **promptPrompt()** (2 connections) — `lib/generation/prompts/prompt-md.ts`
- **rulesPrompt()** (2 connections) — `lib/generation/prompts/rules-md.ts`
- **instructionsBody** (1 connections) — `lib/generation/skill-generator.ts`
- **prompt** (1 connections) — `lib/generation/skill-generator.ts`
- **SkillGenerationConfig** (1 connections) — `lib/generation/skill-generator.ts`
- **FileType** (1 connections) — `lib/generation/strategy.ts`
- **fileTypeToProfileKey** (1 connections) — `lib/generation/strategy.ts`
- **Phase** (1 connections) — `lib/generation/strategy.ts`
- **HermesConfigOutput** (1 connections) — `lib/gitagent/config-generator.ts`
- **skillMdOutputSchema** (1 connections) — `lib/generation/prompts/skill-md.ts`

## Relationships

- [[Generation Orchestrator]] (80 shared connections)
- [[Import & Compliance]] (11 shared connections)
- [[Generation Engine & Stream]] (10 shared connections)
- [[Wizard Steps & Validation]] (5 shared connections)
- [[Wizard Shell & Navigation]] (5 shared connections)
- [[Settings & Model Config]] (3 shared connections)
- [[Agent Core & Workspace]] (2 shared connections)
- [[Skill Workbench & Editor]] (1 shared connections)
- [[App Layout & Sidebar UI]] (1 shared connections)

## Source Files

- `lib/generation/prompts/duties-md.ts`
- `lib/generation/prompts/prompt-md.ts`
- `lib/generation/prompts/rules-md.ts`
- `lib/generation/prompts/skill-md.ts`
- `lib/generation/prompts/soul-md.ts`
- `lib/generation/skill-generator.ts`
- `lib/generation/strategy.ts`
- `lib/gitagent/config-generator.ts`
- `lib/gitagent/types.ts`

## Audit Trail

- EXTRACTED: 130 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*