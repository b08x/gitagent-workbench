import JSZip from 'jszip';
import yaml from 'js-yaml';
import { AgentWorkspace } from './types';

export async function serializeWorkspace(workspace: AgentWorkspace): Promise<Blob> {
  const zip = new JSZip();

  // ── agent.yaml ─────────────────────────────────────────────────────────────
  const ext = workspace as any;
  const manifestClean = stripNulls({
    ...workspace.manifest,
    model: ext.modelConfig,
    runtime: ext.runtimeConfig,
  });
  zip.file('agent.yaml', yaml.dump(manifestClean, { indent: 2, lineWidth: 120 }));

  // ── SOUL.md ────────────────────────────────────────────────────────────────
  if (workspace.soul) zip.file('SOUL.md', workspace.soul);

  // ── RULES.md ───────────────────────────────────────────────────────────────
  if (workspace.rules) zip.file('RULES.md', workspace.rules);

  // ── PROMPT.md ──────────────────────────────────────────────────────────────
  if (workspace.prompt_md) zip.file('PROMPT.md', workspace.prompt_md);

  // ── DUTIES.md ──────────────────────────────────────────────────────────────
  if (workspace.duties) zip.file('DUTIES.md', workspace.duties);

  // ── AGENTS.md ──────────────────────────────────────────────────────────────
  if (workspace.agents_md) zip.file('AGENTS.md', workspace.agents_md);

  // ── skills/ ────────────────────────────────────────────────────────────────
  // CRITICAL: Every SKILL.md MUST start with YAML frontmatter between --- delimiters.
  // Without this, gitagent validate fails with "missing YAML frontmatter".
  // The serializer owns the frontmatter. The model generates only the body.
  if (Object.keys(workspace.skills).length > 0) {
    for (const [name, skill] of Object.entries(workspace.skills)) {
      const frontmatterObj: Record<string, unknown> = {
        name: skill.name || name,
        description: skill.description || `${name} skill`,
      };
      if (skill.allowedTools && skill.allowedTools.length > 0) {
        frontmatterObj['allowed-tools'] = skill.allowedTools.join(' ');
      }
      if (skill.license) frontmatterObj['license'] = skill.license;
      if (skill.compatibility) frontmatterObj['compatibility'] = skill.compatibility;
      if (skill.metadata) frontmatterObj['metadata'] = skill.metadata;

      const frontmatterYaml = yaml.dump(frontmatterObj, { indent: 2 }).trimEnd();

      // Required format:
      //   ---
      //   name: skill-name
      //   description: "..."
      //   ---
      //
      //   # Skill Title
      //   Instructions body...
      const skillMdContent = `---\n${frontmatterYaml}\n---\n\n${skill.instructions || ''}`;
      zip.file(`skills/${name}/SKILL.md`, skillMdContent);

      // ── references/ ────────────────────────────────────────────────────────
      if (skill.references && skill.references.length > 0) {
        skill.references.forEach(ref => {
          zip.file(`skills/${name}/references/${ref.name}`, ref.content);
        });
      }

      // ── examples/ ──────────────────────────────────────────────────────────
      if (skill.examples && skill.examples.length > 0) {
        skill.examples.forEach((ex, idx) => {
          const content = `Input:\n${ex.input}\n\nOutput:\n${ex.output}`;
          zip.file(`skills/${name}/examples/example-${idx + 1}.md`, content);
        });
      }

      // ── scripts/ ───────────────────────────────────────────────────────────
      if (skill.scripts && skill.scripts.length > 0) {
        skill.scripts.forEach(script => {
          zip.file(`skills/${name}/scripts/${script}`, '# Placeholder for script content');
        });
      }
    }
  }

  // ── tools/ ─────────────────────────────────────────────────────────────────
  // CRITICAL: Every tool declared in agent.yaml tools[] MUST have a corresponding
  // tools/<n>.yaml file or gitagent validate fails with "Referenced tool not found".
  // Tools use MCP-compatible input_schema (NOT `parameters`).
  if (Object.keys(workspace.tools).length > 0) {
    for (const [name, tool] of Object.entries(workspace.tools)) {
      const toolObj: Record<string, unknown> = {
        name: tool.name || name,
        description: tool.description || `Tool: ${name}`,
        input_schema: tool.input_schema || {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Input for the tool' },
          },
          required: ['query'],
        },
      };
      zip.file(`tools/${name}.yaml`, yaml.dump(toolObj, { indent: 2 }));
    }
  }

  // ── workflows/ ─────────────────────────────────────────────────────────────
  if (Object.keys(workspace.workflows).length > 0) {
    for (const [name, workflow] of Object.entries(workspace.workflows)) {
      zip.file(`workflows/${name}.yaml`, yaml.dump(workflow, { indent: 2 }));
    }
  }

  // ── knowledge/ ─────────────────────────────────────────────────────────────
  if (workspace.knowledge) {
    // Write index.yaml (metadata only — no content)
    const indexForYaml = {
      documents: workspace.knowledge.documents.map(({ content, ...entry }) => entry)
    };
    zip.file('knowledge/index.yaml', yaml.dump(indexForYaml, { indent: 2 }));

    // Write document files for entries that have content
    for (const doc of workspace.knowledge.documents) {
      if (doc.content) {
        zip.file(`knowledge/${doc.path}`, doc.content);
      }
    }
  }

  // ── memory/ ────────────────────────────────────────────────────────────────
  if (workspace.memory) {
    zip.file('memory/MEMORY.md', '');
    zip.file('memory/memory.yaml', yaml.dump(workspace.memory, { indent: 2 }));
  }

  // ── examples/ ──────────────────────────────────────────────────────────────
  if (workspace.examples.goodOutputs) {
    zip.file('examples/good-outputs.md', workspace.examples.goodOutputs);
  }
  if (workspace.examples.badOutputs) {
    zip.file('examples/bad-outputs.md', workspace.examples.badOutputs);
  }

  // ── config/ ────────────────────────────────────────────────────────────────
  if (workspace.config.default) {
    zip.file('config/default.yaml', yaml.dump(workspace.config.default, { indent: 2 }));
  }
  if (workspace.config.production) {
    zip.file('config/production.yaml', yaml.dump(workspace.config.production, { indent: 2 }));
  }

  // ── agents/ (sub-agents, one level deep) ───────────────────────────────────
  for (const [subName, subAgent] of Object.entries(workspace.subAgents)) {
    const subManifestClean = stripNulls(subAgent.manifest);
    zip.file(`agents/${subName}/agent.yaml`, yaml.dump(subManifestClean, { indent: 2 }));
    if (subAgent.soul) zip.file(`agents/${subName}/SOUL.md`, subAgent.soul);
    if (subAgent.duties) zip.file(`agents/${subName}/DUTIES.md`, subAgent.duties);
    if (subAgent.rules) zip.file(`agents/${subName}/RULES.md`, subAgent.rules);
    for (const [sName, sSkill] of Object.entries(subAgent.skills)) {
      const fm = yaml.dump({ name: sSkill.name, description: sSkill.description }, { indent: 2 }).trimEnd();
      zip.file(`agents/${subName}/skills/${sName}/SKILL.md`, `---\n${fm}\n---\n\n${sSkill.instructions || ''}`);
    }
    for (const [tName, tTool] of Object.entries(subAgent.tools)) {
      zip.file(`agents/${subName}/tools/${tName}.yaml`, yaml.dump(tTool, { indent: 2 }));
    }
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

export function serializeSkill(skill: any): string {
  const frontmatterObj: Record<string, unknown> = {
    name: skill.name,
    description: skill.description,
  };
  if (skill.allowedTools && skill.allowedTools.length > 0) {
    frontmatterObj['allowed-tools'] = skill.allowedTools.join(' ');
  }
  if (skill.license) frontmatterObj['license'] = skill.license;
  if (skill.compatibility) frontmatterObj['compatibility'] = skill.compatibility;
  if (skill.metadata) frontmatterObj['metadata'] = skill.metadata;

  const frontmatterYaml = yaml.dump(frontmatterObj, { indent: 2 }).trimEnd();
  return `---\n${frontmatterYaml}\n---\n\n${skill.instructions || ''}`;
}

// Recursively remove null/undefined so serialized YAML is clean and doesn't
// trip gitagent's additionalProperties check on agent.yaml.
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls).filter(v => v !== undefined);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cleaned = stripNulls(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  return obj;
}
