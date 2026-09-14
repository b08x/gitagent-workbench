import { encoding_for_model, get_encoding } from 'tiktoken';
import { ContextDatabase } from './db';
import fs from 'fs/promises';
import path from 'path';

export class IngestionPipeline {
  private db: ContextDatabase;
  private tokenizer;

  constructor(db: ContextDatabase) {
    this.db = db;
    // tiktoken is used for highly accurate token counting/chunking
    this.tokenizer = get_encoding('cl100k_base');
  }

  /**
   * Chunk text accurately using tiktoken to prevent boundary splitting
   */
  chunkText(text: string, maxTokens: number = 512): string[] {
    const tokens = this.tokenizer.encode(text);
    const chunks: string[] = [];
    
    for (let i = 0; i < tokens.length; i += maxTokens) {
      const chunkTokens = tokens.slice(i, i + maxTokens);
      const chunkStr = new TextDecoder().decode(this.tokenizer.decode(chunkTokens));
      chunks.push(chunkStr);
    }
    
    return chunks;
  }

  /**
   * Recursively scan a config directory and ingest files
   */
  async ingestDirectory(dirPath: string, harnessName: string) {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          // Skip hidden directories like .git
          if (file.name.startsWith('.')) continue;
          await this.ingestDirectory(fullPath, harnessName);
        } else if (file.isFile() && this.isIngestable(file.name)) {
          await this.ingestFile(fullPath, harnessName);
        }
      }
    } catch (e) {
      console.error(`Failed to ingest directory ${dirPath}:`, e);
    }
  }

  private isIngestable(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.md', '.json', '.yaml', '.yml', '.py', '.ts'].includes(ext);
  }

  private async ingestFile(filePath: string, harnessName: string) {
    // 1. Read file
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 2. Use GitAgent adapters to extract structural metadata to augment chunks
    let structuralContext = '';
    try {
      // Assuming harnessName aligns with AgentFramework like 'claude_code' or 'hermes_agent'
      const adapter = require('../../lib/gitagent/adapters').getAdapter(harnessName as any);
      if (adapter) {
        const result = await adapter.import({ rawContent: content });
        if (result.partialWorkspace) {
          structuralContext = `[Metadata: Structurally parsed as ${harnessName} agent config. Has skills: ${Object.keys(result.partialWorkspace.skills || {}).length}, Has tools: ${Object.keys(result.partialWorkspace.tools || {}).length}]\n\n`;
        }
      }
    } catch (e) {
      // Ignore if adapter fails or doesn't exist for this harness
    }
    
    // 3. Chunk, prepending metadata to each chunk for better semantic context
    const enrichedContent = structuralContext + content;
    const chunks = this.chunkText(enrichedContent, 512);
    
    // 4. In a full implementation, we'd embed these chunks with an LLM here 
    // and store in ContextDatabase `chunks` and `vec_chunks` tables.
    console.log(`Ingested ${filePath}: ${chunks.length} chunks extracted for ${harnessName}`);
  }
}
