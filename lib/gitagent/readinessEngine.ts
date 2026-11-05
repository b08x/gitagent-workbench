import { AgentWorkspace } from './types';
import { validateWorkspace } from '../generation/validator';
import { auditToolMappings } from './toolVerification';
import { AGENT_FRAMEWORK_OPTIONS } from './constants';

export interface SharedValidationDiagnostic {
  id: string;
  category: 'schema' | 'name' | 'reference' | 'tool_compatibility' | 'slot' | 'test';
  severity: 'error' | 'warning' | 'info';
  file: string;
  field?: string;
  message: string;
  actionLabel?: string;
  repairAction?: 'kebab_case' | 'remove_tool' | 'navigate_step';
  stepTarget?: 'runtime' | 'identity' | 'capabilities' | 'model' | 'synthesize' | 'review';
  repairPayload?: any;
}

export interface SharedReadinessResult {
  revisionId: string;
  evaluatedAt: number;

  // 1. Draft completeness: required fields present
  completeness: {
    percentage: number;
    metCount: number;
    totalCount: number;
    slots: Array<{ id: string; label: string; met: boolean; step: string }>;
    isComplete: boolean;
  };

  // 2. Specification validity: schema, names, references, diagnostics
  validity: {
    isValid: boolean;
    errorsCount: number;
    warningsCount: number;
    diagnostics: SharedValidationDiagnostic[];
  };

  // 3. Runtime Compatibility: assigned tools and target runtime constraints
  compatibility: {
    isCompatible: boolean;
    harnessId: string;
    harnessLabel: string;
    verifiedToolsCount: number;
    unmappedToolsCount: number;
    unmappedTools: string[];
    diagnostics: SharedValidationDiagnostic[];
  };

  // 4. Test readiness and freshness status
  testing: {
    isReadyToTest: boolean;
    reasonsNotReady: string[];
    testStatus: 'not_run' | 'passed' | 'failed' | 'stale';
    isStale: boolean;
    testedRevision?: string;
    testedModel?: string;
    effectiveTestModel?: string;
    evalsCount: number;
    summary: string;
  };

  // Aggregated export gates
  isExportReady: boolean;
  blockingExportReasons: string[];
  allDiagnostics: SharedValidationDiagnostic[];
}

/**
 * Suggests an exact clean kebab-case name for a string.
 */
export function suggestKebabCase(input: string): string {
  if (!input) return 'custom-agent';
  let clean = input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!clean || !/^[a-z]/.test(clean)) {
    clean = `agent-${clean || 'app'}`;
  }
  return clean;
}

/**
 * Comprehensive shared validation and readiness evaluator.
 * Single source of truth for inspector, header badges, step navigation, test lab, and export.
 */
