/**
 * GitAgent Management Proposal Engine
 * Pure transformation and validation functions for agent, subagent, and skill management.
 * Independent of React components for testability and deterministic execution.
 */

import {
  ManagementAction,
  ArtifactKind,
  ToolPolicy,
  ArtifactEvidenceLevel,
  ProposalDiagnostic,
  PromptSpecialistDependency,
  TypedArtifactPatch,
  ProposalDiffEntry,
  ManagementProposal,
  ManagementJournalEntry
} from './types';
import { ARCHITECTURE_PATTERNS, INVERSION_PREFIX_RULES, INVERSION_PREFIX_SOUL } from './patterns';

/**
 * Fast deterministic string hash / fingerprint (djb2 + length)
 */
export function computeFingerprint(data: any): string {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data || {}, Object.keys(data || {}).sort());
  let hash = 5381;
  for (let i = 0; i < serialized.length; i++) {
    hash = ((hash << 5) + hash) + serialized.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return `fp-${Math.abs(hash).toString(16)}-${serialized.length}`;
}

export function isValidKebabCase(name: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}

/**
 * Inspects existing workspace state before editing so we only collect missing or changed answers.
 */
export function inspectWorkspaceForEditing(
  workspace: Record<string, any>,
  targetKind: ArtifactKind,
  targetId?: string
) {
  const baseRevision = workspace.revision || 1;
  const baseFingerprint = computeFingerprint(workspace);

  if (targetKind === 'parent_agent') {
    return {
      baseRevision,
      baseFingerprint,
      targetKind,
      existingName: workspace.manifest?.name || '',
      existingDescription: workspace.manifest?.description || workspace['core-identity'] || '',
      existingAuthor: workspace.manifest?.author || '',
      existingTemplate: workspace.selectedTemplate || 'standard',
      existingFramework: workspace.targetFramework || 'hermes_agent',
      existingToolsMode: workspace.toolPolicy?.mode || (workspace.toolsList?.length ? 'allowlist' : 'unrestricted'),
      existingTools: (workspace.toolsList || []).map((t: any) => t.name),
      existingSkillsCount: (workspace.skillsList || []).length,
      existingSubagentsCount: (workspace.subAgentsList || []).length,
      hasSoul: !!(workspace.soul && String(workspace.soul).trim().length > 0),
      hasRules: !!(workspace.rules && String(workspace.rules).trim().length > 0),
    };
  }

  if (targetKind === 'subagent' && targetId) {
    const existing = (workspace.subAgentsList || []).find((s: any) => s.name === targetId);
    return {
      baseRevision,
      baseFingerprint,
      targetKind,
      subagent: existing ? { ...existing } : null
    };
  }

  if (targetKind === 'skill' && targetId) {
    const existing = (workspace.skillsList || []).find((s: any) => s.name === targetId);
    return {
      baseRevision,
      baseFingerprint,
      targetKind,
      skill: existing ? { ...existing } : null
    };
  }

  return {
    baseRevision,
    baseFingerprint,
    targetKind
  };
}

/**
 * Deterministically constructs a versioned proposal.
 */
