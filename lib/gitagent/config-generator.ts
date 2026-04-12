import yaml from 'js-yaml';
import { AgentWorkspace } from './types';

export interface HermesConfigOutput {
  yaml: string;
  toolsets: string[];
  hasGateway: boolean;
}

export function generateHermesConfig(workspace: AgentWorkspace): string {
  const { deploymentTargets = ['cli'], manifest, skills = {}, tools = {}, workflows = {}, subAgents = {} } = workspace;

  // 1. Model Block
  const modelProvider = workspace.generationConfig?.providerId || 'openrouter';
  const modelName = workspace.generationConfig?.modelId || 'anthropic/claude-3-5-sonnet';

  const config: any = {
    model: {
      provider: modelProvider,
      api_key: '<REPLACE_WITH_KEY>', // # Replace with your actual API key
      model: modelName,
    },
    terminal: {
      backend: 'local',
      cwd: '.',
      timeout: 180,
    },
    toolsets: [],
    mcp_servers: {},
  };

  // 2. Toolset Selection Logic
  const matrix = workspace.toolPermissions?.matrix || {};
  const nonSubAgentTargets = deploymentTargets; // already excludes 'sub-agent' by type
  
  const toolsets = new Set(['web', 'file', 'skills', 'memory']);

  // Map canonical tool names to Hermes toolset names
  const toolToToolset: Record<string, string> = {
    'web_search': 'web',
    'web_extract': 'browser',
    'read_file': 'file',
    'memory': 'memory',
    'session_search': 'memory',
    'terminal': 'terminal',
    'process': 'terminal',
    'execute_code': 'code_execution',
    'patch': 'terminal',
    'browser_navigate': 'browser',
    'browser_snapshot': 'browser',
    'browser_vision': 'browser',
    'vision_analyze': 'vision',
    'image_generate': 'vision',
    'text_to_speech': 'vision',
    'todo': 'orchestration',
    'clarify': 'orchestration',
    'delegate_task': 'delegation',
    'cronjob': 'cronjob',
    'send_message': 'orchestration'
  };

  // Derive toolsets from matrix
  Object.entries(matrix).forEach(([tool, columns]) => {
    const isEnabledInAnyTarget = nonSubAgentTargets.some(target => columns[target] === true);
    if (isEnabledInAnyTarget && toolToToolset[tool]) {
      toolsets.add(toolToToolset[tool]);
    }
  });

  if (deploymentTargets.includes('homeassistant')) {
    toolsets.add('homeassistant');
  }

  config.toolsets = Array.from(toolsets).sort();

  // 3. Gateway Block
  const gateway: any = {};
  let hasGateway = false;

  if (deploymentTargets.includes('telegram')) {
    gateway.telegram = { token: '<REPLACE_WITH_TOKEN>' };
    hasGateway = true;
  }
  if (deploymentTargets.includes('discord')) {
    gateway.discord = { token: '<REPLACE_WITH_TOKEN>' };
    hasGateway = true;
  }
  if (deploymentTargets.includes('slack')) {
    gateway.slack = { token: '<REPLACE_WITH_TOKEN>' };
    hasGateway = true;
  }

  if (hasGateway) {
    config.gateway = gateway;
  }

  // 4. Serialize to YAML
  let yamlString = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });

  // Add comments for placeholders
  yamlString = yamlString.replace(
    'api_key: <REPLACE_WITH_KEY>',
    'api_key: <REPLACE_WITH_KEY> # Replace with your actual API key — see https://openrouter.ai'
  );

  if (config.gateway?.telegram) {
    yamlString = yamlString.replace(
      'token: <REPLACE_WITH_TOKEN>',
      'token: <REPLACE_WITH_TOKEN> # Replace with your Telegram bot token — see @BotFather'
    );
  }
  if (config.gateway?.discord) {
    yamlString = yamlString.replace(
      'token: <REPLACE_WITH_TOKEN>',
      'token: <REPLACE_WITH_TOKEN> # Replace with your Discord bot token'
    );
  }
  if (config.gateway?.slack) {
    yamlString = yamlString.replace(
      'token: <REPLACE_WITH_TOKEN>',
      'token: <REPLACE_WITH_TOKEN> # Replace with your Slack bot token'
    );
  }

  if (deploymentTargets.includes('api')) {
    yamlString = '# skip_context_files: true # Hint for API/Embedded deployment\n' + yamlString;
  }

  return yamlString;
}
