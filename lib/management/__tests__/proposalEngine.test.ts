/**
 * Proposal Engine Invariant Tests
 * Verifies batch transactions, collision detection, stale proposal rejection, and rollbacks.
 */

import {
  computeFingerprint,
  inspectWorkspaceForEditing,
  createManagementProposal,
  validateBatchProposal,
  applyProposalBatch,
  rollbackProposal,
  isValidKebabCase
} from '../proposalEngine';
import { scorePatterns, DISCOVERY_QUESTIONS, ARCHITECTURE_PATTERNS } from '../patterns';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('🧪 Starting Management Proposal Engine Tests...');

// 1. Kebab-case validation
assert(isValidKebabCase('valid-agent-name'), 'kebab case test 1');
assert(isValidKebabCase('agent123'), 'kebab case test 2');
assert(!isValidKebabCase('Invalid_Agent'), 'kebab case test 3');
assert(!isValidKebabCase('-invalid-start'), 'kebab case test 4');
console.log('✅ Kebab-case tests passed');

// 2. Base Workspace Fixture
const initialWorkspace: any = {
  revision: 1,
  manifest: {
    name: 'data-synthesizer',
    description: 'Synthesizes datasets and models',
    version: '1.0.0'
  },
  selectedTemplate: 'standard',
  targetFramework: 'hermes_agent',
  soul: 'Direct and analytical.',
  rules: 'Validate all facts.',
  skillsList: [
    { name: 'csv-parser', description: 'Parses tabular data', category: 'code', instructions: 'Parse CSV files.' }
  ],
  subAgentsList: [],
  toolPolicy: {
    mode: 'unrestricted',
    allowedTools: [],
    disabledTools: [],
    perToolPermissions: {}
  }
};

// 3. Inspect-first test: ensures unspecified fields are preserved
const inspection = inspectWorkspaceForEditing(initialWorkspace, 'parent_agent');
assert(inspection.existingName === 'data-synthesizer', 'inspection name');
assert(inspection.existingSkillsCount === 1, 'inspection skills count');
assert(inspection.hasSoul === true, 'inspection soul');
console.log('✅ Inspect-first tests passed');

// 4. Pattern Scoring Test
const answers = {
  task_complexity: 'modular',
  subagent_need: 'delegation',
  memory_continuity: 'ephemeral',
  inversion_preference: 'recommended'
};
const scored = scorePatterns(answers);
assert(scored.length === 7, 'all 7 patterns scored');
assert(scored[0].pattern.id === 'subagent_delegation', 'subagent delegation scored highest');
console.log('✅ Pattern discovery scoring tests passed');

// 5. Multi-Artifact Batch Proposal Creation
const proposal = createManagementProposal({
  action: 'edit',
  workspace: initialWorkspace,
  patternId: 'subagent_delegation',
  inversionPrefixEnabled: true,
  parentPatch: {
    manifest: { author: 'Engineering Team' }
  },
  subagentPatches: [
    {
      operation: 'create',
      name: 'code-worker',
      role: 'Code Generator',
      description: 'Generates TypeScript code',
      permissions: ['read_only']
    }
  ],
  toolPolicyPatch: {
    mode: 'allowlist',
    allowedTools: ['file_search', 'terminal'],
    disabledTools: [],
    perToolPermissions: {}
  },
  specialistDependency: {
    taskId: 'spec-1',
    targetField: 'rules',
    status: 'fallback',
    requestedRole: 'Prompt Engineer',
    fallbackPrompt: '## Specialist Guardrails\nStrict typing required.'
  }
});

assert(proposal.status === 'preview', 'proposal status preview');
assert(proposal.patches.length === 3, '3 patches in batch (parent with specialist rules, subagent, tool_policy)');
assert(proposal.diffs.length >= 3, 'diffs created');
console.log('✅ Multi-artifact batch proposal creation tests passed');

// 6. Proposal Validation: Happy Path
const diagnostics = validateBatchProposal(proposal, initialWorkspace);
assert(diagnostics.every(d => d.severity !== 'error'), 'no errors on valid proposal');
console.log('✅ Valid proposal batch diagnostics passed');

// 7. Stale Proposal Rejection Test
const advancedWorkspace = {
  ...initialWorkspace,
  revision: 2, // Workspace advanced!
  manifest: { ...initialWorkspace.manifest, description: 'Updated elsewhere' }
};
const staleDiagnostics = validateBatchProposal(proposal, advancedWorkspace);
assert(staleDiagnostics.some(d => d.code === 'STALE_BASE_REVISION'), 'stale proposal detected');
console.log('✅ Stale proposal rejection tests passed');

// 8. Subagent Collision with Parent Name Test
const collidingProposal = createManagementProposal({
  action: 'edit',
  workspace: initialWorkspace,
  subagentPatches: [
    {
      operation: 'create',
      name: 'data-synthesizer', // EXACT SAME AS PARENT NAME!
      role: 'Duplicate',
      description: 'Collision test',
      permissions: []
    }
  ]
});
const collisionDiagnostics = validateBatchProposal(collidingProposal, initialWorkspace);
assert(collisionDiagnostics.some(d => d.code === 'SUBAGENT_NAME_COLLISION_WITH_PARENT'), 'collision with parent name caught');
console.log('✅ Subagent parent collision detection tests passed');

// 9. Atomic Application & Rollback Test
const { updatedWorkspace, journalEntry } = applyProposalBatch(proposal, initialWorkspace);
assert(updatedWorkspace.revision === 2, 'revision incremented to 2');
assert(updatedWorkspace.manifest.author === 'Engineering Team', 'parent patch applied');
assert(updatedWorkspace.manifest.name === 'data-synthesizer', 'parent original name preserved');
assert(updatedWorkspace.subAgentsList.length === 1, 'subagent added');
assert(updatedWorkspace.subAgentsList[0].name === 'code-worker', 'subagent name correct');
assert(updatedWorkspace.toolPolicy.mode === 'allowlist', 'tool policy mode allowlist');
assert(updatedWorkspace.rules.includes('Phase 0: Requirement Inversion'), 'inversion prefix injected into rules');

// Now rollback
const rolledBack = rollbackProposal(journalEntry, updatedWorkspace);
assert(rolledBack.revision === 3, 'rollback revision advanced to 3');
assert(rolledBack.manifest.author === undefined, 'author reverted');
assert(rolledBack.subAgentsList.length === 0, 'subagent reverted');
assert(rolledBack.toolPolicy.mode === 'unrestricted', 'tool policy reverted');
console.log('✅ Atomic apply and journal rollback tests passed');

console.log('🎉 All Proposal Engine tests passed successfully!');
