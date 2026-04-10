import { AgentManifestSchema } from '../gitagent/schemas';
import { assembleSoul } from '../gitagent/assembleSystemPrompt';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateWizardState(state: any): ValidationResult {
  const errors: Record<string, string> = {};

  // Pass 1: agent.yaml (manifest)
  const manifestResult = AgentManifestSchema.safeParse(state.manifest);
  if (!manifestResult.success) {
    manifestResult.error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      // Map Zod error to human readable message if needed, or use issue.message
      errors[`manifest.${path}`] = issue.message;
    });
  }

  // Pass 2: SOUL.md non-empty
  const soulContent = assembleSoul(state);
  if (!soulContent || soulContent.trim().length === 0) {
    errors['core-identity'] = 'Core Identity or other SOUL sections must be provided';
  }

  // Pass 3: Skills
  if (state.skillsList && Array.isArray(state.skillsList)) {
    state.skillsList.forEach((skill: any, index: number) => {
      if (!skill.name) {
        errors[`skillsList.${index}.name`] = 'Skill name is required';
      } else if (!/^[a-z][a-z0-9-]*$/.test(skill.name)) {
        errors[`skillsList.${index}.name`] = 'Skill name must be kebab-case';
      }
      if (!skill.description || skill.description.trim().length === 0) {
        errors[`skillsList.${index}.description`] = 'Skill description is required';
      }
    });
  }

  // Pass 4: Compliance (full only)
  if (state.selectedTemplate === 'full' && state.complianceConfig) {
    const { risk_tier, supervision, recordkeeping } = state.complianceConfig;
    if (risk_tier === 'high' || risk_tier === 'critical') {
      if (supervision?.human_in_the_loop !== 'always') {
        errors['complianceConfig.supervision.human_in_the_loop'] = 'High risk requires "always" human-in-the-loop';
      }
      if (!recordkeeping?.audit_logging) {
        errors['complianceConfig.recordkeeping.audit_logging'] = 'High risk requires audit logging enabled';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
