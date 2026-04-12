import { GenerationPrompt } from '../../providers/types';
import { z } from 'zod';

export const referencesCatalogueSchema = z.object({
  references: z.array(z.object({
    filename: z.string().describe('Suggested filename (kebab-case .md)'),
    description: z.string().describe('One-line description of its contents'),
    trigger: z.string().describe('When the agent should load it (trigger condition)')
  }))
});

export function referencesReadmePrompt(
  skillName: string,
  description: string,
  allowedTools: string[],
  category: string
): GenerationPrompt {
  return {
    system: `Generate a references/ directory README for the skill '${skillName}'.
     This file is a catalogue of the reference documents that SHOULD be created
     to support this skill. For each suggested reference, provide:
     - Suggested filename (kebab-case .md)
     - One-line description of its contents
     - When the agent should load it (trigger condition)
     Use the skill description and allowed tools as context.
     Do not generate the reference documents themselves — only the catalogue.
     
     Output MUST be a JSON object matching the schema.`,
    user: `Skill: ${skillName}
Description: ${description}
Category: ${category}
Allowed Tools: ${allowedTools.join(', ')}

Generate the references/README.md catalogue.`,
    schema: referencesCatalogueSchema
  };
}
