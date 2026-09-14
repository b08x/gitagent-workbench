import sqlite3 from 'sqlite3';
import * as sqliteVec from 'sqlite-vec';

export class ContextDatabase {
  private db: sqlite3.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new sqlite3.Database(dbPath);
    sqliteVec.load(this.db as any);
  }

  async init() {
    return new Promise<void>((resolve, reject) => {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS config_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT UNIQUE,
          harness TEXT,
          last_modified INTEGER
        );

        CREATE TABLE IF NOT EXISTS chunks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_id INTEGER,
          content TEXT,
          token_count INTEGER,
          FOREIGN KEY (file_id) REFERENCES config_files(id)
        );

        -- FTS5 table for BM25 text search
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
          content,
          content='chunks',
          content_rowid='id'
        );

        -- Vector table for semantic search (using 1536 dimensions as standard for many models)
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
          chunk_id INTEGER PRIMARY KEY,
          embedding float[1536]
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Sanitizes user input for FTS5 queries to prevent syntax errors or injection
   */
  buildSafeFtsQuery(rawQuery: string): string {
    const safe = rawQuery.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    return safe.split(/\s+/).map(word => `"${word}"`).join(' OR ');
  }

  private dbAll<T = any>(sql: string, params: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  /**
   * Reciprocal Rank Fusion (RRF) search combining BM25 and Vector KNN
   */
  async rrfFusionSearch(queryText: string, queryEmbedding: Float32Array, k: number = 60, limit: number = 10) {
    const safeQuery = this.buildSafeFtsQuery(queryText);
    
    const ftsLimit = limit * 2;
    const vecLimit = limit * 2;

    // 1. BM25 Search
    const ftsResults = await this.dbAll<{ id: number; score: number }>(`
      SELECT rowid as id, bm25(chunks_fts) as score 
      FROM chunks_fts 
      WHERE chunks_fts MATCH ? 
      ORDER BY bm25(chunks_fts)
      LIMIT ?
    `, [safeQuery, ftsLimit]);

    // 2. Vector KNN Search
    const vecBuffer = Buffer.from(queryEmbedding.buffer);
    const vecResults = await this.dbAll<{ id: number; score: number }>(`
      SELECT chunk_id as id, distance as score 
      FROM vec_chunks 
      WHERE embedding MATCH ? AND k = ?
      ORDER BY distance
    `, [vecBuffer, vecLimit]);

    // 3. RRF Fusion
    const scores = new Map<number, number>();
    
    ftsResults.forEach((row, index) => {
      const rank = index + 1;
      const rrfScore = 1.0 / (k + rank);
      scores.set(row.id, (scores.get(row.id) || 0) + rrfScore);
    });

    vecResults.forEach((row, index) => {
      const rank = index + 1;
      const rrfScore = 1.0 / (k + rank);
      scores.set(row.id, (scores.get(row.id) || 0) + rrfScore);
    });

    const fusedIds = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);

    if (fusedIds.length === 0) return [];

    // 4. Fetch final chunks
    const placeholders = fusedIds.map(() => '?').join(',');
    const finalChunks = await this.dbAll<{ id: number; content: string; token_count: number; source_file: string; harness: string }>(`
      SELECT c.id, c.content, c.token_count, f.path as source_file, f.harness
      FROM chunks c
      JOIN config_files f ON c.file_id = f.id
      WHERE c.id IN (${placeholders})
    `, fusedIds);

    return fusedIds.map(id => finalChunks.find(c => c.id === id));
  }
}
