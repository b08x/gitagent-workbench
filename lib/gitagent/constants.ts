export type AgentFramework = 'hermes_agent' | 'claude_code' | 'google_antigravity' | 'mistral_vibe';

export const AGENT_FRAMEWORK_TOOLS: Record<string, string[]> = {
  "claude_code": [
    "web_search",
    "web_extract",
    "terminal",
    "process",
    "read_file",
    "patch",
    "todo",
    "delegate_task"
  ],
  "hermes_agent": [
    "web_search",
    "web_extract",
    "terminal",
    "read_file",
    "patch",
    "browser_navigate",
    "browser_snapshot",
    "browser_vision",
    "vision_analyze",
    "image_generate",
    "text_to_speech",
    "delegate_task",
    "memory",
    "session_search",
    "cronjob",
    "send_message"
  ],
  "google_antigravity": [
    "web_search",
    "terminal",
    "process",
    "read_file",
    "patch",
    "browser_navigate",
    "browser_snapshot",
    "browser_vision",
    "vision_analyze",
    "execute_code",
    "delegate_task",
    "todo"
  ],
  "mistral_vibe": [
    "terminal",
    "process",
    "read_file",
    "patch",
    "execute_code",
    "clarify",
    "delegate_task"
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
    description: 'Autonomous runtime with browser vision, media gen, persistent memory, and scheduled tasks (16 tools)'
  },
  {
    id: 'claude_code',
    label: 'Claude Code',
    shortLabel: 'Claude Code',
    description: 'Terminal-first coding agent harness with search, patching, and task delegation (8 tools)'
  },
  {
    id: 'google_antigravity',
    label: 'Google Antigravity',
    shortLabel: 'Antigravity',
    description: 'Multimodal harness with code execution, browser vision, processes, and subtasks (12 tools)'
  },
  {
    id: 'mistral_vibe',
    label: 'Mistral Vibe',
    shortLabel: 'Mistral Vibe',
    description: 'Code-first CLI runtime with terminal, execution, clarification loops, and patch dispatch (7 tools)'
  }
];

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  web_search: 'Query the web for real-time information and documentation',
  web_extract: 'Fetch and parse content directly from web URLs',
  terminal: 'Execute shell commands in the host environment',
  process: 'Manage background and long-running subprocesses',
  read_file: 'Read file contents from the workspace filesystem',
  patch: 'Apply targeted unified diffs and edits to workspace files',
  browser_navigate: 'Navigate headless browser to arbitrary URLs',
  browser_snapshot: 'Capture DOM snapshots and accessibility trees',
  browser_vision: 'Take high-resolution screenshots for visual inspection',
  vision_analyze: 'Perform multimodal visual analysis on images/diagrams',
  image_generate: 'Generate image assets from descriptive prompts',
  text_to_speech: 'Synthesize spoken audio output from text',
  todo: 'Manage structured subtask checklists and progress tracking',
  clarify: 'Prompt the user with interactive clarification requests',
  execute_code: 'Execute isolated code snippets in python/node sandbox',
  delegate_task: 'Spawn and delegate subtasks to auxiliary sub-agents',
  memory: 'Query and update persistent cross-session memory',
  session_search: 'Search historical conversation sessions and context',
  cronjob: 'Schedule recurring background cron tasks and reminders',
  send_message: 'Dispatch outbound notifications to communication channels'
};
