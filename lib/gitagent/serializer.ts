import JSZip from 'jszip';
import yaml from 'js-yaml';
import { AgentWorkspace } from './types';

export async function serializeWorkspace(workspace: AgentWorkspace): Promise<Blob> {
  const zip = new JSZip();

  // agent.yaml
  zip.file('agent.yaml', yaml.dump(workspace.manifest, { indent: 2 }));

  // SOUL.md
  if (workspace.soul) zip.file('SOUL.md', workspace.soul);

  // RULES.md
  if (workspace.rules) zip.file('RULES.md', workspace.rules);

  // PROMPT.md
  if (workspace.prompt_md) zip.file('PROMPT.md', workspace.prompt_md);

  // DUTIES.md
  if (workspace.duties) zip.file('DUTIES.md', workspace.duties);

  // AGENTS.md
  if (workspace.agents_md) zip.file('AGENTS.md', workspace.agents_md);

  // skills/
  if (Object.keys(workspace.skills).length > 0) {
    const skillsDir = zip.folder('skills');
    for (const [name, skill] of Object.entries(workspace.skills)) {
      const skillDir = skillsDir?.folder(name);
      const frontmatter = yaml.dump({ name: skill.name, description: skill.description });
      skillDir?.file('SKILL.md', `---\n${frontmatter}---\n\n${skill.instructions}`);
    }
  }

  // tools/
  if (Object.keys(workspace.tools).length > 0) {
    const toolsDir = zip.folder('tools');
    for (const [name, tool] of Object.entries(workspace.tools)) {
      toolsDir?.file(`${name}.yaml`, yaml.dump(tool, { indent: 2 }));
    }
  }

  // workflows/
  if (Object.keys(workspace.workflows).length > 0) {
    const workflowsDir = zip.folder('workflows');
    for (const [name, workflow] of Object.entries(workspace.workflows)) {
      workflowsDir?.file(`${name}.yaml`, yaml.dump(workflow, { indent: 2 }));
    }
  }

  // knowledge/
  if (workspace.knowledge) {
    zip.file('knowledge/index.yaml', yaml.dump(workspace.knowledge));
  }

  // memory/
  if (workspace.memory) {
    zip.file('memory/config.yaml', yaml.dump(workspace.memory));
  }

  // examples/
  if (workspace.examples.goodOutputs || workspace.examples.badOutputs) {
    const examplesDir = zip.folder('examples');
    if (workspace.examples.goodOutputs) examplesDir?.file('good-outputs.md', workspace.examples.goodOutputs);
    if (workspace.examples.badOutputs) examplesDir?.file('bad-outputs.md', workspace.examples.badOutputs);
  }

  // config/
  if (workspace.config.default || workspace.config.production) {
    const configDir = zip.folder('config');
    if (workspace.config.default) configDir?.file('default.yaml', yaml.dump(workspace.config.default));
    if (workspace.config.production) configDir?.file('production.yaml', yaml.dump(workspace.config.production));
  }

  // sub-agents
  for (const [name, subAgent] of Object.entries(workspace.subAgents)) {
    const subAgentBlob = await serializeWorkspace(subAgent);
    zip.file(`agents/${name}.zip`, subAgentBlob); // Note: gitagent usually expects directories, but we'll zip them for now or handle as folders
    // Better: recursively add folders
    const agentsDir = zip.folder('agents');
    const subDir = agentsDir?.folder(name);
    // This is simplified, real recursive folder addition would be better
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadZip(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
