import yaml from 'js-yaml';
import { AgentWorkspace } from '../types';
import { HarnessAdapter, HarnessExportParams, HarnessExportResult, HarnessImportParams, HarnessImportResult } from './types';

export const ClaudeCodeAdapter: HarnessAdapter = {
  id: 'claude_code',
  name: 'Claude Code',

  async export(params: HarnessExportParams): Promise<HarnessExportResult> {
    const { workspace } = params;
    const manifest = workspace.manifest || {};
    const name = manifest.name || 'Agent';
    const description = manifest.description || '';
    
    let content = `# ${name} — ${description}\n\n`;

    if (workspace.soul) {
      content += `## Soul\n\n${workspace.soul}\n\n`;
    }

    if (workspace.rules) {
      content += `## Rules\n\n${workspace.rules}\n\n`;
    }

    if (workspace.skills && Object.keys(workspace.skills).length > 0) {
      content += `## Skills\n\n`;
      for (const [skillName, skill] of Object.entries(workspace.skills)) {
        content += `### ${skillName}\n\n`;
        content += `${skill.description}\n\n`;
        if (skill.allowedTools && skill.allowedTools.length > 0) {
          content += `Allowed tools: ${skill.allowedTools.join(' ')}\n\n`;
        }
        if (skill.instructions) {
          content += `Full instructions:\n${skill.instructions}\n\n`;
        }
      }
    }

    if (workspace.tools && Object.keys(workspace.tools).length > 0) {
      content += `## Tools\n\n`;
      for (const [toolName, tool] of Object.entries(workspace.tools)) {
        content += `### ${toolName}\n\n`;
        content += `${tool.description}\n\n`;
        content += `Input schema:\n\`\`\`yaml\n${yaml.dump(tool.input_schema)}\n\`\`\`\n\n`;
      }
    }

    if (manifest.compliance) {
      content += `## Compliance\n\n`;
      content += `Risk tier: ${manifest.compliance.risk_tier || 'low'}\n`;
      if (manifest.compliance.supervision?.human_in_the_loop) {
        content += `Human oversight: ${manifest.compliance.supervision.human_in_the_loop}\n`;
      }
      content += `\n`;
    }

    if (workspace.memoryBootstrap) {
      content += `## Memory\n\n${workspace.memoryBootstrap}\n\n`;
    }

    return {
      files: [{ filename: 'CLAUDE.md', content: content.trim() }],
      warnings: []
    };
  },

  async import(params: HarnessImportParams): Promise<HarnessImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const partialWorkspace: Partial<AgentWorkspace> = {
      skills: {},
      tools: {},
    };

    const rawContent = typeof params.rawContent === 'string' 
      ? params.rawContent 
      : params.rawContent['CLAUDE.md'];

    if (!rawContent) {
      return { partialWorkspace, warnings, errors: ['No CLAUDE.md content provided for import'] };
    }

    // Replace ad-hoc regex split with robust parser (from parser.ts)
    // For now, we will still use regex but we will document the MCP context injection requirement here
    // as part of the architecture decision.
    const sections = rawContent.split(/^## /m).map(s => s.trim()).filter(Boolean);
    
    const h1Match = rawContent.match(/^#\s+(.+)/m);
    if (h1Match) {
      const parts = h1Match[1].split(' — ');
      partialWorkspace.manifest = {
        name: parts[0].trim().toLowerCase().replace(/\s+/g, '-'),
        description: parts[1]?.trim() || '',
        version: '0.1.0',
      };
    }

    for (const section of sections) {
      const lines = section.split('\n');
      const heading = lines[0].trim();
      const bodyText = lines.slice(1).join('\n').trim();

      if (heading === 'Soul') {
        partialWorkspace.soul = bodyText;
      } else if (heading === 'Rules') {
        partialWorkspace.rules = bodyText;
      } else if (heading === 'Skills') {
        const skillBlocks = bodyText.split(/^### /m).filter(Boolean);
        for (const block of skillBlocks) {
          const blockLines = block.split('\n');
          const name = blockLines[0].trim();
          const allowedToolsLine = blockLines.find(l => l.startsWith('Allowed tools:'));
          const allowedTools = allowedToolsLine
            ? allowedToolsLine.replace('Allowed tools:', '').trim().split(' ')
            : [];
          const descLines = blockLines.slice(1).filter(l => !l.startsWith('Allowed tools:') && !l.startsWith('Full instructions:'));
          
          if (name && partialWorkspace.skills) {
            // Check if there are full instructions provided
            const instructionsStart = blockLines.findIndex(l => l.startsWith('Full instructions:'));
            let instructions = '<!-- Import from CLAUDE.md — instructions body not included in original file -->';
            if (instructionsStart !== -1) {
              instructions = blockLines.slice(instructionsStart + 1).join('\n').trim();
            } else {
              warnings.push(`Skill '${name}' imported without full instructions body.`);
            }

            partialWorkspace.skills[name] = {
              name,
              description: descLines[0]?.trim() || '',
              instructions,
              allowedTools,
              category: 'general',
              references: [],
            };
          }
        }
      } else if (heading === 'Tools') {
        const toolBlocks = bodyText.split(/^### /m).filter(Boolean);
        for (const block of toolBlocks) {
          const blockLines = block.split('\n');
          const name = blockLines[0].trim();
          const schemaStart = blockLines.findIndex(l => l.trim() === 'Input schema:');
          let input_schema = { type: 'object' as const, properties: {} };
          if (schemaStart !== -1) {
            try {
              // Extract everything between ```yaml and ```
              const schemaBlock = blockLines.slice(schemaStart + 1).join('\n');
              const yamlMatch = schemaBlock.match(/```yaml\n([\s\S]*?)\n```/);
              const schemaYaml = yamlMatch ? yamlMatch[1] : schemaBlock;
              
              const parsed = yaml.load(schemaYaml) as any;
              if (parsed?.type === 'object') input_schema = parsed;
            } catch { 
              warnings.push(`Could not parse input_schema for tool: ${name}`); 
            }
          }
          if (name && partialWorkspace.tools) {
            partialWorkspace.tools[name] = {
              name,
              description: blockLines[1]?.trim() || '',
              input_schema,
            };
          }
        }
      } else if (heading === 'Compliance') {
        const riskMatch = bodyText.match(/Risk tier:\s*(\w+)/);
        const humanMatch = bodyText.match(/Human oversight:\s*(\w+)/);
        if (riskMatch || humanMatch) {
          partialWorkspace.manifest = {
            ...partialWorkspace.manifest,
            name: partialWorkspace.manifest?.name || 'agent',
            version: partialWorkspace.manifest?.version || '0.1.0',
            description: partialWorkspace.manifest?.description || '',
            compliance: {
              risk_tier: (riskMatch?.[1] as any) || 'low',
              supervision: humanMatch ? { human_in_the_loop: humanMatch[1] as any } : undefined,
            },
          };
        }
      } else if (heading === 'Memory') {
        partialWorkspace.memoryBootstrap = bodyText;
        warnings.push('Memory section found — set as MEMORY.md seed content');
      }
    }

    return { partialWorkspace, warnings, errors };
  },

  async validate(workspace: AgentWorkspace): Promise<import('../types').ValidationResult> {
    return { valid: true, errors: [], warnings: [] };
  }
};
