import yaml from 'js-yaml';
import { ParsedSkill } from './types';

interface SkillParseResult {
  skill: Partial<ParsedSkill>;
  warnings: string[];
  hasFrontmatter: boolean;
}

export function parseSkillMd(content: string): SkillParseResult {
  const warnings: string[] = [];
  
  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    return {
      skill: { instructions: content.trim() },
      warnings: ['No YAML frontmatter found — name and description must be entered manually'],
      hasFrontmatter: false,
    };
  }

  const [, frontmatterYaml, instructionsBody] = frontmatterMatch;
  let frontmatter: Record<string, unknown> = {};

  try {
    frontmatter = yaml.load(frontmatterYaml) as Record<string, unknown>;
  } catch (e) {
    warnings.push('Could not parse frontmatter YAML — check formatting');
  }

  // Map allowed-tools (hyphenated key) to allowedTools array
  const allowedToolsRaw = frontmatter['allowed-tools'];
  const allowedTools = typeof allowedToolsRaw === 'string'
    ? allowedToolsRaw.split(' ').filter(Boolean)
    : Array.isArray(allowedToolsRaw)
    ? allowedToolsRaw.map(String)
    : [];

  const skill: Partial<ParsedSkill> = {
    name: typeof frontmatter.name === 'string' ? frontmatter.name : undefined,
    description: typeof frontmatter.description === 'string' ? frontmatter.description : undefined,
    license: typeof frontmatter.license === 'string' ? frontmatter.license : undefined,
    compatibility: typeof frontmatter.compatibility === 'string' ? frontmatter.compatibility : undefined,
    allowedTools,
    instructions: instructionsBody.trim(),
    category: (frontmatter.metadata as any)?.hermes?.category || 'general',
    references: [],
  };

  if (!skill.name) warnings.push('name field missing from frontmatter');
  if (!skill.description) warnings.push('description field missing from frontmatter');

  return { skill, warnings, hasFrontmatter: true };
}

export function resolveGitHubRawUrl(input: string, skillName?: string): string | null {
  // Already a raw URL
  if (input.startsWith('https://raw.githubusercontent.com/')) return input;

  // GitHub web URL → raw URL
  const webMatch = input.match(/https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)/);
  if (webMatch) {
    const [, repo, branch, path] = webMatch;
    return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  }

  // Shorthand: owner/repo or owner/repo#skills/skill-name
  const shortMatch = input.match(/^([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)(#(.+))?$/);
  if (shortMatch) {
    const [, repo, , skillPath] = shortMatch;
    const path = skillPath || (skillName ? `skills/${skillName}/SKILL.md` : null);
    if (!path) return null;
    return `https://raw.githubusercontent.com/${repo}/main/${path}`;
  }

  return null;
}
