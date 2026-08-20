/**
 * High-quality deterministic agent specification synthesizer.
 * Used when cloud LLM providers are unavailable, rate-limited, or when API keys are invalid.
 * Produces structured, fully compliant GitAgent specifications with manifest, soul, rules, and skills.
 */
import { AgentFramework } from '../gitagent/types';
import { inferFrameworkTools } from '../gitagent/contextToolInference';

export interface SynthesizedAgentResult {
  manifest: {
    name: string;
    description: string;
  };
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

  if (lower.includes('research') || lower.includes('pdf') || lower.includes('search') || lower.includes('rag')) {
    domain = 'research-analyst';
    title = 'Deep Research & Document Intelligence Specialist';
    description = 'Analyzes multi-source documents, verifies citations, and produces structured technical research dossiers.';
  } else if (lower.includes('code') || lower.includes('review') || lower.includes('typescript') || lower.includes('react') || lower.includes('git')) {
    domain = 'code-architect-reviewer';
    title = 'Senior Code Architect & Quality Reviewer';
    description = 'Performs rigorous automated code inspections, enforces architectural patterns, and verifies linter standards.';
  } else if (lower.includes('devops') || lower.includes('sre') || lower.includes('incident') || lower.includes('alert') || lower.includes('monitor')) {
    domain = 'devops-sre-incident-handler';
    title = 'DevOps & Site Reliability Engineer';
    description = 'Monitors telemetry alerts, executes diagnostic runbooks, and manages progressive rollouts with approval gates.';
  } else if (lower.includes('data') || lower.includes('sql') || lower.includes('pipeline') || lower.includes('etl')) {
    domain = 'data-engineer-analyst';
    title = 'Data Engineering & Pipeline Specialist';
    description = 'Constructs resilient ETL pipelines, optimizes SQL query plans, and maintains semantic data models.';
  } else if (lower.includes('security') || lower.includes('audit') || lower.includes('auth') || lower.includes('compliance')) {
    domain = 'security-compliance-auditor';
    title = 'Security & Compliance Officer';
    description = 'Audits access controls, scans for vulnerabilities, and validates adherence to SOC2 and ISO compliance frameworks.';
  } else {
    // Generate name from first few words
    const words = cleanPrompt.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).slice(0, 4).filter(Boolean);
    domain = words.join('-').toLowerCase() || 'custom-agent';
    title = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Custom Specialist Agent';
    description = `An autonomous AI specialist engineered to execute: ${cleanPrompt.slice(0, 120)}.`;
  }

  // Sanitize kebab-case name
  const name = domain.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Automatically infer framework tools for primary skills
  const coreSkillInference = inferFrameworkTools({
    name: `${name}-core-operations`,
    description: `Executes the primary domain tasks: ${description}`,
    category: 'code',
    targetFramework: framework
  });

  const auditSkillInference = inferFrameworkTools({
    name: `${name}-verification-audit`,
    description: 'Inspects output consistency, checks syntax, and executes validation tests.',
    category: 'compliance',
    targetFramework: framework
  });

  const coreToolsStr = coreSkillInference.tools.map(t => `\`${t}\``).join(', ');
  const auditToolsStr = auditSkillInference.tools.map(t => `\`${t}\``).join(', ');

  const soul = `## Core Identity
You are **${title}**, an autonomous AI specialist purpose-built to execute high-precision workflows based on user specifications: "${cleanPrompt}".

## Communication Style
- **Clarity & Precision**: Communicate with technical rigor, direct summaries, and actionable steps.
- **Evidence-Based**: Cite specific files, lines, and operational metrics for every claim.
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

## Must Never
- Expose private credentials, API keys, or sensitive environment tokens in logs or outputs.
- Execute destructive operations without user consent or validated rollback mechanisms.
- Hallucinate dependencies or fabricate file paths not present in the workspace.

## Output Constraints
- Code blocks must contain complete, valid, non-truncated implementations.
- Configuration files must strictly adhere to JSON or YAML formatting standards.
- Responses must remain concise, scannable, and free of conversational fluff.

## Interaction Boundaries
- Operate within the declared tool permissions and context limits.
- Delegate sub-tasks to specialized companion agents when operations exceed primary domain scope.`;

  const skills = `## Skill: Core Operations & Workflow Execution
- **Description**: Executes primary domain operations, inspects workspace context, and executes targeted actions.
- **Allowed Tools**: ${coreToolsStr}
- **Preconditions**: Target files and inputs must be validated.

## Skill: Verification & Diagnostic Audit
- **Description**: Inspects output consistency, checks syntax, and executes validation test suites.
- **Allowed Tools**: ${auditToolsStr}
- **Postconditions**: Produces a structured pass/fail audit report with remedial suggestions.`;

  const explanation = `Configured complete agent workspace "${name}" (${title}) for harness "${framework}". Allowed tools for all generated skills have been contextually aligned with the framework matrix.`;

  return {
    manifest: {
      name,
      description
    },
    soul,
    rules,
    skills,
    explanation
  };
}
