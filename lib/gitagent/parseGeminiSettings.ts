interface GeminiSettings {
  model?: { id?: string; provider?: string };
  allowedTools?: string[];
  approvalMode?: string;
  hooks?: Record<string, unknown>;
}

interface GeminiParseResult {
  modelPreferred?: string;
  tools?: string[];
  humanInTheLoop?: 'always' | 'conditional' | 'advisory' | 'none';
  warnings: string[];
}

export function parseGeminiSettings(json: string): GeminiParseResult {
  const warnings: string[] = [];
  let settings: GeminiSettings = {};

  if (!json.trim()) {
    return { warnings: [] };
  }

  try {
    settings = JSON.parse(json);
  } catch {
    return { warnings: ['Could not parse settings.json — invalid JSON'] };
  }

  const approvalModeMap: Record<string, 'always' | 'conditional' | 'advisory' | 'none'> = {
    manual: 'always',
    default: 'conditional',
    auto: 'none',
  };

  return {
    modelPreferred: settings.model?.id,
    tools: settings.allowedTools,
    humanInTheLoop: settings.approvalMode
      ? approvalModeMap[settings.approvalMode] ?? 'conditional'
      : undefined,
    warnings,
  };
}

export function assembleGeminiSettings(workspace: import('./types').AgentWorkspace): string {
  const humanInTheLoop = workspace.manifest.compliance?.supervision?.human_in_the_loop;

  const approvalModeMap: Record<string, string> = {
    always: 'manual',
    conditional: 'default',
    advisory: 'default',
    none: 'auto',
  };

  const settings = {
    model: {
      id: workspace.manifest.model?.preferred || 'gemini-2.0-flash-exp',
      provider: 'google',
    },
    allowedTools: workspace.manifest.tools || [],
    approvalMode: humanInTheLoop ? approvalModeMap[humanInTheLoop] ?? 'default' : 'default',
    hooks: {},
  };

  return JSON.stringify(settings, null, 2);
}
