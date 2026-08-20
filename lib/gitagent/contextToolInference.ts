import { AgentFramework } from './types';
import { TOOL_MATRIX, ToolIntentCategory, FRAMEWORK_CANONICAL_NAMES, ToolMatrixEntry } from './toolMatrix';

export interface SkillContextInput {
  name?: string;
  description?: string;
  category?: string;
  instructions?: string;
  targetFramework?: AgentFramework | string;
}

export interface InferredToolsResult {
  framework: AgentFramework;
  tools: string[];
  matchedIntents: ToolIntentCategory[];
  reasoning: string[];
}

/**
 * Keyword and semantic phrase dictionary mapping to Tool Intent Categories.
 */
const INTENT_PATTERNS: Record<ToolIntentCategory, { patterns: RegExp[]; weight: number }> = {
  file_write: {
    patterns: [
      /artifact/i,
      /remove/i,
      /delete/i,
      /patch/i,
      /edit/i,
      /modify/i,
      /replace/i,
      /rewrite/i,
      /create.*file/i,
      /write.*file/i,
      /save/i,
      /format/i,
      /correct/i,
      /fix/i,
      /clean/i,
      /refactor/i,
      /update/i,
      /strip/i,
      /normalize/i,
      /sanitize/i,
      /insert/i,
      /append/i,
      /truncate/i
    ],
    weight: 2
  },
  file_read: {
    patterns: [
      /read/i,
      /inspect/i,
      /parse/i,
      /view/i,
      /search.*file/i,
      /find.*file/i,
      /grep/i,
      /scan/i,
      /detect/i,
      /audit/i,
      /check.*syntax/i,
      /lint/i,
      /analyze.*code/i,
      /review/i,
      /explore.*repo/i,
      /locate/i,
      /extract.*doc/i,
      /list.*dir/i,
      /structure/i
    ],
    weight: 1.5
  },
  terminal_exec: {
    patterns: [
      /terminal/i,
      /bash/i,
      /shell/i,
      /command/i,
      /execute/i,
      /run.*test/i,
      /build/i,
      /compile/i,
      /npm/i,
      /cargo/i,
      /python/i,
      /pytest/i,
      /docker/i,
      /deploy/i,
      /process/i,
      /cli/i,
      /script/i
    ],
    weight: 2
  },
  web_access: {
    patterns: [
      /web/i,
      /search.*engine/i,
      /google/i,
      /online/i,
      /internet/i,
      /scrape/i,
      /crawl/i,
      /url/i,
      /http/i,
      /browser/i,
      /fetch.*page/i,
      /extract.*text/i,
      /x_search/i,
      /tweet/i,
      /documentation.*lookup/i
    ],
    weight: 2
  },
  subagent_delegate: {
    patterns: [
      /delegate/i,
      /subagent/i,
      /sub-agent/i,
      /parallel.*task/i,
      /spawn/i,
      /dispatch/i,
      /child.*task/i,
      /multi-agent/i,
      /worker/i,
      /orchestrate/i
    ],
    weight: 2.5
  },
  task_management: {
    patterns: [
      /todo/i,
      /task.*list/i,
      /track.*progress/i,
      /checklist/i,
      /planning/i,
      /plan.*mode/i,
      /milestone/i,
      /conclude/i,
      /finish/i
    ],
    weight: 1.5
  },
  user_interaction: {
    patterns: [
      /clarify/i,
      /ask.*user/i,
      /question/i,
      /prompt.*user/i,
      /ambiguity/i,
      /interactive/i,
      /confirm/i,
      /approval/i,
      /notify/i,
      /alert/i
    ],
    weight: 1.5
  },
  multimodal_media: {
    patterns: [
      /screenshot/i,
      /vision/i,
      /visual/i,
      /image/i,
      /photo/i,
      /diagram/i,
      /chart/i,
      /speech/i,
      /audio/i,
      /text_to_speech/i,
      /voice/i,
      /ocr/i,
      /render/i,
      /thumbnail/i
    ],
    weight: 2
  },
  schedule_cron: {
    patterns: [
      /cron/i,
      /recurring/i,
      /schedule/i,
      /periodic/i,
      /interval/i,
      /timer/i,
      /background.*job/i,
      /delayed/i
    ],
    weight: 2.5
  },
  memory_session: {
    patterns: [
      /memory/i,
      /persistent/i,
      /cross-session/i,
      /session.*transcript/i,
      /history/i,
      /recall/i,
      /long-term/i,
      /store.*knowledge/i
    ],
    weight: 2
  },
  process_control: {
    patterns: [
      /kill.*process/i,
      /background.*process/i,
      /stream.*log/i,
      /monitor/i,
      /poll.*status/i
    ],
    weight: 2
  },
  advanced_tools: {
    patterns: [
      /lsp/i,
      /language.*server/i,
      /worktree/i,
      /git.*worktree/i,
      /mcp/i,
      /model.*context.*protocol/i,
      /sandbox/i,
      /desktop/i
    ],
    weight: 2
  }
};

