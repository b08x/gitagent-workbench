/**
 * GitAgent Management Types
 * Implements the typed versioned management contract inspired by Mistral Vibe manager architecture,
 * adapted for browser and multi-runtime execution across Hermes, Claude Code, Google Antigravity, and Mistral Vibe.
 */

export type ManagementAction = 'create' | 'inspect' | 'edit' | 'import' | 'validate';

export type ArtifactKind = 
  | 'parent_agent' 
  | 'subagent' 
  | 'skill' 
  | 'tool_policy' 
  | 'workflow';

export type ToolPolicyMode = 'unrestricted' | 'allowlist' | 'deny_all';

export interface PerToolPermission {
  approvalRequired?: boolean;
  readOnly?: boolean;
  networkAccess?: boolean;
  maxExecutionTimeSeconds?: number;
}

export interface ToolPolicy {
  /**
   * Explicit mode prevents ambiguous empty arrays.
   * - 'unrestricted': all target runtime tools available without gating
   * - 'allowlist': only tools in allowedTools can be executed
   * - 'deny_all': no tools permitted, purely text/prompt based
   */
  mode: ToolPolicyMode;
  allowedTools: string[];
  disabledTools: string[];
  perToolPermissions: Record<string, PerToolPermission>;
}

export type ArtifactEvidenceLevel = 
  | 'authored'           // Authored by human or wizard, unvalidated
  | 'structurally_valid' // Passed local schema, naming, and dependency checks
  | 'target_compatible'  // All tools and APIs supported by the selected runtime harness
  | 'runtime_loaded'     // Verified by runtime harness/loader
  | 'behavior_tested'    // Executed in Test Lab with recorded test assertions
  | 'activated';         // Actively deployed or running

export interface ProposalDiagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  target?: string;
}

export interface ArtifactStatus {
  kind: ArtifactKind;
  id: string;
  name: string;
  evidenceLevel: ArtifactEvidenceLevel;
  /** Truthful: native loader status is never claimed as true unless explicitly verified */
  nativeLoaderChecked: boolean;
  loaderStatusText: string;
  diagnostics: ProposalDiagnostic[];
}

export type PromptSpecialistStatus = 'pending' | 'supplied' | 'fallback';

export interface PromptSpecialistDependency {
  taskId: string;
  targetField: 'soul' | 'rules' | 'instructions' | 'persona' | 'subagent_prompt';
  status: PromptSpecialistStatus;
  requestedRole: string;
  suppliedPrompt?: string;
  fallbackPrompt: string;
  notes?: string;
}

export interface TypedArtifactPatch {
  kind: ArtifactKind;
  id: string;
  operation: 'create' | 'update' | 'delete';
  targetName: string;
  fields: Record<string, any>;
  originalFingerprint?: string;
  newFingerprint: string;
}

export interface ProposalDiffEntry {
  path: string;
  kind: ArtifactKind;
  changeType: 'added' | 'modified' | 'removed' | 'unchanged';
  beforeSummary?: string;
  afterSummary?: string;
  fullDiff?: string;
}

export interface ManagementProposal {
  id: string;
  baseRevision: number;
  baseFingerprint: string;
  action: ManagementAction;
  patternId?: string;
  patternName?: string;
  inversionPrefixEnabled?: boolean;
  status: 'collecting' | 'building' | 'awaiting_dependency' | 'preview' | 'applying' | 'applied' | 'rejected';
  patches: TypedArtifactPatch[];
  diagnostics: ProposalDiagnostic[];
  specialistDependency?: PromptSpecialistDependency;
  diffs: ProposalDiffEntry[];
  summary: string;
  createdAt: number;
  appliedAt?: number;
}

export interface ManagementJournalEntry {
  proposalId: string;
  timestamp: number;
  baseRevision: number;
  appliedRevision: number;
  snapshotBefore: Record<string, any>;
  snapshotAfter: Record<string, any>;
  rolledBack: boolean;
  summary: string;
}
