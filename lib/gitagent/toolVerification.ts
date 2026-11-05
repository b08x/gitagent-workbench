import { AgentFramework, SkillEntry } from './types';
import { AGENT_FRAMEWORK_TOOLS, AGENT_FRAMEWORK_OPTIONS } from './constants';
import { TOOL_MATRIX } from './toolMatrix';

export interface ToolClaimAudit {
  claim: string;
  sourceSkill?: string;
  scope?: string;
  status: 'verified' | 'unmapped';
  mappedHarnessTool?: string;
  permissionsRequired?: string;
  reason: string;
}

export interface PreflightToolAuditResult {
  targetFramework: AgentFramework;
  frameworkLabel: string;
  totalClaimsCount: number;
  verifiedCount: number;
  unmappedCount: number;
  compatibilityPercentage: number;
  claims: ToolClaimAudit[];
  verifiedClaims: ToolClaimAudit[];
  unmappedClaims: ToolClaimAudit[];
  availableHarnessToolsCount: number;
  allHarnessTools: string[];
  isTestReady: boolean;
  isExportReady: boolean;
  warningNotice?: string;
}

// Canonical synonym mappings across frameworks
const TOOL_SYNONYMS: Record<string, string[]> = {
  // File reading
  read_file: ['Read', 'view_file', 'read', 'read_file', 'cat', 'open_file'],
  view_file: ['Read', 'view_file', 'read', 'read_file'],
  Read: ['Read', 'view_file', 'read', 'read_file'],
  read: ['Read', 'view_file', 'read', 'read_file'],

  // File writing / creation
  write_file: ['Write', 'create_file', 'write', 'write_file', 'save_file'],
  create_file: ['Write', 'create_file', 'write', 'write_file'],
  Write: ['Write', 'create_file', 'write', 'write_file'],

  // File editing
  patch: ['Edit', 'edit_file', 'edit', 'patch', 'modify_file'],
  edit_file: ['Edit', 'edit_file', 'edit', 'patch'],
  Edit: ['Edit', 'edit_file', 'edit', 'patch'],
  edit: ['Edit', 'edit_file', 'edit', 'patch'],

  // Search files
  search_files: ['Glob', 'Grep', 'find_file', 'search_directory', 'grep', 'search_files'],
  find_file: ['Glob', 'find_file', 'search_files', 'search_directory'],
  search_directory: ['Grep', 'search_directory', 'grep', 'find_file'],
  Grep: ['Grep', 'search_directory', 'grep'],
  Glob: ['Glob', 'find_file', 'search_files'],
  grep: ['Grep', 'search_directory', 'grep'],

  // Terminal / Execution
  terminal: ['Bash', 'run_command', 'bash', 'terminal', 'execute_code', 'sh'],
  run_command: ['Bash', 'run_command', 'bash', 'terminal', 'sh'],
  Bash: ['Bash', 'run_command', 'bash', 'terminal', 'sh'],
  bash: ['Bash', 'run_command', 'bash', 'terminal', 'sh'],
  execute_code: ['Bash', 'run_command', 'execute_code', 'bash'],

  // Web search
  web_search: ['WebSearch', 'search_web', 'web_search', 'x_search'],
  search_web: ['WebSearch', 'search_web', 'web_search'],
  WebSearch: ['WebSearch', 'search_web', 'web_search'],

  // User clarification
  clarify: ['AskUserQuestion', 'ask_question', 'ask_user_question', 'clarify'],
  ask_question: ['AskUserQuestion', 'ask_question', 'ask_user_question', 'clarify'],
  AskUserQuestion: ['AskUserQuestion', 'ask_question', 'ask_user_question'],
  ask_user_question: ['AskUserQuestion', 'ask_question', 'ask_user_question'],

  // Subagents
  delegate_task: ['Task', 'start_subagent', 'explore', 'delegate_task'],
  start_subagent: ['Task', 'start_subagent', 'explore', 'delegate_task'],
  Task: ['Task', 'start_subagent', 'explore', 'delegate_task'],
  explore: ['Task', 'start_subagent', 'explore', 'delegate_task'],

  // Media generation
  image_generate: ['generate_image', 'image_generate'],
  generate_image: ['generate_image', 'image_generate']
};