export function evaluateSharedReadiness(
  workspace: any,
  options?: {
    effectiveTestModel?: string;
    lastTestedRevision?: string;
    lastTestedModel?: string;
  }
): SharedReadinessResult {
  const revisionId = workspace.git?.head || workspace.git?.commits?.[0]?.hash || 'rev-baseline';
  const evaluatedAt = Date.now();
  const allDiagnostics: SharedValidationDiagnostic[] = [];

  // ── 1. Draft Completeness ──────────────────────────────────────────────────
  const isAgentNameValid = !!(workspace.manifest?.name && /^[a-z][a-z0-9-]*$/.test(workspace.manifest.name));
  const hasDescription = !!(workspace.manifest?.description && workspace.manifest.description.trim().length > 0);
  const hasSoul = !!(workspace.soul && workspace.soul.trim().length > 0);
  const hasRules = !!(workspace.rules && workspace.rules.trim().length > 0);
  const hasSkills = (workspace.skillsList?.length || 0) > 0 || Object.keys(workspace.skills || {}).length > 0;

  const slots = [
    { id: 'target-runtime', label: 'Target Runtime', met: !!workspace.targetFramework, step: 'runtime' },
    { id: 'name', label: 'Agent Name', met: isAgentNameValid, step: 'identity' },
    { id: 'description', label: 'Purpose Description', met: hasDescription, step: 'identity' },
    { id: 'soul', label: 'Identity & SOUL.md', met: hasSoul, step: 'identity' },
    { id: 'rules', label: 'Rules & Guardrails', met: hasRules, step: 'model' },
    { id: 'skills', label: 'Skills & Tools', met: hasSkills, step: 'capabilities' },
  ];

  const metCount = slots.filter(s => s.met).length;
  const totalCount = slots.length;
  const completenessPercentage = Math.round((metCount / totalCount) * 100);
  const isComplete = completenessPercentage === 100;

  // ── 2. Specification Validity ──────────────────────────────────────────────
  const baseValidation = validateWorkspace(workspace as AgentWorkspace);
  const validityDiagnostics: SharedValidationDiagnostic[] = [];

  // Check agent name kebab-case
  if (workspace.manifest?.name && !/^[a-z][a-z0-9-]*$/.test(workspace.manifest.name)) {
    const suggested = suggestKebabCase(workspace.manifest.name);
    validityDiagnostics.push({
      id: 'agent-name-kebab',
      category: 'name',
      severity: 'error',
      file: 'agent.yaml',
      field: 'name',
      message: `Agent name "${workspace.manifest.name}" must be lowercase kebab-case (suggested: "${suggested}")`,
      actionLabel: `Rename to "${suggested}"`,
      repairAction: 'kebab_case',
      stepTarget: 'identity',
      repairPayload: { type: 'agent_name', target: suggested }
    });
  }

  // Check skillsList kebab-case and missing instructions
  const skillsList = workspace.skillsList || [];
  const seenSkillNames = new Set<string>();

  for (let i = 0; i < skillsList.length; i++) {
    const skill = skillsList[i];
    const skillName = skill.name || `skill-${i + 1}`;
    
    // Check kebab-case
    if (!/^[a-z][a-z0-9-]*$/.test(skillName)) {
      const suggested = suggestKebabCase(skillName);
      validityDiagnostics.push({
        id: `skill-name-kebab-${i}`,
        category: 'name',
        severity: 'error',
        file: `skills/${skillName}/SKILL.md`,
        field: `skillsList.${i}.name`,
        message: `Skill name "${skillName}" is not kebab-case (suggested: "${suggested}")`,
        actionLabel: `Fix name to "${suggested}"`,
        repairAction: 'kebab_case',
        stepTarget: 'capabilities',
        repairPayload: { type: 'skill_name', index: i, oldName: skillName, target: suggested }
      });
    }

    // Check collision
    if (seenSkillNames.has(skillName.toLowerCase())) {
      validityDiagnostics.push({
        id: `skill-name-duplicate-${i}`,
        category: 'name',
        severity: 'error',
        file: `skills/${skillName}/SKILL.md`,
        field: `skillsList.${i}.name`,
        message: `Duplicate skill name "${skillName}" detected in workspace`,
        stepTarget: 'capabilities'
      });
    }
    seenSkillNames.add(skillName.toLowerCase());

    // Check missing description
    if (!skill.description || !skill.description.trim()) {
      validityDiagnostics.push({
        id: `skill-desc-missing-${i}`,
        category: 'schema',
        severity: 'warning',
        file: `skills/${skillName}/SKILL.md`,
        field: `skillsList.${i}.description`,
        message: `Skill "${skillName}" is missing an operational description`,
        stepTarget: 'capabilities'
      });
    }
  }

  // Merge validator.ts issues
  for (const err of baseValidation.errors) {
    if (!validityDiagnostics.some(d => d.file === err.file && d.message === err.message)) {
      validityDiagnostics.push({
        id: `val-err-${err.file}-${err.field || 'gen'}`,
        category: err.file.includes('skills/') ? 'reference' : 'schema',
        severity: 'error',
        file: err.file,
        field: err.field,
        message: err.message,
        stepTarget: err.file.includes('skills') ? 'capabilities' : err.file.includes('SOUL') ? 'identity' : 'review'
      });
    }
  }

  for (const warn of baseValidation.warnings) {
    if (!validityDiagnostics.some(d => d.file === warn.file && d.message === warn.message)) {
      validityDiagnostics.push({
        id: `val-warn-${warn.file}-${warn.field || 'gen'}`,
        category: 'schema',
        severity: 'warning',
        file: warn.file,
        field: warn.field,
        message: warn.message,
        stepTarget: warn.file.includes('skills') ? 'capabilities' : 'review'
      });
    }
  }

  // ── 3. Runtime Compatibility Audit ─────────────────────────────────────────
  const targetFramework = workspace.targetFramework || 'hermes_agent';
  const toolAudit = auditToolMappings(workspace, targetFramework);
  const compatibilityDiagnostics: SharedValidationDiagnostic[] = [];

  for (const unmapped of toolAudit.unmappedClaims) {
    compatibilityDiagnostics.push({
      id: `tool-unmapped-${unmapped.claim}-${unmapped.sourceSkill || 'skill'}`,
      category: 'tool_compatibility',
      severity: 'error',
      file: unmapped.sourceSkill ? `skills/${unmapped.sourceSkill}/SKILL.md` : 'agent.yaml',
      field: 'allowedTools',
      message: `Tool claim "${unmapped.claim}" in skill "${unmapped.sourceSkill || 'unknown'}" is unavailable in target harness "${toolAudit.frameworkLabel}"`,
      actionLabel: `Remove "${unmapped.claim}"`,
      repairAction: 'remove_tool',
      stepTarget: 'capabilities',
      repairPayload: { toolName: unmapped.claim, skillName: unmapped.sourceSkill }
    });
  }

  allDiagnostics.push(...validityDiagnostics, ...compatibilityDiagnostics);

  const errorsCount = allDiagnostics.filter(d => d.severity === 'error').length;
  const warningsCount = allDiagnostics.filter(d => d.severity === 'warning').length;
  const isValid = validityDiagnostics.filter(d => d.severity === 'error').length === 0;
  const isCompatible = toolAudit.unmappedCount === 0;

  // ── 4. Test Readiness & Freshness ──────────────────────────────────────────
  const evalsCount = workspace.evals?.goodOutputs?.length || 0;
  const effectiveModel = options?.effectiveTestModel || workspace.runtimeProviderId || 'default-model';
  const lastTestedRevision = options?.lastTestedRevision;
  const lastTestedModel = options?.lastTestedModel;

  const reasonsNotReady: string[] = [];
  if (!workspace.soul) reasonsNotReady.push('SOUL.md must be configured before testing');
  if (errorsCount > 0) reasonsNotReady.push(`${errorsCount} validation/naming error(s) must be resolved`);
  if (!isCompatible) reasonsNotReady.push(`${toolAudit.unmappedCount} tool claim(s) cannot be run in this harness`);
  if (!workspace.git?.commits?.length) reasonsNotReady.push('At least one committed baseline revision is required');

  const isReadyToTest = reasonsNotReady.length === 0;

  // Evaluate test status & freshness
  let testStatus: 'not_run' | 'passed' | 'failed' | 'stale' = 'not_run';
  let isStale = false;
  let testSummary = 'Untested';

  if (evalsCount > 0) {
    if (lastTestedRevision && lastTestedRevision !== revisionId) {
      testStatus = 'stale';
      isStale = true;
      testSummary = `Stale test results (evaluated on ${lastTestedRevision.slice(0, 7)}, current revision is ${revisionId.slice(0, 7)})`;
    } else if (lastTestedModel && effectiveModel && lastTestedModel !== effectiveModel) {
      testStatus = 'stale';
      isStale = true;
      testSummary = `Stale test results (evaluated with ${lastTestedModel}, current model is ${effectiveModel})`;
    } else {
      testStatus = 'passed';
      testSummary = `Verified (${evalsCount} passing eval${evalsCount === 1 ? '' : 's'}) on rev-${revisionId.slice(0, 7)}`;
    }
  } else {
    testSummary = isReadyToTest ? 'Ready to test in Lab' : 'Pre-test checks pending';
  }

  // ── 5. Export Gates ────────────────────────────────────────────────────────
  const blockingExportReasons: string[] = [];
  if (!isAgentNameValid) {
    blockingExportReasons.push(`Invalid agent name "${workspace.manifest?.name || 'untitled'}": must be lowercase kebab-case`);
  }
  if (!hasSoul) {
    blockingExportReasons.push('SOUL.md is required for export');
  }
  for (const diag of validityDiagnostics) {
    if (diag.severity === 'error') {
      blockingExportReasons.push(`${diag.file}: ${diag.message}`);
    }
  }
  for (const diag of compatibilityDiagnostics) {
    if (diag.severity === 'error') {
      blockingExportReasons.push(`Harness incompatibility: ${diag.message}`);
    }
  }

  const isExportReady = blockingExportReasons.length === 0;

  return {
    revisionId,
    evaluatedAt,
    completeness: {
      percentage: completenessPercentage,
      metCount,
      totalCount,
      slots,
      isComplete,
    },
    validity: {
      isValid,
      errorsCount: validityDiagnostics.filter(d => d.severity === 'error').length,
      warningsCount: validityDiagnostics.filter(d => d.severity === 'warning').length,
      diagnostics: validityDiagnostics,
    },
    compatibility: {
      isCompatible,
      harnessId: targetFramework,
      harnessLabel: toolAudit.frameworkLabel,
      verifiedToolsCount: toolAudit.verifiedCount,
      unmappedToolsCount: toolAudit.unmappedCount,
      unmappedTools: toolAudit.unmappedClaims.map(c => c.claim),
      diagnostics: compatibilityDiagnostics,
    },
    testing: {
      isReadyToTest,
      reasonsNotReady,
      testStatus,
      isStale,
      testedRevision: lastTestedRevision,
      testedModel: lastTestedModel,
      effectiveTestModel: effectiveModel,
      evalsCount,
      summary: testSummary,
    },
    isExportReady,
    blockingExportReasons,
    allDiagnostics,
  };
}

