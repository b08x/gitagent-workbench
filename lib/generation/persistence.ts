import { AgentWorkspace } from '../gitagent/types';

const STORAGE_KEY = 'agent_workspace_snapshot';

export function saveWorkspaceSnapshot(workspace: AgentWorkspace) {
  try {
    const data = JSON.stringify(workspace);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (err) {
    console.error('Failed to save workspace snapshot:', err);
  }
}

export function loadWorkspaceSnapshot(): AgentWorkspace | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as AgentWorkspace;
  } catch (err) {
    console.error('Failed to load workspace snapshot:', err);
    return null;
  }
}

export function clearWorkspaceSnapshot() {
  localStorage.removeItem(STORAGE_KEY);
}