/**
 * Extracts all tool claims from workspace (skills list, markdown, manifest)
 */
export function extractWorkspaceToolClaims(workspace: {
  skillsList?: SkillEntry[];
  skills?: any;
  manifest?: { tools?: string[]; skills?: string[] };
}): Array<{ claim: string; sourceSkill?: string; scope?: string }> {
  const claimsMap = new Map<string, { claim: string; sourceSkill?: string; scope?: string }>();

  // 1. From skillsList
  if (Array.isArray(workspace.skillsList)) {
    for (const skill of workspace.skillsList) {
      const scope = skill.scope || 'global';
      if (typeof skill.allowedTools === 'string') {
        const rawTokens = skill.allowedTools
          .replace(/[`,\[\]"]/g, ' ')
          .split(/\s+/)
          .map(t => t.trim())
          .filter(Boolean);
        for (const token of rawTokens) {
          const key = `${token.toLowerCase()}:${skill.name}`;
          claimsMap.set(key, { claim: token, sourceSkill: skill.name, scope });
        }
      } else if (Array.isArray(skill.allowedTools)) {
        for (const token of skill.allowedTools as string[]) {
          const trimmed = String(token).trim();
          if (trimmed) {
            claimsMap.set(`${trimmed.toLowerCase()}:${skill.name}`, {
              claim: trimmed,
              sourceSkill: skill.name,
              scope
            });
          }
        }
      }
    }
  }

  // 2. From markdown skills if skillsList was empty
  if (claimsMap.size === 0 && typeof workspace.skills === 'string') {
    const lines = workspace.skills.split('\n');
    let currentSkill = 'workspace-skill';
    for (const line of lines) {
      const skillMatch = line.match(/##\s*Skill:\s*([^\n]+)/i);
      if (skillMatch) {
        currentSkill = skillMatch[1].trim();
      }
      const toolMatch = line.match(/Allowed\s*Tools?:\s*([^\n]+)/i);
      if (toolMatch) {
        const tools = toolMatch[1].replace(/[`,\[\]"]/g, ' ').split(/\s+/).filter(Boolean);
        for (const t of tools) {
          claimsMap.set(`${t.toLowerCase()}:${currentSkill}`, {
            claim: t,
            sourceSkill: currentSkill,
            scope: 'global'
          });
        }
      }
    }
  }

  // 3. From manifest tools
  if (Array.isArray(workspace.manifest?.tools)) {
    for (const tool of workspace.manifest.tools) {
      if (typeof tool === 'string' && tool.trim()) {
        const trimmed = tool.trim();
        claimsMap.set(`${trimmed.toLowerCase()}:manifest`, {
          claim: trimmed,
          sourceSkill: 'manifest.yaml',
          scope: 'global'
        });
      }
    }
  }

  return Array.from(claimsMap.values());
}

/**
 * Audits tool claims against the active execution harness.
 * Distinguishes verified access from unmapped/unavailable claims.
 */
export function auditToolMappings(
  workspace: {
    targetFramework?: string;
    skillsList?: SkillEntry[];
    skills?: any;
    manifest?: { tools?: string[]; skills?: string[] };
  },
  overrideFramework?: AgentFramework
): PreflightToolAuditResult {
  const framework: AgentFramework = (overrideFramework || workspace.targetFramework || 'hermes_agent') as AgentFramework;
  const frameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === framework) || AGENT_FRAMEWORK_OPTIONS[0];
  const harnessTools = AGENT_FRAMEWORK_TOOLS[framework] || AGENT_FRAMEWORK_TOOLS['hermes_agent'];
  const harnessLowerSet = new Set(harnessTools.map(t => t.toLowerCase()));

  const claims = extractWorkspaceToolClaims(workspace);
  const auditedClaims: ToolClaimAudit[] = [];

  for (const item of claims) {
    const rawClaim = item.claim;
    const lowerClaim = rawClaim.toLowerCase();

    // 1. Direct match in harness
    if (harnessLowerSet.has(lowerClaim)) {
      const exactMatch = harnessTools.find(t => t.toLowerCase() === lowerClaim) || rawClaim;
      const matrixEntry = TOOL_MATRIX.find(m => m.framework === framework && m.name.toLowerCase() === lowerClaim);
      auditedClaims.push({
        claim: rawClaim,
        sourceSkill: item.sourceSkill,
        scope: item.scope,
        status: 'verified',
        mappedHarnessTool: exactMatch,
        permissionsRequired: matrixEntry?.permissions || 'Standard execution permission',
        reason: `Native tool verified in ${frameworkMeta.label} runtime.`
      });
      continue;
    }

    // 2. Check canonical synonym dictionary
    let mappedSynonym: string | undefined;
    for (const [canonical, synonyms] of Object.entries(TOOL_SYNONYMS)) {
      if (synonyms.some(s => s.toLowerCase() === lowerClaim) || canonical.toLowerCase() === lowerClaim) {
        // Find if any synonym exists in current harness
        mappedSynonym = harnessTools.find(ht => synonyms.some(s => s.toLowerCase() === ht.toLowerCase()));
        if (mappedSynonym) break;
      }
    }

    if (mappedSynonym) {
      const matrixEntry = TOOL_MATRIX.find(m => m.framework === framework && m.name.toLowerCase() === mappedSynonym!.toLowerCase());
      auditedClaims.push({
        claim: rawClaim,
        sourceSkill: item.sourceSkill,
        scope: item.scope,
        status: 'verified',
        mappedHarnessTool: mappedSynonym,
        permissionsRequired: matrixEntry?.permissions || 'Mapped adapter permission',
        reason: `Mapped via canonical synonym to '${mappedSynonym}' in ${frameworkMeta.label}.`
      });
      continue;
    }

    // 3. Unmapped claim
    auditedClaims.push({
      claim: rawClaim,
      sourceSkill: item.sourceSkill,
      scope: item.scope,
      status: 'unmapped',
      reason: `No native adapter or executable tool binding exists in ${frameworkMeta.label} (${harnessTools.length} total tools available).`
    });
  }

  const verifiedClaims = auditedClaims.filter(c => c.status === 'verified');
  const unmappedClaims = auditedClaims.filter(c => c.status === 'unmapped');
  const totalClaimsCount = auditedClaims.length;
  const verifiedCount = verifiedClaims.length;
  const unmappedCount = unmappedClaims.length;

  const compatibilityPercentage = totalClaimsCount === 0
    ? 100
    : Math.round((verifiedCount / totalClaimsCount) * 100);

  const isTestReady = unmappedCount === 0;
  const isExportReady = true; // Export can always produce code, but will warn

  let warningNotice: string | undefined;
  if (unmappedCount > 0) {
    const names = unmappedClaims.map(c => `"${c.claim}"`).slice(0, 3).join(', ');
    const more = unmappedCount > 3 ? ` and ${unmappedCount - 3} more` : '';
    warningNotice = `${unmappedCount} tool claim${unmappedCount > 1 ? 's' : ''} (${names}${more}) declared in skills lack native bindings in ${frameworkMeta.label}. Invoking them in test or production will result in runtime errors.`;
  }

  return {
    targetFramework: framework,
    frameworkLabel: frameworkMeta.label,
    totalClaimsCount,
    verifiedCount,
    unmappedCount,
    compatibilityPercentage,
    claims: auditedClaims,
    verifiedClaims,
    unmappedClaims,
    availableHarnessToolsCount: harnessTools.length,
    allHarnessTools: harnessTools,
    isTestReady,
    isExportReady,
    warningNotice
  };
}