/**
 * Repairs a skill name to kebab-case consistently across workspace.
 */
export function repairSkillKebabCase(workspace: any, oldName: string, newName?: string): any {
  const targetName = newName || suggestKebabCase(oldName);
  const nextWorkspace = JSON.parse(JSON.stringify(workspace));

  // 1. Update skillsList
  if (Array.isArray(nextWorkspace.skillsList)) {
    nextWorkspace.skillsList = nextWorkspace.skillsList.map((s: any) => {
      if (s.name === oldName) return { ...s, name: targetName };
      return s;
    });
  }

  // 2. Update manifest.skills
  if (Array.isArray(nextWorkspace.manifest?.skills)) {
    nextWorkspace.manifest.skills = nextWorkspace.manifest.skills.map((s: string) => {
      if (s === oldName) return targetName;
      return s;
    });
  }

  // 3. Update parsed skills dictionary
  if (nextWorkspace.skills && nextWorkspace.skills[oldName]) {
    const skillData = nextWorkspace.skills[oldName];
    delete nextWorkspace.skills[oldName];
    nextWorkspace.skills[targetName] = {
      ...skillData,
      name: targetName,
    };
  }

  return nextWorkspace;
}

/**
 * Removes an unsupported tool claim from a specific skill or across workspace.
 */
