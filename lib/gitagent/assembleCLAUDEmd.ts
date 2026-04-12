import { AgentWorkspace } from './types';
import yaml from 'js-yaml';

export function assembleCLAUDEmd(workspace: AgentWorkspace): string {
  const parts: string[] = [];
  const { manifest, soul, rules, duties, skills, tools, knowledge } = workspace;

  // H1
  parts.push(`# ${manifest.name || 'agent'}${manifest.description ? ' — ' + manifest.description : ''}`);

  if (soul) parts.push(`## Soul\n\n${soul}`);
  if (rules) parts.push(`## Rules\n\n${rules}`);
  if (duties) parts.push(`## Duties\n\n${duties}`);

  // Skills — progressive disclosure (NO full instructions body)
  if (Object.keys(skills).length > 0) {
    const skillsSection = ['## Skills'];
    for (const [name, skill] of Object.entries(skills)) {
      skillsSection.push(`### ${name}`);
      if (skill.description) skillsSection.push(skill.description);
      if (skill.allowedTools?.length) skillsSection.push(`Allowed tools: ${skill.allowedTools.join(' ')}`);
      skillsSection.push(`Full instructions: skills/${name}/SKILL.md`);
    }
    parts.push(skillsSection.join('\n'));
  }

  // Tools
  if (Object.keys(tools).length > 0) {
    const toolsSection = ['## Tools'];
    for (const [name, tool] of Object.entries(tools)) {
      toolsSection.push(`### ${name}`);
      if (tool.description) toolsSection.push(tool.description);
      toolsSection.push(`Input schema:\n${yaml.dump(tool.input_schema, { indent: 2 })}`);
    }
    parts.push(toolsSection.join('\n'));
  }

  // Knowledge always_load
  if (knowledge?.documents?.some(d => d.always_load && d.content)) {
    const knowledgeSection = ['## Knowledge'];
    for (const doc of knowledge.documents) {
      if (doc.always_load && doc.content) {
        knowledgeSection.push(`### ${doc.path}\n\n${doc.content}`);
      }
    }
    parts.push(knowledgeSection.join('\n'));
  }

  // Compliance
  if (manifest.compliance) {
    const c = manifest.compliance;
    const lines = ['## Compliance'];
    if (c.risk_tier) lines.push(`Risk tier: ${c.risk_tier}`);
    if (c.supervision?.human_in_the_loop) lines.push(`Human oversight: ${c.supervision.human_in_the_loop}`);
    parts.push(lines.join('\n'));
  }

  return parts.join('\n\n');
}