/**
 * Infer intent categories based on text context.
 */
export function detectContextIntents(contextText: string, category: string = ''): { intents: ToolIntentCategory[]; reasons: string[] } {
  const detected: { intent: ToolIntentCategory; score: number; reason: string }[] = [];
  const lower = contextText.toLowerCase();

  // Category bias
  if (category === 'code') {
    detected.push({ intent: 'file_read', score: 2, reason: 'Code category requires reading files' });
    detected.push({ intent: 'file_write', score: 2, reason: 'Code category requires modifying files' });
  } else if (category === 'research') {
    detected.push({ intent: 'web_access', score: 2.5, reason: 'Research category requires web/docs access' });
    detected.push({ intent: 'file_read', score: 2, reason: 'Research category requires inspecting files' });
  } else if (category === 'communication') {
    detected.push({ intent: 'user_interaction', score: 2, reason: 'Communication category involves user interaction' });
  }

  for (const [intentKey, rule] of Object.entries(INTENT_PATTERNS) as [ToolIntentCategory, { patterns: RegExp[]; weight: number }][]) {
    for (const pattern of rule.patterns) {
      const match = lower.match(pattern);
      if (match) {
        detected.push({
          intent: intentKey,
          score: rule.weight,
          reason: `Matched keyword "${match[0]}" for ${intentKey}`
        });
        break;
      }
    }
  }

  // If nothing specific matched, provide sensible defaults (inspect + edit)
  if (detected.length === 0) {
    detected.push(
      { intent: 'file_read', score: 1, reason: 'Default read capability' },
      { intent: 'file_write', score: 1, reason: 'Default edit capability' }
    );
  }

  // Deduplicate and aggregate
  const intentMap = new Map<ToolIntentCategory, { score: number; reasons: string[] }>();
  for (const d of detected) {
    const curr = intentMap.get(d.intent) || { score: 0, reasons: [] };
    curr.score += d.score;
    curr.reasons.push(d.reason);
    intentMap.set(d.intent, curr);
  }

  const sortedIntents = Array.from(intentMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([intent]) => intent);

  const allReasons = Array.from(intentMap.values()).flatMap(v => v.reasons);

  return { intents: sortedIntents, reasons: allReasons };
}

/**
 * Automatically infers and assigns the most appropriate tools for a given framework based on skill context.
 */
export function inferFrameworkTools(input: SkillContextInput): InferredToolsResult {
  const framework: AgentFramework = (input.targetFramework as AgentFramework) || 'hermes_agent';
  const textCorpus = [
    input.name || '',
    input.description || '',
    input.instructions || '',
    input.category || ''
  ].join(' ');

  const { intents, reasons } = detectContextIntents(textCorpus, input.category || '');

  // Filter the canonical tool matrix for this specific framework
  const frameworkEntries = TOOL_MATRIX.filter(t => t.framework === framework);
  const selectedTools = new Set<string>();

  for (const entry of frameworkEntries) {
    const hasMatchingIntent = entry.intents.some(intent => intents.includes(intent));
    if (hasMatchingIntent) {
      selectedTools.add(entry.name);
    }
  }

  // Fallback: If no tools matched, assign primary read/write tools of the framework
  if (selectedTools.size === 0) {
    if (framework === 'claude_code') {
      selectedTools.add('Read');
      selectedTools.add('Edit');
    } else if (framework === 'hermes_agent') {
      selectedTools.add('read_file');
      selectedTools.add('patch');
    } else if (framework === 'google_antigravity') {
      selectedTools.add('view_file');
      selectedTools.add('edit_file');
    } else if (framework === 'mistral_vibe') {
      selectedTools.add('read');
      selectedTools.add('edit');
    }
  }

  const toolsList = Array.from(selectedTools);

  return {
    framework,
    tools: toolsList,
    matchedIntents: intents,
    reasoning: reasons
  };
}
