import { AgentWorkspace } from '../types';
import { HarnessAdapter, HarnessExportParams, HarnessExportResult, HarnessImportParams, HarnessImportResult } from './types';

interface AntigravitySettings {
  model?: { id?: string; provider?: string };
  allowedTools?: string[];
  approvalMode?: string;
  hooks?: Record<string, unknown>;
}

export const AntigravityAdapter: HarnessAdapter = {
  id: 'google_antigravity',
  name: 'Google Antigravity',

  async export(params: HarnessExportParams): Promise<HarnessExportResult> {
    const { workspace } = params;
    const humanInTheLoop = workspace.manifest?.compliance?.supervision?.human_in_the_loop;

    const approvalModeMap: Record<string, string> = {
      always: 'manual',
      conditional: 'default',
      advisory: 'default',
      none: 'auto',
    };

    const settings = {
      model: {
        id: workspace.manifest?.model?.preferred || workspace.generationConfig?.modelId || 'gemini-2.0-flash-exp',
        provider: 'google', // Typically Google for Antigravity, but could be derived from providerId
      },
      allowedTools: workspace.manifest?.tools || [],
      approvalMode: humanInTheLoop ? approvalModeMap[humanInTheLoop] ?? 'default' : 'default',
      hooks: {},
    };

    return {
      files: [{ filename: 'settings.json', content: JSON.stringify(settings, null, 2) }],
      warnings: []
    };
  },

  async import(params: HarnessImportParams): Promise<HarnessImportResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    let rawContent = '';
    if (typeof params.rawContent === 'string') {
      rawContent = params.rawContent;
    } else if (params.rawContent['settings.json']) {
      rawContent = params.rawContent['settings.json'];
    }

    if (!rawContent.trim()) {
      return { partialWorkspace: {}, warnings, errors: ['No content provided to import'] };
    }

    let settings: AntigravitySettings = {};
    try {
      settings = JSON.parse(rawContent);
    } catch {
      return { partialWorkspace: {}, warnings: [], errors: ['Could not parse settings.json — invalid JSON'] };
    }

    const approvalModeMap: Record<string, 'always' | 'conditional' | 'advisory' | 'none'> = {
      manual: 'always',
      default: 'conditional',
      auto: 'none',
    };

    const partialWorkspace: Partial<AgentWorkspace> = {
      manifest: {
        name: 'imported-agent',
        version: '0.1.0',
        description: 'Imported from Antigravity settings',
        model: settings.model?.id ? { preferred: settings.model.id } : undefined,
        tools: settings.allowedTools || [],
        compliance: settings.approvalMode ? {
          risk_tier: 'low',
          supervision: {
            human_in_the_loop: approvalModeMap[settings.approvalMode] ?? 'conditional'
          }
        } : undefined
      }
    };

    return { partialWorkspace, warnings, errors };
  },

  async validate(workspace: AgentWorkspace): Promise<import('../types').ValidationResult> {
    return { valid: true, errors: [], warnings: [] };
  }
};
