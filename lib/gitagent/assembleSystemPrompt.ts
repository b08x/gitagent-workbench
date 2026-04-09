import { AgentWorkspace } from './types';

export const SOUL_SECTIONS = [
  { title: 'Core Identity', key: 'core-identity' },
  { title: 'Communication Style', key: 'communication-style' },
  { title: 'Values & Principles', key: 'values-principles' },
  { title: 'Domain Expertise', key: 'domain-expertise' },
  { title: 'Collaboration Style', key: 'collaboration-style' },
];

export const RULES_SECTIONS = [
  { title: 'Must Always', key: 'must-always' },
  { title: 'Must Never', key: 'must-never' },
  { title: 'Output Constraints', key: 'output-constraints' },
  { title: 'Interaction Boundaries', key: 'interaction-boundaries' },
];

export function assembleSoul(workspace: any): string {
  return SOUL_SECTIONS
    .filter(s => workspace[s.key])
    .map(s => `## ${s.title}\n${workspace[s.key]}`)
    .join('\n\n');
}

export function assembleRules(workspace: any): string {
  return RULES_SECTIONS
    .filter(s => workspace[s.key])
    .map(s => `## ${s.title}\n${workspace[s.key]}`)
    .join('\n\n');
}

export function assembleSystemPrompt(workspace: AgentWorkspace): string {
  const parts: string[] = [];
  const { manifest, soul, rules, duties, skills, knowledge, memory } = workspace;

  if (manifest?.name) {
    parts.push(
      `# ${manifest.name}${manifest.description ? ' — ' + manifest.description : ''}`
    );
  }

  // Assemble SOUL.md from sections if available, otherwise use soul string
  const assembledSoul = assembleSoul(workspace);
  if (assembledSoul) {
    parts.push(assembledSoul);
  } else if (soul) {
    parts.push(soul);
  }

  // Assemble RULES.md from sections if available, otherwise use rules string
  const assembledRules = assembleRules(workspace);
  if (assembledRules) {
    parts.push(assembledRules);
  } else if (rules) {
    parts.push(rules);
  }

  if (duties) parts.push(duties);

  for (const [name, skill] of Object.entries(skills)) {
    const lines = [`## Skill: ${name}`];
    if (skill.description) lines.push(skill.description);
    if (skill.allowedTools?.length) lines.push(`Allowed tools: ${skill.allowedTools.join(' ')}`);
    if (skill.instructions) lines.push('', skill.instructions);
    parts.push(lines.join('\n'));
  }

  if (knowledge?.documents) {
    for (const doc of knowledge.documents) {
      if (doc.always_load && doc.content) {
        parts.push(`## Knowledge: ${doc.path}\n\n${doc.content}`);
      }
    }
  }

  if (manifest?.compliance) {
    const c = manifest.compliance;
    const lines = ['## Compliance'];
    if (c.risk_tier) lines.push(`Risk tier: ${c.risk_tier}`);
    if (c.supervision?.human_in_the_loop) lines.push(`Human oversight: ${c.supervision.human_in_the_loop}`);
    if (c.supervision?.kill_switch) lines.push('Kill switch: enabled');
    parts.push(lines.join('\n'));
  }

  if (memory?.layers?.some(l => l.path === 'MEMORY.md')) {
    parts.push('## Memory\n\n[Session memory initialized]');
  }

  return parts.join('\n\n');
}
