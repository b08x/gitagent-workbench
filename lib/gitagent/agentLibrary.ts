import { AgentWorkspace } from './types';

const LIBRARY_KEY = 'agent_library_workspaces';

export interface AgentLibraryEntry {
  id: string;
  name: string;
  description: string;
  updatedAt: number;
  workspace: any; // ExtendedWorkspace
}

export function saveToLibrary(workspace: any): void {
  try {
    const id = workspace.manifest?.name || 'untitled-agent';
    const entry: AgentLibraryEntry = {
      id,
      name: workspace.manifest?.name || 'Untitled Agent',
      description: workspace.manifest?.description || '',
      updatedAt: Date.now(),
      workspace,
    };

    const library = getLibrary();
    const existingIndex = library.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      library[existingIndex] = entry;
    } else {
      library.push(entry);
    }
    
    // Sort by most recent
    library.sort((a, b) => b.updatedAt - a.updatedAt);
    
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch (err) {
    console.error('Failed to save agent to library:', err);
  }
}

export function getLibrary(): AgentLibraryEntry[] {
  try {
    const data = localStorage.getItem(LIBRARY_KEY);
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Failed to parse agent library:', err);
    return [];
  }
}

export function deleteFromLibrary(id: string): void {
  try {
    const library = getLibrary().filter(e => e.id !== id);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch (err) {
    console.error('Failed to delete from library:', err);
  }
}
