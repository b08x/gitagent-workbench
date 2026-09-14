import { HarnessAdapter } from './types';
import { HermesAdapter } from './hermes-python';
import { ClaudeCodeAdapter } from './claude-code';
import { AntigravityAdapter } from './antigravity';
import { AgentFramework } from '../types';

export * from './types';
export * from './hermes-python';
export * from './claude-code';
export * from './antigravity';

export const Adapters: Record<AgentFramework, HarnessAdapter | undefined> = {
  hermes_agent: HermesAdapter,
  claude_code: ClaudeCodeAdapter,
  google_antigravity: AntigravityAdapter,
  mistral_vibe: undefined, // To be implemented
};

export function getAdapter(framework: AgentFramework): HarnessAdapter {
  const adapter = Adapters[framework];
  if (!adapter) {
    throw new Error(`No adapter implemented yet for framework: ${framework}`);
  }
  return adapter;
}
