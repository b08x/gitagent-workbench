/**
 * High-quality deterministic agent specification synthesizer and domain generator.
 * Used when cloud LLM providers are unavailable, rate-limited, or when API keys are invalid.
 * Produces structured, fully compliant GitAgent specifications with manifest, soul, rules, skills, tools, and duties.
 */
import { AgentFramework } from '../gitagent/types';
import { inferFrameworkTools } from '../gitagent/contextToolInference';

export interface SynthesizedAgentResult {
  manifest: {
    name: string;
    description: string;
    version?: string;
    author?: string;
    spec_version?: string;
    skills?: string[];
    tools?: string[];
    compliance?: any;
    model?: any;
    tags?: string[];
    metadata?: Record<string, any>;
  };
  targetFramework?: AgentFramework;
  harness?: AgentFramework;
  soul: string;
  rules: string;
  skills: string;
  explanation: string;
}

export function synthesizeAgentSpec(promptText: string, contextSummary: string = '', framework: AgentFramework = 'hermes_agent'): SynthesizedAgentResult {
  const cleanPrompt = promptText.trim();
  const lower = cleanPrompt.toLowerCase();

  // Determine domain & naming
  let domain = 'general-assistant';
  let title = 'Agent';
  let description = '';

  if (lower.includes('research') || lower.includes('pdf') || lower.includes('search') || lower.includes('rag') || lower.includes('scrape') || lower.includes('scraping')) {
    domain = 'research-analyst';
    title = 'Deep Research & Document Intelligence Specialist';
    description = 'Analyzes multi-source documents, verifies citations, and produces structured technical research dossiers.';
  } else if (lower.includes('code') || lower.includes('review') || lower.includes('typescript') || lower.includes('react') || lower.includes('git') || lower.includes('pr')) {
    domain = 'code-architect-reviewer';
    title = 'Senior Code Architect & Quality Reviewer';
    description = 'Performs rigorous automated code inspections, enforces architectural patterns, and verifies linter standards.';
  } else if (lower.includes('devops') || lower.includes('sre') || lower.includes('incident') || lower.includes('alert') || lower.includes('monitor') || lower.includes('kubernetes')) {
    domain = 'devops-sre-incident-handler';
    title = 'DevOps & Site Reliability Engineer';
    description = 'Monitors telemetry alerts, executes diagnostic runbooks, and manages progressive rollouts with approval gates.';
  } else if (lower.includes('data') || lower.includes('sql') || lower.includes('pipeline') || lower.includes('etl') || lower.includes('query')) {
    domain = 'data-engineer-analyst';
    title = 'Data Engineering & Pipeline Specialist';
    description = 'Constructs resilient ETL pipelines, optimizes SQL query plans, and maintains semantic data models.';
  } else if (lower.includes('security') || lower.includes('audit') || lower.includes('auth') || lower.includes('compliance') || lower.includes('soc2')) {
    domain = 'security-compliance-auditor';
    title = 'Security & Compliance Officer';
    description = 'Audits access controls, scans for vulnerabilities, and validates adherence to SOC2 and ISO compliance frameworks.';
  } else if (lower.includes('artifact') || lower.includes('sanitize') || lower.includes('cleanup')) {
    domain = 'artifact-sanitizer-remediator';
    title = 'Artifact Sanitizer & Cleanup Specialist';
    description = 'Detects, isolates, and purges copy-paste artifacts and corrupted tokens across repository trees.';
  } else {
    // Generate name from first few words
    const words = cleanPrompt.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 4).filter(Boolean);
    domain = words.join('-').toLowerCase() || 'custom-agent';
    title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Custom Specialist Agent';
    description = `An autonomous AI specialist engineered to execute: ${cleanPrompt.slice(0, 120)}.`;
  }

  // Sanitize kebab-case name
  const name = domain.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'custom-agent';

  // Automatically infer framework tools for primary skills
  const coreSkillName = `${name}-core-ops`;
  const auditSkillName = `${name}-audit-verify`;

  const coreSkillInference = inferFrameworkTools({
    name: coreSkillName,
    description: `Executes the primary domain tasks: ${description}`,
    category: 'code',
    targetFramework: framework
  });

  const auditSkillInference = inferFrameworkTools({
    name: auditSkillName,
    description: 'Inspects output consistency, checks syntax, and executes validation tests.',
    category: 'compliance',
    targetFramework: framework
  });

  const coreToolsStr = coreSkillInference.tools.map(t => `\`${t}\``).join(', ');
  const auditToolsStr = auditSkillInference.tools.map(t => `\`${t}\``).join(', ');

  const soul = `## Core Identity
You are **${title}**, an autonomous AI specialist purpose-built to execute high-precision workflows: "${cleanPrompt}".

## Emotional Baseline & Temperament
- **Composed & Analytical**: Calm, measured, and resolute when evaluating edge cases or encountering system faults.
- **Proactive & Thorough**: Scans dependencies, verifies preconditions, and leaves unambiguous operational trails.

## Communication Style
- **Clarity & Precision**: Communicate with technical rigor, direct summaries, and actionable steps.
- **Evidence-Based**: Cite specific files, line ranges, and execution metrics for every claim.
- **Structured Hierarchy**: Organize complex responses using Markdown headings, bullet points, and syntax-highlighted code blocks.

## Values & Principles
- **Safety First**: Verify preconditions and destructive impacts before initiating changes.
- **Zero Ambiguity**: Clarify assumptions upfront and provide reproducible instructions.
- **Continuous Alignment**: Adhere strictly to project conventions, repository schemas, and compliance policies.

## Domain Expertise
- Advanced workflow automation and domain-specific problem solving.
- Systematic error recovery, telemetry tracking, and structured artifact generation.
- Real-time orchestration across multi-agent boundaries and external tool APIs.

## Collaboration Style
- Proactively summarize completed actions and outline next planned milestones.
- Request explicit human confirmation prior to executing high-risk or irreversible operations.`;

  const rules = `## Must Always
- Validate input schemas and file boundaries prior to processing data.
- Maintain idempotency and audit logs for all automated actions.
- Produce clean, modular outputs following established repository style guides.
- Fail closed with actionable diagnostic reports when encountering unexpected errors.
- Confirm destructive actions with explicit user approval gates.

## Must Never
- Expose private credentials, API keys, or sensitive environment tokens in logs or outputs.
- Execute destructive operations without user consent or validated rollback mechanisms.
- Hallucinate dependencies or fabricate file paths not present in the workspace.
- Overwrite existing configuration files without parsing syntax first.

## Output Constraints
- Code blocks must contain complete, valid, non-truncated implementations.
- Configuration files must strictly adhere to JSON or YAML formatting standards.
- Responses must remain concise, scannable, and free of conversational fluff.

## Interaction Boundaries
- Operate strictly within declared tool permissions and context limits.
- Delegate sub-tasks to specialized companion agents when operations exceed primary domain scope.`;

  const skills = `## Skill: Core Operations & Workflow Execution
- **Description**: Executes primary domain operations, inspects workspace context, and executes targeted actions.
- **Allowed Tools**: ${coreToolsStr || '`read_file`, `write_file`'}
- **Preconditions**: Target files and inputs must be validated.

## Skill: Verification & Diagnostic Audit
- **Description**: Inspects output consistency, checks syntax, and executes validation test suites.
- **Allowed Tools**: ${auditToolsStr || '`read_file`, `execute_command`'}
- **Postconditions**: Produces a structured pass/fail audit report with remedial suggestions.`;

  const explanation = `Configured complete agent workspace "${name}" (${title}) for harness "${framework}". Allowed tools for all generated skills have been contextually aligned with the framework matrix.`;

  return {
    manifest: {
      name,
      description,
      version: '1.0.0',
      author: 'GitAgent Builder',
      spec_version: '0.1.0',
      skills: [coreSkillName, auditSkillName],
      tools: ['terminal', 'file-system'],
      compliance: {
        risk_tier: 'standard',
        supervision: {
          human_in_the_loop: 'conditional'
        },
        recordkeeping: {
          audit_logging: true,
          log_format: 'structured_json'
        }
      },
      tags: [domain, 'autonomous', 'production-ready'],
      metadata: {
        harness: framework,
        targetFramework: framework
      }
    },
    targetFramework: framework,
    harness: framework,
    soul,
    rules,
    skills,
    explanation
  };
}

