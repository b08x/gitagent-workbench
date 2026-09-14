import { AgentWorkspace, AgentFramework, ValidationResult } from '../types';

export interface HarnessExportParams {
  workspace: AgentWorkspace;
  /** Optional target directory path if the adapter needs to resolve relative assets */
  targetDirectory?: string;
}

export interface HarnessExportResult {
  files: Array<{
    filename: string;
    content: string;
  }>;
  warnings: string[];
}

export interface HarnessImportParams {
  /** The raw content to parse. Can be a single string (e.g., CLAUDE.md) or a map of filename -> content */
  rawContent: string | Record<string, string>;
}

export interface HarnessImportResult {
  partialWorkspace: Partial<AgentWorkspace>;
  warnings: string[];
  errors: string[];
}

/**
 * A unified interface for all Harness Adapters (Antigravity, Claude Code, Hermes, etc.)
 * that replaces ad-hoc regex scripts with robust parsing and serialization.
 */
export interface HarnessAdapter {
  id: AgentFramework;
  name: string;
  
  /**
   * Export an AgentWorkspace into the specific file formats required by this harness.
   * Async to support dynamic MCP schema resolution (e.g., via Context7/DeepWiki).
   */
  export(params: HarnessExportParams): Promise<HarnessExportResult>;
  
  /**
   * Parse raw configuration file(s) from this harness into an AgentWorkspace partial.
   * Async to support dynamic MCP schema resolution.
   */
  import(params: HarnessImportParams): Promise<HarnessImportResult>;
  
  /**
   * Validate if the given workspace is fully compatible with this harness.
   */
  validate(workspace: AgentWorkspace): Promise<ValidationResult>;
}
