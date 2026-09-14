import JSZip from 'jszip';
import { AgentWorkspace } from './types';
import { assembleCLAUDEmd } from './assembleCLAUDEmd';
import { getAdapter } from './adapters';

export async function exportGeminiZip(workspace: AgentWorkspace): Promise<Blob> {
  const zip = new JSZip();

  const mdContent = assembleCLAUDEmd(workspace);
  zip.file('GEMINI.md', mdContent);

  const antigravityAdapter = getAdapter('google_antigravity');
  const result = await antigravityAdapter.export({ workspace });
  const settingsJson = result.files.find(f => f.filename === 'settings.json')?.content || '{}';

  zip.folder('.gemini')?.file('settings.json', settingsJson);

  return await zip.generateAsync({ type: 'blob' });
}