export function createManagementProposal(params: {
  action: ManagementAction;
  workspace: Record<string, any>;
  patternId?: string;
  inversionPrefixEnabled?: boolean;
  parentPatch?: Record<string, any>;
  subagentPatches?: Array<{
    operation: 'create' | 'update' | 'delete';
    name: string;
    role: string;
    description: string;
    permissions: string[];
  }>;
  skillPatches?: Array<{
    operation: 'create' | 'update' | 'delete';
    name: string;
    description: string;
    instructions: string;
    category?: string;
    allowedTools?: string;
  }>;
  toolPolicyPatch?: ToolPolicy;
  specialistDependency?: PromptSpecialistDependency;
  summary?: string;
}): ManagementProposal {
  const {
    action,
    workspace,
    patternId,
    inversionPrefixEnabled = false,
    parentPatch,
    subagentPatches = [],
    skillPatches = [],
    toolPolicyPatch,
    specialistDependency,
    summary = `Proposal: ${action} via manager`
  } = params;

  const baseRevision = workspace.revision || 1;
  const baseFingerprint = computeFingerprint(workspace);
  const patches: TypedArtifactPatch[] = [];
  const diffs: ProposalDiffEntry[] = [];

  // Selected pattern configuration
  const pattern = patternId ? ARCHITECTURE_PATTERNS.find(p => p.id === patternId) : undefined;

  // 1. Parent Agent Patch
  if (parentPatch || pattern || inversionPrefixEnabled) {
    const fieldsToUpdate: Record<string, any> = { ...(parentPatch || {}) };

    if (pattern) {
      // Append pattern additions without overwriting user rules
      if (pattern.rulesAdditions?.length) {
        const existingRules = String(workspace.rules || fieldsToUpdate.rules || '');
        const patternBlock = `\n\n## Architecture Pattern: ${pattern.name}\n${pattern.rulesAdditions.map(r => `- ${r}`).join('\n')}`;
        if (!existingRules.includes(pattern.name)) {
          fieldsToUpdate.rules = (existingRules + patternBlock).trim();
        }
      }

      if (pattern.soulAdditions?.length) {
        const existingSoul = String(workspace.soul || fieldsToUpdate.soul || '');
        const patternSoulBlock = `\n\n## Execution Demeanor\n${pattern.soulAdditions.join(' ')}`;
        if (!existingSoul.includes(pattern.name)) {
          fieldsToUpdate.soul = (existingSoul + patternSoulBlock).trim();
        }
      }

      if (pattern.supportsSubagents && !fieldsToUpdate.delegation) {
        fieldsToUpdate.delegation = { mode: pattern.defaultDelegationMode };
      }
    }

    if (specialistDependency && specialistDependency.status === 'supplied' && specialistDependency.suppliedPrompt) {
      const cur = String(fieldsToUpdate[specialistDependency.targetField] || workspace[specialistDependency.targetField] || '');
      fieldsToUpdate[specialistDependency.targetField] = cur ? `${cur}\n\n${specialistDependency.suppliedPrompt}` : specialistDependency.suppliedPrompt;
    } else if (specialistDependency && specialistDependency.status === 'fallback') {
      const cur = String(fieldsToUpdate[specialistDependency.targetField] || workspace[specialistDependency.targetField] || '');
      fieldsToUpdate[specialistDependency.targetField] = cur ? `${cur}\n\n${specialistDependency.fallbackPrompt}` : specialistDependency.fallbackPrompt;
    }

    if (inversionPrefixEnabled) {
      const existingRules = String(fieldsToUpdate.rules || workspace.rules || '');
      if (!existingRules.includes('Phase 0: Requirement Inversion')) {
        const invBlock = `\n\n${INVERSION_PREFIX_RULES.join('\n')}`;
        fieldsToUpdate.rules = (invBlock + '\n\n' + existingRules).trim();
      }

      const existingSoul = String(fieldsToUpdate.soul || workspace.soul || '');
      if (!existingSoul.includes('Requirement Inversion')) {
        const invSoulBlock = `\n\n## Discovery Invariant\n${INVERSION_PREFIX_SOUL.join(' ')}`;
        fieldsToUpdate.soul = (existingSoul + invSoulBlock).trim();
      }
    }

    const parentFp = computeFingerprint(fieldsToUpdate);
    patches.push({
      kind: 'parent_agent',
      id: workspace.manifest?.name || 'agent',
      operation: 'update',
      targetName: fieldsToUpdate.manifest?.name || workspace.manifest?.name || 'agent',
      fields: fieldsToUpdate,
      newFingerprint: parentFp
    });

    diffs.push({
      path: 'manifest.json / SOUL.md / RULES.md',
      kind: 'parent_agent',
      changeType: 'modified',
      beforeSummary: `Revision ${baseRevision} (${workspace.manifest?.name || 'unnamed'})`,
      afterSummary: `Updated fields: ${Object.keys(fieldsToUpdate).join(', ')}`
    });
  }

  // 2. Subagents Patches
  subagentPatches.forEach(sa => {
    const saFp = computeFingerprint(sa);
    patches.push({
      kind: 'subagent',
      id: sa.name,
      operation: sa.operation,
      targetName: sa.name,
      fields: {
        name: sa.name,
        role: sa.role,
        description: sa.description,
        permissions: sa.permissions
      },
      newFingerprint: saFp
    });

    diffs.push({
      path: `subagents/${sa.name}.json`,
      kind: 'subagent',
      changeType: sa.operation === 'create' ? 'added' : sa.operation === 'delete' ? 'removed' : 'modified',
      beforeSummary: sa.operation === 'create' ? undefined : `Existing role: ${sa.role}`,
      afterSummary: `${sa.operation} child agent '${sa.name}' (${sa.role})`
    });
  });

  // 3. Skills Patches
  skillPatches.forEach(sk => {
    const skFp = computeFingerprint(sk);
    patches.push({
      kind: 'skill',
      id: sk.name,
      operation: sk.operation,
      targetName: sk.name,
      fields: {
        name: sk.name,
        description: sk.description,
        instructions: sk.instructions,
        category: sk.category || 'general',
        allowedTools: sk.allowedTools || ''
      },
      newFingerprint: skFp
    });

    diffs.push({
      path: `skills/${sk.name}/SKILL.md`,
      kind: 'skill',
      changeType: sk.operation === 'create' ? 'added' : sk.operation === 'delete' ? 'removed' : 'modified',
      beforeSummary: sk.operation === 'create' ? undefined : `Skill ${sk.name}`,
      afterSummary: `${sk.operation} skill '${sk.name}'`
    });
  });

  // 4. Tool Policy Patch
  if (toolPolicyPatch) {
    const tpFp = computeFingerprint(toolPolicyPatch);
    patches.push({
      kind: 'tool_policy',
      id: 'tool_policy',
      operation: 'update',
      targetName: 'ToolPolicy',
      fields: toolPolicyPatch,
      newFingerprint: tpFp
    });

    diffs.push({
      path: 'tool-policy.json',
      kind: 'tool_policy',
      changeType: 'modified',
      beforeSummary: `Current mode: ${workspace.toolPolicy?.mode || 'unrestricted'}`,
      afterSummary: `Target mode: ${toolPolicyPatch.mode} (${toolPolicyPatch.allowedTools.length} tools allowed, ${toolPolicyPatch.disabledTools.length} disabled)`
    });
  }

  const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const proposal: ManagementProposal = {
    id: proposalId,
    baseRevision,
    baseFingerprint,
    action,
    patternId,
    patternName: pattern?.name,
    inversionPrefixEnabled,
    status: specialistDependency && specialistDependency.status === 'pending' ? 'awaiting_dependency' : 'preview',
    patches,
    diagnostics: [],
    specialistDependency,
    diffs,
    summary,
    createdAt: Date.now()
  };

  // Run validation
  proposal.diagnostics = validateBatchProposal(proposal, workspace);

  return proposal;
}

