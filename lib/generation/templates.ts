export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  instructionOverride?: string;
  suggestedSkills?: string[];
  suggestedTools?: string[];
}

export const AGENT_TEMPLATES: Record<string, AgentTemplate> = {
  'data-analyst': {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Expert in CSV/JSON processing, data cleaning, statistical analysis, and visualization.',
    instructionOverride: 'Focus on CSV/JSON processing, data cleaning, statistical analysis, and visualization. Ensure tools for data manipulation are prioritized.',
  },
  'web-scraper': {
    id: 'web-scraper',
    name: 'Web Scraper',
    description: 'Specialist in headless browsing, DOM extraction, rate limiting, and structured data output.',
    instructionOverride: 'Focus on headless browsing, DOM extraction, rate limiting, and structured data output. Ensure tools for networking and parsing are prioritized.',
  },
  'researcher': {
    id: 'researcher',
    name: 'Researcher',
    description: 'Deep synthesis, multi-source verification, and citation-heavy markdown outputs.',
    instructionOverride: 'Focus on deep synthesis, multi-source verification, and citation-heavy markdown outputs. Ensure tools for search and knowledge retrieval are prioritized.',
  },
};

export function getTemplateInstructions(templateId?: string): string {
  if (!templateId || !AGENT_TEMPLATES[templateId]) return '';
  const template = AGENT_TEMPLATES[templateId];
  return `\n\nTEMPLATE: ${template.name}. ${template.instructionOverride}`;
}
