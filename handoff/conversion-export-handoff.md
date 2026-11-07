# Conversion & Export Phase Handoff Specification

**Document Version:** 1.0.0  
**Phase:** 1 (Shared Management & Transactional Architecture) → Phase 2 (Runtime Conversion & Native Export Refactoring)  
**System:** GitAgent Workbench Multi-Runtime Agent Architecture  

---

## 1. Architectural Boundary & Phase Division

### Completed in Phase 1 (Shared Authoring & Transactional Management)
- **Versioned Management Contract (`lib/management/types.ts`)**:
  - Explicit action modeling: `create`, `inspect`, `edit`, `import`, `validate`.
  - Artifact kinds: `parent_agent`, `subagent`, `skill`, `tool_policy`, `workflow`.
  - Tool policy model: explicit `unrestricted`, `allowlist`, and `deny_all` states to resolve the empty-array ambiguity.
  - Multi-artifact batch validation: parent agent, child agents, skills, and tool policy validated as a single transactional unit.
  - Truthful evidence levels: `authored`, `structurally_valid`, `target_compatible`, `runtime_loaded`, `behavior_tested`, `activated`. (Native loader status is never claimed as true without an active runtime verification RPC).
  - Transactional proposals with deterministic content fingerprinting, stale revision rejection, and atomic multi-store rollback via `ManagementJournalEntry`.
- **Pattern Registry & Discovery (`lib/management/patterns.ts`)**:
  - 7 verified architectural patterns: Single Autonomous Loop, Multi-Agent Debate, Subagent Delegation, Chain of Verification, Tool Orchestrator, Stateful Episodic Agent, and Hybrid Pipeline.
  - Pure, bounded declarative condition evaluator (no `eval` / `Function`).
  - Inversion Prefix modifier (Phase 0 Requirement Elicitation) for upfront ambiguity elimination.
- **Guided Manager Interface (`app/workbench/components/GuidedManagerDialog.tsx`)**:
  - Inspect-first workflow that preserves unspecified fields during bounded edits.
  - Complete diff preview before application.
  - Resumable prompt-specialist dependency with explicit statuses (`pending`, `supplied`, `fallback`).
  - Hierarchical subagent authoring enabled across all templates without template gating.
  - Skill manager enhanced with external provenance tracking, path traversal checks, and reviewed dependency impact warnings.

### Deferred to Phase 2 (Runtime Conversion & Native Exporter Refactoring)
- Native CLI serializers for runtime harnesses (e.g. `vibe.toml` converter, Claude Code `settings.json` and `.clauderc` exporter, Hermes CLI environment profile generator).
- Cross-runtime AST transpilation for skill execution scripts.
- Packaging native binaries, wheels, or containerized runners.

---

## 2. Canonical Types & Invariants

### 2.1 Tool Policy Invariant
```typescript
export type ToolPolicyMode = 'unrestricted' | 'allowlist' | 'deny_all';

export interface ToolPolicy {
  mode: ToolPolicyMode;
  allowedTools: string[];
  disabledTools: string[];
  perToolPermissions: Record<string, PerToolPermission>;
}
```
**Invariant:** Never interpret an empty `tools: []` array as ambiguous. If `mode === 'unrestricted'`, all tools in the target runtime registry are accessible. If `mode === 'deny_all'`, the agent is strictly prohibited from invoking tools. If `mode === 'allowlist'`, only `allowedTools` may be executed.

### 2.2 Revision & Stale Proposal Invariant
```typescript
proposal.baseRevision === currentWorkspace.revision &&
proposal.baseFingerprint === computeFingerprint(currentWorkspace)
```
**Invariant:** Every proposal must capture the current workspace revision and deterministic fingerprint at creation time. If the workspace advances prior to proposal application, the transaction must fail with diagnostic code `STALE_BASE_REVISION`.

### 2.3 Subagent & Hierarchy Invariant
```typescript
manifest.delegates: string[];
subAgentsList: SubAgentEntry[];
```
**Invariant:** Subagent names must be valid kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`) and must never collide with the parent agent manifest name. Subagents must never be hidden behind template restrictions.

---

## 3. Compatibility Glue

During Phase 1, existing export serializers (`lib/gitagent/serializer.ts` and `app/export/ExportView.tsx`) read from `ExtendedWorkspace`. To maintain 100% backward compatibility:
1. When `UPDATE_TOOL_POLICY` or `APPLY_MANAGEMENT_PROPOSAL` modifies `toolPolicy`, `toolsList` is automatically synchronized:
   - For `allowlist`: `toolsList` is populated with `allowedTools`.
   - For `deny_all`: `toolsList` is emptied.
2. When subagents are added, updated, or removed:
   - `subAgentsList` holds the full structured definitions.
   - `manifest.delegates` is synchronized as a list of subagent names for standard serializers.
3. Deep copies are maintained when attaching library skills to agents (`app/workbench/skills/SkillWorkbench.tsx`), preserving copy isolation while surfacing reviewed dependency impact.

---

## 4. Known Unmapped Fields (Phase 2 Roadmap)

The following native fields from external agent managers (e.g. Mistral Vibe) are deliberately excluded from browser workspace state to maintain framework portability:
| Native Field | External Framework | Phase 2 Target Mapping |
| :--- | :--- | :--- |
| `ansible_inventory_path` | Mistral Vibe (Ansible) | Convert to deployment target configuration |
| `molecule_driver` | Mistral Vibe (Podman/Molecule) | Convert to test runner container profile |
| `python_venv_path` | Mistral Vibe (Local CLI) | Convert to execution environment metadata |
| `clauderc_mcp_servers` | Claude Code (MCP) | Map from `ExtendedWorkspace.a2aServers` |
| `antigravity_actions` | Google Antigravity | Map from `ExtendedWorkspace.toolsList` and permissions |

---

## 5. Verification Fixtures

Unit tests and verification scripts can validate management transactions using the fixtures in `lib/management/__tests__/proposalEngine.test.ts`.