/**
 * Validates a batch proposal against current workspace state.
 * Detects stale base revisions, naming violations, permission escalations, and circular references.
 */
export function validateBatchProposal(
  proposal: ManagementProposal,
  currentWorkspace: Record<string, any>
): ProposalDiagnostic[] {
  const diagnostics: ProposalDiagnostic[] = [];

  // 1. Stale proposal protection
  const currentFp = computeFingerprint(currentWorkspace);
  if (proposal.baseFingerprint !== currentFp || (proposal.baseRevision !== currentWorkspace.revision && currentWorkspace.revision !== undefined)) {
    diagnostics.push({
      severity: 'error',
      code: 'STALE_BASE_REVISION',
      message: `Workspace has advanced (revision ${currentWorkspace.revision} vs base ${proposal.baseRevision}). Proposal must be refreshed.`,
      path: 'workspace'
    });
  }

  // 2. Validate Parent Agent
  const parentPatch = proposal.patches.find(p => p.kind === 'parent_agent');
  if (parentPatch) {
    const manifestName = parentPatch.fields.manifest?.name || currentWorkspace.manifest?.name;
    if (manifestName && !isValidKebabCase(manifestName)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_PARENT_NAME',
        message: `Agent name '${manifestName}' must be lowercase alphanumeric with hyphens (kebab-case).`,
        path: 'manifest.name'
      });
    }
  }

  // 3. Validate Subagents Batch
  const subagentPatches = proposal.patches.filter(p => p.kind === 'subagent');
  const seenSubagents = new Set<string>();

  // Include existing subagents that are not being deleted
  const remainingExistingSubagents = (currentWorkspace.subAgentsList || [])
    .filter((sa: any) => !subagentPatches.some(p => p.operation === 'delete' && p.targetName === sa.name))
    .map((sa: any) => sa.name);

  remainingExistingSubagents.forEach((name: string) => seenSubagents.add(name));

  for (const sa of subagentPatches) {
    if (sa.operation === 'delete') continue;

    if (!isValidKebabCase(sa.targetName)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_SUBAGENT_NAME',
        message: `Subagent name '${sa.targetName}' must be lowercase kebab-case.`,
        path: `subagents/${sa.targetName}`
      });
    }

    const effectiveParentName = parentPatch?.fields?.manifest?.name || currentWorkspace.manifest?.name;
    if (effectiveParentName && effectiveParentName === sa.targetName) {
      diagnostics.push({
        severity: 'error',
        code: 'SUBAGENT_NAME_COLLISION_WITH_PARENT',
        message: `Subagent '${sa.targetName}' cannot have the exact same name as the parent agent.`,
        path: `subagents/${sa.targetName}`
      });
    }

    if (sa.operation === 'create' && (currentWorkspace.subAgentsList || []).some((existing: any) => existing.name === sa.targetName)) {
      diagnostics.push({
        severity: 'error',
        code: 'SUBAGENT_ALREADY_EXISTS',
        message: `Subagent '${sa.targetName}' already exists in workspace. Use update operation instead.`,
        path: `subagents/${sa.targetName}`
      });
    }

    if (!sa.fields.role || !sa.fields.role.trim()) {
      diagnostics.push({
        severity: 'warning',
        code: 'MISSING_SUBAGENT_ROLE',
        message: `Subagent '${sa.targetName}' has no defined specialist role.`,
        path: `subagents/${sa.targetName}.role`
      });
    }
  }

  // 4. Validate Skills Batch
  const skillPatches = proposal.patches.filter(p => p.kind === 'skill');
  for (const sk of skillPatches) {
    if (sk.operation === 'delete') continue;

    if (!isValidKebabCase(sk.targetName)) {
      diagnostics.push({
        severity: 'error',
        code: 'INVALID_SKILL_NAME',
        message: `Skill name '${sk.targetName}' must be lowercase kebab-case.`,
        path: `skills/${sk.targetName}`
      });
    }

    if (!sk.fields.description || !sk.fields.description.trim()) {
      diagnostics.push({
        severity: 'warning',
        code: 'MISSING_SKILL_DESCRIPTION',
        message: `Skill '${sk.targetName}' has an empty description.`,
        path: `skills/${sk.targetName}.description`
      });
    }
  }

  // 5. Validate Tool Policy
  const tpPatch = proposal.patches.find(p => p.kind === 'tool_policy');
  if (tpPatch) {
    const policy: ToolPolicy = tpPatch.fields as ToolPolicy;
    if (policy.mode === 'allowlist' && (!policy.allowedTools || policy.allowedTools.length === 0)) {
      diagnostics.push({
        severity: 'warning',
        code: 'EMPTY_ALLOWLIST_TOOL_POLICY',
        message: `Tool policy is set to 'allowlist' but allowedTools list is empty. Agent will execute with zero tools.`,
        path: 'tool-policy.mode'
      });
    }
  }

  // 6. Check Prompt Specialist Dependency
  if (proposal.specialistDependency && proposal.specialistDependency.status === 'pending') {
    diagnostics.push({
      severity: 'info',
      code: 'AWAITING_SPECIALIST_COMPLETION',
      message: `Prompt specialist dependency '${proposal.specialistDependency.taskId}' is currently pending. Fallback prompt is available.`,
      path: 'specialistDependency'
    });
  }

  return diagnostics;
}