/**
 * Universal contextual synthesizer for all generation prompts and schemas.
 * Returns either { object: ... } for JSON schemas or { text: ... } for markdown/text.
 */
export function universalSynthesize(prompt: any, targetFramework: AgentFramework = 'hermes_agent'): { object?: any; text?: string } {
  const userText = extractText(prompt?.user || prompt?.messages || prompt);
  const systemText = typeof prompt?.system === 'string' ? prompt.system : '';
  const schema = prompt?.schema;

  // 1. Check for Manifest Schema (GEN_YAML / Agent Architect)
  if (schema?.properties?.manifest || schema?.manifest || (schema?.properties?.name && schema?.properties?.version && schema?.properties?.description)) {
    const spec = synthesizeAgentSpec(userText || 'Specialist Agent', '', targetFramework);
    return {
      object: {
        name: spec.manifest.name,
        version: spec.manifest.version || '1.0.0',
        description: spec.manifest.description,
        spec_version: '0.1.0',
        author: 'GitAgent Architect',
        license: 'MIT',
        skills: spec.manifest.skills || [],
        tools: spec.manifest.tools || [],
        compliance: spec.manifest.compliance || {
          risk_tier: 'standard',
          supervision: { human_in_the_loop: 'conditional' }
        },
        tags: spec.manifest.tags || ['production']
      }
    };
  }

  // 2. Check for CoreInstructionsSchema (GEN_INSTRUCTIONS -> rules, prompt, duties)
  if (schema?.properties?.rules && schema?.properties?.prompt && schema?.properties?.duties) {
    const spec = synthesizeAgentSpec(userText || 'Autonomous Agent', '', targetFramework);
    const duties = `## Core Duties & Responsibilities

### 1. Primary Operational Workflow (P0)
- Continually scan and monitor assigned tasks against requirements.
- Parse workspace file trees and validate schemas before processing.
- Maintain atomic checkpoints and audit logs for all modifications.

### 2. Verification & Quality Assurance (P1)
- Verify that every synthesized artifact compiles without syntax errors.
- Ensure strict type safety and absence of unverified assumptions.
- Run automated regression and linting suites prior to reporting completion.

### 3. Escalation & Safety Governance (P2)
- Escalate breaking changes or destructive operations for human approval.
- Enforce segregation of duties and secure credential management.`;

    const promptMd = `# System Directive: ${spec.manifest.name}

You are ${spec.manifest.name}, an autonomous agent operating under the ${targetFramework} harness.

## Prime Directives
1. Execute user commands with maximum fidelity and technical precision.
2. Adhere strictly to the guidelines defined in \`RULES.md\` and identity in \`SOUL.md\`.
3. Utilize only explicitly authorized tools declared in your active skill manifests.`;

    return {
      object: {
        rules: spec.rules,
        prompt: promptMd,
        duties
      }
    };
  }

  // 3. Check for ReferencesReadmeSchema (GEN_SKILLS / references)
  if (schema?.properties?.references) {
    const skillNameMatch = userText.match(/Skill:\s*([a-zA-Z0-9_-]+)/i) || userText.match(/skill\s*['"]?([a-zA-Z0-9_-]+)/i);
    const skillName = skillNameMatch ? skillNameMatch[1] : 'core-skill';
    return {
      object: {
        references: [
          {
            filename: `${skillName}-reference-guide.md`,
            description: `Comprehensive API reference and execution patterns for ${skillName}.`,
            trigger: `Load when preparing to execute ${skillName} operations or configuring parameters.`
          },
          {
            filename: `${skillName}-error-recovery.md`,
            description: `Known error modes, diagnostic steps, and rollback procedures.`,
            trigger: `Load when an operation in ${skillName} fails or encounters unexpected return codes.`
          }
        ]
      }
    };
  }

  // 4. Check for SkillInstructionSchema (GEN_SKILLS / SKILL.md)
  if (schema?.properties?.instructions && schema?.properties?.frontmatter) {
    const skillNameMatch = userText.match(/Skill:\s*([a-zA-Z0-9_-]+)/i) || userText.match(/skill\s*['"]?([a-zA-Z0-9_-]+)/i);
    const skillName = skillNameMatch ? skillNameMatch[1] : 'primary-skill';
    const inferred = inferFrameworkTools({
      name: skillName,
      description: userText.slice(0, 100),
      category: 'code',
      targetFramework
    });

    return {
      object: {
        instructions: `# ${skillName} Skill Instructions

## Overview
This skill provides deterministic operational execution for **${skillName}** within the agent workspace.

## Step-by-Step Execution Workflow
1. **Context Validation**: Inspect the workspace to confirm required input files and configuration exist.
2. **Execution Phase**: Execute the target domain task using the permitted tools (\`${inferred.tools.join('`, `')}\`).
3. **Verification**: Run diagnostic assertions to confirm output integrity.

## References
For extended documentation and error runbooks, use:
- \`skill_view('${skillName}', 'references/${skillName}-reference-guide.md')\` for operational guides.
- \`skill_view('${skillName}', 'references/${skillName}-error-recovery.md')\` for troubleshooting.`,
        frontmatter: {
          name: skillName,
          description: `Operational skill for ${skillName}`,
          version: '1.0.0',
          metadata: {
            hermes: {
              tags: ['automation', 'workflow'],
              category: 'general'
            },
            'allowed-tools': inferred.tools.join(' ')
          }
        }
      }
    };
  }

  // 5. Check for ToolYamlSchema (GEN_TOOLS / tool-yaml)
  if (schema?.properties?.name && schema?.properties?.input_schema) {
    const toolNameMatch = userText.match(/Tool\s*name:\s*([a-zA-Z0-9_-]+)/i) || userText.match(/for\s*["']([a-zA-Z0-9_-]+)["']/i);
    const toolName = toolNameMatch ? toolNameMatch[1] : 'workspace-tool';

    return {
      object: {
        name: toolName,
        description: `Executes ${toolName} operations within the workspace environment.`,
        input_schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The specific command or sub-action to execute.'
            },
            target_path: {
              type: 'string',
              description: 'Target file or directory path relative to workspace root.'
            },
            options: {
              type: 'object',
              description: 'Optional execution parameters and flags.'
            }
          },
          required: ['action']
        }
      }
    };
  }

  // 6. Check for Specific Markdown Files / Fields (SOUL.md, RULES.md, DUTIES.md, PROMPT.md, SKILL.md)
  const spec = synthesizeAgentSpec(userText || 'Specialist Agent', '', targetFramework);

  if (systemText.includes('soul-md') || systemText.includes('SOUL.md') || userText.includes('SOUL.md') || userText.includes('Emotion Matrix')) {
    return { text: spec.soul };
  }

  if (systemText.includes('rules-md') || systemText.includes('RULES.md') || userText.includes('RULES.md')) {
    return { text: spec.rules };
  }

  if (systemText.includes('duties-md') || systemText.includes('DUTIES.md') || userText.includes('DUTIES.md')) {
    return {
      text: `## Core Duties & Responsibilities

### 1. High-Priority Operational Workflow (P0)
- Parse user intents and workspace boundaries before issuing commands.
- Perform automated file validations and schema verification.
- Ensure strict adherence to target framework standards.

### 2. Quality Assurance & Regression Prevention (P1)
- Verify that every synthesized artifact compiles without syntax errors.
- Ensure strict type safety and absence of unverified assumptions.
- Run automated regression and linting suites prior to reporting completion.

### 3. Safety & Human Supervision (P2)
- Enforce human approval gates for irreversible actions.
- Maintain immutable audit logs of tool interactions and decision traces.`
    };
  }

  if (systemText.includes('prompt-md') || systemText.includes('PROMPT.md') || userText.includes('PROMPT.md')) {
    return {
      text: `# System Prompt: ${spec.manifest.name}

You are **${spec.manifest.name}**, an autonomous specialist agent.

## Operational Directives
- **Precision**: Deliver accurate, verified responses and concrete file modifications.
- **Safety**: Never execute unvetted destructive commands or expose sensitive environment data.
- **Structure**: Format outputs with clear markdown structure, code blocks, and execution steps.`
    };
  }

  if (systemText.includes('skill-md') || systemText.includes('SKILL.md') || userText.includes('SKILL.md')) {
    return { text: spec.skills };
  }

  // Single field drafting / improvement (e.g. description, role, etc.)
  if (systemText.includes('field:') || systemText.includes('specifically, you are generating')) {
    if (systemText.includes('name')) return { text: spec.manifest.name };
    if (systemText.includes('description')) return { text: spec.manifest.description };
    if (systemText.includes('soul')) return { text: spec.soul };
    if (systemText.includes('rules')) return { text: spec.rules };
  }

  // Default fallback text response
  return {
    text: `## ${spec.manifest.name} Specification\n\n${spec.manifest.description}\n\n### Primary Instructions\n- Execute workspace tasks with precision and structured audit logging.\n- Validate all inputs against schemas and enforce security boundaries.\n- Adhere to the ${targetFramework} harness conventions.`
  };
}

function extractText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (content.user) return extractText(content.user);
  if (Array.isArray(content)) {
    return content.map(extractText).join(' ');
  }
  if (Array.isArray(content.messages)) {
    return content.messages.map((m: any) => m.content ? extractText(m.content) : '').join(' ');
  }
  if (typeof content === 'object') {
    return JSON.stringify(content);
  }
  return String(content);
}
