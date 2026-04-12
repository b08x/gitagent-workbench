import JSZip from 'jszip';
import { AgentWorkspace } from './types';
import { assembleCLAUDEmd } from './assembleCLAUDEmd';
import { assembleGeminiSettings } from './parseGeminiSettings';

export async function exportGeminiZip(workspace: AgentWorkspace): Promise<Blob> {
  const zip = new JSZip();

  // GEMINI.md uses same assembly as CLAUDE.md
  const geminiMd = assembleCLAUDEmd(workspace);
  zip.file('GEMINI.md', geminiMd);

  // .gemini/settings.json
  const settingsJson = assembleGeminiSettings(workspace);
  zip.file('.gemini/settings.json', settingsJson);

  return await zip.generateAsync({ type: 'blob' });
}