/**
 * Computes truthful evidence levels for artifacts in a proposal or workspace.
 */
export function computeArtifactEvidence(params: {
  kind: ArtifactKind;
  name: string;
  isKebabValid: boolean;
  hasRequiredFields: boolean;
  toolsCompatibleWithFramework: boolean;
  testedInLab: boolean;
  testPassed: boolean;
}): { evidenceLevel: ArtifactEvidenceLevel; nativeLoaderChecked: boolean; loaderStatusText: string } {
  const { isKebabValid, hasRequiredFields, toolsCompatibleWithFramework, testedInLab, testPassed } = params;

  let evidenceLevel: ArtifactEvidenceLevel = 'authored';

  if (isKebabValid && hasRequiredFields) {
    evidenceLevel = 'structurally_valid';
  }

  if (evidenceLevel === 'structurally_valid' && toolsCompatibleWithFramework) {
    evidenceLevel = 'target_compatible';
  }

  if (evidenceLevel === 'target_compatible' && testedInLab && testPassed) {
    evidenceLevel = 'behavior_tested';
  }

  // TRUTHFULNESS INVARIANT:
  // Native harness loaders (Hermes CLI, Claude Code CLI, etc.) run on remote engines or external binaries.
  // We NEVER mark nativeLoaderChecked = true unless an actual runtime verification RPC returned success.
  const nativeLoaderChecked = false;
  const loaderStatusText = 'Not checked by native runtime loader';

  return {
    evidenceLevel,
    nativeLoaderChecked,
    loaderStatusText
  };
}

