import { AgentWorkspace, ValidationResult, ValidationError, ValidationWarning } from '../gitagent/types';
import { AgentManifestSchema } from '../gitagent/schemas';

export function validateWorkspace(workspace: AgentWorkspace): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Validate agent.yaml
  const manifestResult = AgentManifestSchema.safeParse(workspace.manifest);
  if (!manifestResult.success) {
    manifestResult.error.issues.forEach(err => {
      errors.push({
        file: 'agent.yaml',
        message: `${err.path.join('.')}: ${err.message}`
      });
    });
  }

  // 2. Compliance rules
  const riskTier = workspace.manifest.compliance?.risk_tier;
  if (riskTier === 'high' || riskTier === 'critical') {
    if (!workspace.manifest.compliance?.supervision) {
      errors.push({
        file: 'agent.yaml',
        message: 'Compliance supervision block is required for high/critical risk tiers'
      });
    }
    if (!workspace.duties) {
      warnings.push({
        file: 'DUTIES.md',
        message: 'DUTIES.md is recommended for high/critical risk tiers'
      });
    }
  }

  // 3. Skills uniqueness and naming
  const skillNames = new Set<string>();
  Object.keys(workspace.skills).forEach(name => {
    if (skillNames.has(name)) {
      errors.push({ file: `skills/${name}`, message: `Duplicate skill name: ${name}` });
    }
    skillNames.add(name);
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      errors.push({ file: `skills/${name}`, message: `Skill name ${name} must be kebab-case` });
    }
  });

  // 4. Tools uniqueness and naming
  const toolNames = new Set<string>();
  Object.keys(workspace.tools).forEach(name => {
    if (toolNames.has(name)) {
      errors.push({ file: `tools/${name}.yaml`, message: `Duplicate tool name: ${name}` });
    }
    toolNames.add(name);
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      errors.push({ file: `tools/${name}.yaml`, message: `Tool name ${name} must be kebab-case` });
    }
  });

  // 5. Sub-agents consistency
  const declaredSubAgents = workspace.manifest.dependencies || [];
  Object.keys(workspace.subAgents).forEach(name => {
    // In gitagent, sub-agents might be in agents/ directory
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
