import { AgentWorkspace, ValidationResult, ValidationError, ValidationWarning } from '../gitagent/types';
import { AgentManifestSchema } from '../gitagent/schemas';

export function validateWorkspace(workspace: AgentWorkspace): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── 1. agent.yaml schema validation ────────────────────────────────────────
  const manifestResult = AgentManifestSchema.safeParse(workspace.manifest);
  if (!manifestResult.success) {
    manifestResult.error.issues.forEach(issue => {
      errors.push({
        file: 'agent.yaml',
        field: issue.path.join('.'),
        message: `${issue.path.join('.')}: ${issue.message}`,
      });
    });
  }

  // ── 2. Compliance structure check ──────────────────────────────────────────
  const compliance = workspace.manifest.compliance;
  const riskTier = compliance?.risk_tier;

  if (riskTier === 'high' || riskTier === 'critical') {
    if (!compliance?.supervision) {
      errors.push({
        file: 'agent.yaml',
        field: 'compliance.supervision',
        message: 'compliance.supervision is required for high/critical risk_tier',
      });
    }
    if (!compliance?.recordkeeping) {
      errors.push({
        file: 'agent.yaml',
        field: 'compliance.recordkeeping',
        message: 'compliance.recordkeeping is required for high/critical risk_tier',
      });
    }
    // Detect the specific nesting bug: recordkeeping inside supervision
    const sup = compliance?.supervision as any;
    if (sup?.recordkeeping) {
      errors.push({
        file: 'agent.yaml',
        field: 'compliance.supervision.recordkeeping',
        message: 'recordkeeping must be at compliance.recordkeeping — not nested inside compliance.supervision',
      });
    }
    if (!workspace.duties) {
      warnings.push({
        file: 'DUTIES.md',
        message: 'DUTIES.md is recommended for high/critical risk_tier agents',
      });
    }
  }

  // ── 3. Skills ──────────────────────────────────────────────────────────────
  const declaredSkills = workspace.manifest.skills || [];

  for (const skillName of declaredSkills) {
    if (!workspace.skills[skillName]) {
      errors.push({
        file: `skills/${skillName}/SKILL.md`,
        message: `Skill "${skillName}" declared in agent.yaml but not generated`,
      });
      continue;
    }
    if (!/^[a-z][a-z0-9-]*$/.test(skillName)) {
      errors.push({
        file: `skills/${skillName}/SKILL.md`,
        message: `Skill name "${skillName}" must be kebab-case`,
      });
    }
    const skill = workspace.skills[skillName];
    if (!skill.description) {
      errors.push({
        file: `skills/${skillName}/SKILL.md`,
        message: `Skill "${skillName}" is missing description`,
      });
    }
    if (!skill.instructions?.trim()) {
      warnings.push({
        file: `skills/${skillName}/SKILL.md`,
        message: `Skill "${skillName}" has empty instructions body`,
      });
    }
  }

  for (const skillName of Object.keys(workspace.skills)) {
    if (!declaredSkills.includes(skillName)) {
      warnings.push({
        file: `skills/${skillName}/SKILL.md`,
        message: `Skill "${skillName}" exists in workspace but not declared in agent.yaml skills[]`,
      });
    }
  }

  // ── 4. Tools ───────────────────────────────────────────────────────────────
  const declaredTools = workspace.manifest.tools || [];

  for (const toolName of declaredTools) {
    if (!workspace.tools[toolName]) {
      errors.push({
        file: `tools/${toolName}.yaml`,
        message: `Tool "${toolName}" declared in agent.yaml but not generated — tools/${toolName}.yaml will be missing`,
      });
      continue;
    }
    if (!/^[a-z][a-z0-9-]*$/.test(toolName)) {
      errors.push({
        file: `tools/${toolName}.yaml`,
        message: `Tool name "${toolName}" must be kebab-case`,
      });
    }
    const tool = workspace.tools[toolName];
    if (!tool.input_schema) {
      errors.push({
        file: `tools/${toolName}.yaml`,
        message: `Tool "${toolName}" missing input_schema (MCP-compatible structure required)`,
      });
    } else if (tool.input_schema.type !== 'object') {
      errors.push({
        file: `tools/${toolName}.yaml`,
        message: `Tool "${toolName}" input_schema.type must be "object"`,
      });
    }
    if (!tool.description) {
      warnings.push({
        file: `tools/${toolName}.yaml`,
        message: `Tool "${toolName}" is missing description`,
      });
    }
  }

  for (const toolName of Object.keys(workspace.tools)) {
    if (!declaredTools.includes(toolName)) {
      warnings.push({
        file: `tools/${toolName}.yaml`,
        message: `Tool "${toolName}" in workspace but not declared in agent.yaml tools[]`,
      });
    }
  }

  // ── 5. Required files ───────────────────────────────────────────────────────
  if (!workspace.soul) {
    errors.push({ file: 'SOUL.md', message: 'SOUL.md is required but not generated' });
  }

  // ── 6. Sub-agents ──────────────────────────────────────────────────────────
  for (const subName of Object.keys(workspace.manifest.agents || {})) {
    if (!workspace.subAgents[subName]) {
      warnings.push({
        file: `agents/${subName}/`,
        message: `Sub-agent "${subName}" declared in agent.yaml but not generated`,
      });
    }
  }

  // ── 7. Name/version format ─────────────────────────────────────────────────
  const { name, version } = workspace.manifest;
  if (name && !/^[a-z][a-z0-9-]*$/.test(name)) {
    errors.push({
      file: 'agent.yaml',
      field: 'name',
      message: `Name "${name}" must be kebab-case`,
    });
  }
  if (version && !/^\d+\.\d+\.\d+/.test(version)) {
    errors.push({
      file: 'agent.yaml',
      field: 'version',
      message: `Version "${version}" must be semver`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