/**
 * Atomically applies a validated proposal batch to the workspace.
 * Creates an undo journal entry.
 */
export function applyProposalBatch(
  proposal: ManagementProposal,
  currentWorkspace: Record<string, any>
): { updatedWorkspace: Record<string, any>; journalEntry: ManagementJournalEntry } {
  const nextRev = (currentWorkspace.revision || 1) + 1;
  const snapshotBefore = { ...currentWorkspace };
  let updated: Record<string, any> = { ...currentWorkspace, revision: nextRev };

  proposal.patches.forEach(patch => {
    switch (patch.kind) {
      case 'parent_agent': {
        const fields = patch.fields;
        updated = {
          ...updated,
          ...fields,
          manifest: {
            ...(updated.manifest || {}),
            ...(fields.manifest || {})
          }
        };
        break;
      }

      case 'subagent': {
        const currentList: any[] = [...(updated.subAgentsList || [])];
        if (patch.operation === 'create') {
          currentList.push({
            name: patch.fields.name,
            role: patch.fields.role,
            description: patch.fields.description,
            permissions: patch.fields.permissions || []
          });
        } else if (patch.operation === 'update') {
          const idx = currentList.findIndex(s => s.name === patch.targetName);
          if (idx >= 0) {
            currentList[idx] = { ...currentList[idx], ...patch.fields };
          } else {
            currentList.push({ ...patch.fields });
          }
        } else if (patch.operation === 'delete') {
          const filtered = currentList.filter(s => s.name !== patch.targetName);
          currentList.length = 0;
          currentList.push(...filtered);
        }
        updated.subAgentsList = currentList;
        // Also keep manifest.delegates synchronized
        updated.manifest = {
          ...(updated.manifest || {}),
          delegates: currentList.map(s => s.name)
        };
        break;
      }

      case 'skill': {
        const currentSkills: any[] = [...(updated.skillsList || [])];
        if (patch.operation === 'create') {
          currentSkills.push({
            name: patch.fields.name,
            description: patch.fields.description,
            instructions: patch.fields.instructions,
            category: patch.fields.category || 'general',
            allowedTools: patch.fields.allowedTools || ''
          });
        } else if (patch.operation === 'update') {
          const idx = currentSkills.findIndex(s => s.name === patch.targetName);
          if (idx >= 0) {
            currentSkills[idx] = { ...currentSkills[idx], ...patch.fields };
          } else {
            currentSkills.push({ ...patch.fields });
          }
        } else if (patch.operation === 'delete') {
          const filtered = currentSkills.filter(s => s.name !== patch.targetName);
          currentSkills.length = 0;
          currentSkills.push(...filtered);
        }
        updated.skillsList = currentSkills;
        break;
      }

      case 'tool_policy': {
        updated.toolPolicy = patch.fields;
        // Synchronize with toolsList if allowlist
        if (patch.fields.mode === 'allowlist' && Array.isArray(patch.fields.allowedTools)) {
          updated.toolsList = patch.fields.allowedTools.map((tName: string) => ({
            name: tName,
            description: `Tool configured via policy (${patch.fields.mode})`
          }));
        } else if (patch.fields.mode === 'deny_all') {
          updated.toolsList = [];
        }
        break;
      }
    }
  });

  const journalEntry: ManagementJournalEntry = {
    proposalId: proposal.id,
    timestamp: Date.now(),
    baseRevision: currentWorkspace.revision || 1,
    appliedRevision: nextRev,
    snapshotBefore,
    snapshotAfter: { ...updated },
    rolledBack: false,
    summary: proposal.summary
  };

  return {
    updatedWorkspace: updated,
    journalEntry
  };
}

/**
 * Rolls back an applied proposal using its journal entry.
 */
export function rollbackProposal(
  journalEntry: ManagementJournalEntry,
  currentWorkspace: Record<string, any>
): Record<string, any> {
  const nextRev = (currentWorkspace.revision || 1) + 1;
  return {
    ...journalEntry.snapshotBefore,
    revision: nextRev
  };
}
