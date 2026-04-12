import yaml from 'js-yaml';
import { AgentWorkspace } from './types';

interface ParseResult {
  partial: Partial<AgentWorkspace>;
  warnings: string[];
}

export function parseCLAUDEmd(content: string): ParseResult {
  const warnings: string[] = [];
  const partial: Partial<AgentWorkspace> = {
    skills: {},
    tools: {},
  };

  // Split into sections by ## headings
  const sections = content.split(/^## /m).map(s => s.trim()).filter(Boolean);
  
  // Extract H1 for name/description
  const h1Match = content.match(/^#\s+(.+)/m);
  if (h1Match) {
    const parts = h1Match[1].split(' — ');
    partial.manifest = {
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
      partial.soul = bodyText;
    } else if (heading === 'Rules') {
      partial.rules = bodyText;
    } else if (heading === 'Skills') {
      // Parse ### skill blocks
      const skillBlocks = bodyText.split(/^### /m).filter(Boolean);
      for (const block of skillBlocks) {
        const blockLines = block.split('\n');
        const name = blockLines[0].trim();
        const allowedToolsLine = blockLines.find(l => l.startsWith('Allowed tools:'));
        const allowedTools = allowedToolsLine
          ? allowedToolsLine.replace('Allowed tools:', '').trim().split(' ')
          : [];
        const descLines = blockLines.slice(1).filter(l => !l.startsWith('Allowed tools:') && !l.startsWith('Full instructions:'));
        if (name && partial.skills) {
          partial.skills[name] = {
            name,
            description: descLines[0]?.trim() || '',
            instructions: '<!-- Import from CLAUDE.md — instructions body not included in CLAUDE.md export -->',
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
            const schemaYaml = blockLines.slice(schemaStart + 1).join('\n');
            const parsed = yaml.load(schemaYaml) as any;
            if (parsed?.type === 'object') input_schema = parsed;
          } catch { warnings.push(`Could not parse input_schema for tool: ${name}`); }
        }
        if (name && partial.tools) {
          partial.tools[name] = {
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
        partial.manifest = {
          ...partial.manifest,
          name: partial.manifest?.name || 'agent',
          version: partial.manifest?.version || '0.1.0',
          description: partial.manifest?.description || '',
          compliance: {
            risk_tier: (riskMatch?.[1] as any) || 'low',
            supervision: humanMatch ? { human_in_the_loop: humanMatch[1] as any } : undefined,
          },
        };
      }
    } else if (heading === 'Memory') {
      // Store as memory seed — will map to MEMORY.md layer
      partial.memoryBootstrap = bodyText;
      warnings.push('Memory section found — set as MEMORY.md seed content');
    }
  }

  return { partial, warnings };
}
