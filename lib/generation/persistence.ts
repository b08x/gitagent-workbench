import { AgentWorkspace } from '../gitagent/types';

const STORAGE_KEY = 'agent_workspace_snapshot';

/**
 * Strip large blobs before persisting to localStorage.
 * This prevents QuotaExceededError during generation when the workspace
 * accumulates scaffoldContext (uploaded files) and generated examples.
 */
function trimForStorage(workspace: AgentWorkspace): any {
  const copy = { ...workspace } as any;

  // Drop uploaded file blobs — they can be megabytes
  delete copy.scaffoldContext;

  // Trim examples if they exist
  if (copy.examples) {
    copy.examples = {
      goodOutputs: copy.examples.goodOutputs?.slice(0, 2000) || '',
      badOutputs: copy.examples.badOutputs?.slice(0, 2000) || '',
    };
  }

  // Flatten nested snapshots (prevent recursive nesting on each save)
  if (copy.history?.snapshots) {
    copy.history = {
      ...copy.history,
      snapshots: copy.history.snapshots.slice(0, 5).map((s: any) => ({
        timestamp: s.timestamp,
        label: s.label,
      }))
    };
  }

  return copy;
}

export function saveWorkspaceSnapshot(workspace: AgentWorkspace) {
  try {
    const data = JSON.stringify(trimForStorage(workspace));
    localStorage.setItem(STORAGE_KEY, data);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('Workspace snapshot too large for localStorage, skipping save.');
    } else {
      console.error('Failed to save workspace snapshot:', err);
    }
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
