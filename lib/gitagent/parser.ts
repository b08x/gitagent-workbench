import { SOUL_SECTIONS, RULES_SECTIONS } from './assembleSystemPrompt';
import { SkillEntry, ParsedSkill } from './types';

/**
 * Parses markdown back into fine-grained fields for the wizard.
 */
export function parseMarkdownToFineGrained(content: string, type: 'soul' | 'rules' | 'skills' | 'duties'): any {
  if (type === 'soul') {
    return parseMarkdownSections(content, SOUL_SECTIONS);
  }
  if (type === 'rules') {
    return parseMarkdownSections(content, RULES_SECTIONS);
  }
  if (type === 'skills') {
    return parseSkillsMarkdown(content);
  }
  return {};
}

function parseMarkdownSections(content: string, sections: { title: string, key: string }[]): Record<string, string> {
  if (!content) return {};
  
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  let currentKey: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimLine = line.trim();
    if (trimLine.startsWith('## ')) {
      // Save previous section
      if (currentKey) {
        result[currentKey] = currentContent.join('\n').trim();
      }
      
      const title = trimLine.substring(3).trim();
      const section = sections.find(s => s.title.toLowerCase() === title.toLowerCase());
      if (section) {
        currentKey = section.key;
        currentContent = [];
      } else {
        currentKey = null;
      }
    } else if (currentKey) {
      currentContent.push(line);
    }
  }

  if (currentKey) {
    result[currentKey] = currentContent.join('\n').trim();
  }

  return result;
}

function parseSkillsMarkdown(content: string): { skillsList: SkillEntry[], skills: Record<string, ParsedSkill> } {
  if (!content) return { skillsList: [], skills: {} };

  const skillsList: SkillEntry[] = [];
  const skills: Record<string, ParsedSkill> = {};
  
  // Split by skill headers
  const sections = content.split(/^## Skill: /m);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const name = lines[0].trim();
    const remainingLines = lines.slice(1);
    
    let description = '';
    let allowedTools: string[] = [];
    let instructions: string[] = [];
    let foundAllowedTools = false;

    for (let j = 0; j < remainingLines.length; j++) {
      const line = remainingLines[j];
      const trimLine = line.trim();

      if (trimLine.startsWith('Allowed tools:')) {
        allowedTools = trimLine.replace('Allowed tools:', '').trim().split(/\s+/).filter(Boolean);
        foundAllowedTools = true;
      } else if (!description && trimLine && !foundAllowedTools) {
        description = trimLine;
      } else {
        // Everything else is instructions if we have a description or if it's not empty
        if (description || trimLine || foundAllowedTools) {
          instructions.push(line);
        }
      }
    }

    const instructionsStr = instructions.join('\n').trim();

    skillsList.push({
      name,
      description,
      instructions: instructionsStr,
      allowedTools: allowedTools.join(' '),
      category: 'general'
    });

    skills[name] = {
      name,
      description,
      instructions: instructionsStr,
      allowedTools,
      category: 'general',
      references: []
    };
  }

  return { skillsList, skills };
}