export function repairRemoveUnsupportedTool(workspace: any, toolName: string, skillName?: string): any {
  const nextWorkspace = JSON.parse(JSON.stringify(workspace));
  const targetLower = toolName.toLowerCase();

  // Update skillsList
  if (Array.isArray(nextWorkspace.skillsList)) {
    nextWorkspace.skillsList = nextWorkspace.skillsList.map((s: any) => {
      if (!skillName || s.name === skillName) {
        if (typeof s.allowedTools === 'string') {
          const filtered = s.allowedTools
            .split(/\s+/)
            .filter((t: string) => t.toLowerCase() !== targetLower && t.replace(/[`"]/g, '').toLowerCase() !== targetLower);
          return { ...s, allowedTools: filtered.join(' ') };
        } else if (Array.isArray(s.allowedTools)) {
          const filtered = s.allowedTools.filter((t: any) => String(t).toLowerCase() !== targetLower);
          return { ...s, allowedTools: filtered };
        }
      }
      return s;
    });
  }

  // Update manifest.tools
  if (Array.isArray(nextWorkspace.manifest?.tools)) {
    nextWorkspace.manifest.tools = nextWorkspace.manifest.tools.filter(
      (t: string) => t.toLowerCase() !== targetLower
    );
  }

  return nextWorkspace;
}
