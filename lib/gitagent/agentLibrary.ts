import { AgentWorkspace } from './types';

const LIBRARY_KEY = 'agent_library_workspaces';
const MAX_LIBRARY_ENTRIES = 10;

export interface AgentLibraryEntry {
  id: string;
  name: string;
  description: string;
  updatedAt: number;
  workspace: any; // ExtendedWorkspace (lightweight copy)
}

/**
 * Strip heavy fields from a workspace before persisting to localStorage.
 * Keeps manifest, soul, rules, prompt_md, duties (text), skill names/descriptions,
 * tool schemas, and meta — but drops scaffoldContext (uploaded files), generated
 * examples (large markdown blobs), nested history snapshots, and knowledgeDocs content.
 */
function lightweightCopy(workspace: any): any {
  const copy = { ...workspace };

  // Drop uploaded file blobs (can be megabytes of base64 / raw text)
  delete copy.scaffoldContext;

  // Drop nested snapshots to prevent recursive bloat
  if (copy.history?.snapshots) {
    copy.history = {
      ...copy.history,
      snapshots: copy.history.snapshots.map((s: any) => ({
        timestamp: s.timestamp,
        label: s.label,
        // Don't nest the full workspace inside the snapshot
      }))
    };
  }

  // Trim generated examples (can be very large)
  if (copy.examples) {
    copy.examples = {
      goodOutputs: copy.examples.goodOutputs?.slice(0, 500) || '',
      badOutputs: copy.examples.badOutputs?.slice(0, 500) || '',
    };
  }

  // Trim knowledge doc content (keep paths and titles, drop bodies)
  if (copy.knowledgeDocs) {
    copy.knowledgeDocs = copy.knowledgeDocs.map((d: any) => ({
      ...d,
      content: d.content ? d.content.slice(0, 200) + '...' : undefined
    }));
  }

  // Trim skills instructions to keep storage bounded
  if (copy.skills && typeof copy.skills === 'object') {
    const trimmedSkills: Record<string, any> = {};
    for (const [name, skill] of Object.entries(copy.skills as Record<string, any>)) {
      trimmedSkills[name] = {
        ...skill,
        instructions: skill.instructions?.slice(0, 1000) || '',
      };
    }
    copy.skills = trimmedSkills;
  }

  return copy;
}

export function saveToLibrary(workspace: any): void {
  try {
    const id = workspace.manifest?.name || 'untitled-agent';
    const entry: AgentLibraryEntry = {
      id,
      name: workspace.manifest?.name || 'Untitled Agent',
      description: workspace.manifest?.description || '',
      updatedAt: Date.now(),
      workspace: lightweightCopy(workspace),
    };

    let library = getLibrary();
    const existingIndex = library.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      library[existingIndex] = entry;
    } else {
      library.push(entry);
    }
    
    // Sort by most recent and cap at MAX_LIBRARY_ENTRIES
    library.sort((a, b) => b.updatedAt - a.updatedAt);
    library = library.slice(0, MAX_LIBRARY_ENTRIES);
    
    const serialized = JSON.stringify(library);
    
    // If still too large, progressively evict oldest entries
    const maxBytes = 4 * 1024 * 1024; // 4MB safety margin under ~5MB localStorage cap
    if (serialized.length > maxBytes) {
      while (library.length > 1) {
        library.pop();
        const smaller = JSON.stringify(library);
        if (smaller.length <= maxBytes) break;
      }
    }
    
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch (err) {
    // If we still hit quota, clear the library rather than silently failing forever
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded for agent library. Pruning old entries...');
      try {
        // Keep only the current entry
        const id = workspace.manifest?.name || 'untitled-agent';
        const entry: AgentLibraryEntry = {
          id,
          name: workspace.manifest?.name || 'Untitled Agent',
          description: workspace.manifest?.description || '',
          updatedAt: Date.now(),
          workspace: lightweightCopy(workspace),
        };
        localStorage.setItem(LIBRARY_KEY, JSON.stringify([entry]));
      } catch (innerErr) {
        // Last resort: clear library entirely
        console.error('Failed to save even a single entry. Clearing library.', innerErr);
        localStorage.removeItem(LIBRARY_KEY);
      }
    } else {
      console.error('Failed to save agent to library:', err);
    }
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
