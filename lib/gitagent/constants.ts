import { AgentFramework } from './types';
import { TOOL_MATRIX, FRAMEWORK_TOOL_ENTRIES, FRAMEWORK_CANONICAL_NAMES, ToolMatrixEntry } from './toolMatrix';

export type { AgentFramework };
export { TOOL_MATRIX, FRAMEWORK_TOOL_ENTRIES, FRAMEWORK_CANONICAL_NAMES };
export type { ToolMatrixEntry };

export const AGENT_FRAMEWORK_TOOLS: Record<string, string[]> = {
  "claude_code": [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
    "Bash",
    "Task",
    "WebFetch",
    "WebSearch",
    "TodoWrite",
    "AskUserQuestion",
    "NotebookEdit",
    "BashOutput",
    "KillShell",
    "EnterPlanMode",
    "ExitPlanMode",
    "LSP",
    "CronCreate",
    "CronDelete",
    "CronList",
    "EnterWorktree",
    "ExitWorktree",
    "Monitor",
    "PushNotification"
  ],
  "hermes_agent": [
    "web_search",
    "web_extract",
    "terminal",
    "process",
    "read_file",
    "write_file",
    "patch",
    "search_files",
    "browser_navigate",
    "browser_snapshot",
    "browser_vision",
    "vision_analyze",
    "image_generate",
    "text_to_speech",
    "todo",
    "clarify",
    "execute_code",
    "delegate_task",
    "memory",
    "session_search",
    "cronjob",
    "x_search",
    "computer_use",
    "tool_search",
    "tool_describe",
    "tool_call"
  ],
  "google_antigravity": [
    "list_directory",
    "search_directory",
    "find_file",
    "view_file",
    "create_file",
    "edit_file",
    "run_command",
    "ask_question",
    "start_subagent",
    "generate_image",
    "search_web",
    "read_url_content",
    "finish"
  ],
  "mistral_vibe": [
    "read",
    "write_file",
    "edit",
    "grep",
    "bash",
    "todo",
    "ask_user_question",
    "explore"
  ]
};

export const ALL_CANONICAL_TOOLS = Array.from(
  new Set(Object.values(AGENT_FRAMEWORK_TOOLS).flat())
);

export const AGENT_FRAMEWORK_OPTIONS: { id: AgentFramework; label: string; shortLabel: string; description: string }[] = [
  {
    id: 'hermes_agent',
    label: 'Hermes Agent',
    shortLabel: 'Hermes',
    description: 'Autonomous runtime with browser vision, media gen, persistent memory, and scheduled tasks (26 tools)'
  },
  {
    id: 'claude_code',
    label: 'Claude Code',
    shortLabel: 'Claude Code',
    description: 'Terminal-first coding agent harness with git worktrees, LSP, planning modes, and subagents (24 tools)'
  },
  {
    id: 'google_antigravity',
    label: 'Google Antigravity',
    shortLabel: 'Antigravity',
    description: 'Multimodal harness with workspace search, code execution, image generation, and subtasks (13 tools)'
  },
  {
    id: 'mistral_vibe',
    label: 'Mistral Vibe',
    shortLabel: 'Mistral Vibe',
    description: 'Code-first CLI runtime with terminal, exploration subagents, clarification loops, and patch dispatch (8 tools)'
  }
];

export const TOOL_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  TOOL_MATRIX.map(t => [t.name, `${t.functionDesc} (${t.permissions})`])
);
