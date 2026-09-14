The goal is to build a one-line installable, Docker-based local agent context management system. It will mount host configurations for harnesses like Antigravity, Claude Code, and Hermes, reusing existing parser adapters to perform Hybrid Contextual RAG (via SQLite vector/FTS5 and `tiktoken`) rather than rigid static extraction, while evaluating the inclusion of DSPy advanced `ax-*` agent libraries.

## Solution Approach
Create a standalone containerized service (Local Agent Context Management) that acts as a unified knowledge graph and context backend for various local AI agent harnesses.
- Provide a `curl | bash` installer using `gum` for a rich Terminal User Interface (TUI) experience.
- The installer sets up a Docker container, automatically mounting host configuration paths for Antigravity (`~/.gemini`), Claude Code (`~/.claude`), Hermes (`~/.hermes`), mistral-vibe, and opencode.
- For ingestion, we will reuse the existing adapters already present in the codebase.
- To address harness config drift and avoid rigid static parsing, we will implement a Hybrid Contextual RAG over the configuration files. 
- The hybrid backend relies on SQLite with `FTS5` (BM25) and `sqlite-vec` (vector KNN) for RRF fusion retrieval. The implementation will address known rough edges: parameterizing `k=60` and limits, introducing a token-based chunking strategy utilizing `tiktoken` (since accuracy is paramount), and ensuring all raw queries are sanitized via `buildSafeFtsQuery`.
- Conduct an architectural spike on incorporating `ax-agent-memory-skills`, `ax-agent-optimize`, and `ax-agent-observability`.
