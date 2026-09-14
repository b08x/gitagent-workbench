# Plan

## Solution Approach
Create a standalone containerized service (Local Agent Context Management) that acts as a unified knowledge graph and context backend for various local AI agent harnesses.
- Provide a `curl | bash` installer using `gum` for a rich Terminal User Interface (TUI) experience.
- The installer sets up a Docker container, automatically mounting host configuration paths for Antigravity (`~/.gemini`), Claude Code (`~/.claude`), Hermes (`~/.hermes`), mistral-vibe, and opencode.
- For ingestion, we will reuse the existing adapters already present in the codebase (e.g., `lib/gitagent/adapters/hermes-python.ts`, `parseCLAUDEmd.ts`, `parseGeminiSettings.ts`) where applicable.
- To address harness config drift and avoid rigid static parsing, we will implement a Hybrid Contextual RAG over the configuration files rather than relying solely on strict static skill definitions. 
- The hybrid backend relies on SQLite with `FTS5` (BM25) and `sqlite-vec` (vector KNN) for RRF fusion retrieval. The implementation will address known rough edges: parameterizing `k=60` and limits, introducing a token-based chunking strategy utilizing `tiktoken` (since accuracy is paramount), and ensuring all raw queries are sanitized via `buildSafeFtsQuery`.
- Conduct an architectural spike on incorporating `ax-agent-memory-skills`, `ax-agent-optimize`, and `ax-agent-observability`.

## Ordered Steps

1. **Scaffold Installer**
   - Create `install.sh` utilizing `gum` to prompt the user for which harnesses to include, verify Docker is running, and execute the `docker run` command with the appropriate volume mounts.
2. **Container Infrastructure**
   - Create a `Dockerfile` that bundles a Node.js/TypeScript environment, installing `sqlite3`, `sqlite-vec`, `tiktoken`, and other dependencies.
3. **Hybrid Contextual Database (SQLite + Vector)**
   - Implement the SQLite schema for chunks and entities.
   - Implement the RRF fusion retrieval (combining FTS5 `MATCH` and `sqlite-vec` KNN).
   - Ensure the query sanitization (`buildSafeFtsQuery`) is used across the board.
   - Parameterize fusion constants (`k`, `LIMIT`).
4. **Context Ingestion Pipeline (RAG over Configs)**
   - Instead of strict static parsing, implement an ingestion pipeline that leverages the existing parser logic (`lib/gitagent/adapters/`, `parseCLAUDEmd.ts`, etc.) to augment a token-based chunking process via `tiktoken`.
   - Store these enriched chunks into the SQLite vector/FTS5 store to enable semantic contextual retrieval across fast-moving config directories.
5. **`ax-*` Architectural Spike**
   - Research and debate the inclusion of `ax-agent-memory-skills`, `ax-agent-optimize`, and `ax-agent-observability`. Document decisions on whether to integrate them into the optimization loops.

## Verification for Each Step
1. **Installer**: Run `./install.sh` in a mock environment; verify `gum` TUI interactions and inspect the generated `docker run` command for correct `-v` flags.
2. **Infrastructure**: Build the Docker image and ensure the container starts without crashing, successfully loading the `sqlite-vec` extension and `tiktoken`.
3. **Database Core**: Write and run unit tests for the RRF fusion logic. Verify that `k` is configurable and that queries are sanitized.
4. **Ingestion Pipeline**: Write unit tests asserting that mock config directories for Antigravity, Claude, and Hermes are properly ingested via `tiktoken` chunking and existing adapter heuristics.
5. **Spike**: Produce an ADR (Architecture Decision Record) detailing the evaluation of the `ax-*` libraries.

## Risks and Open Questions
- **`sqlite-vec` Portability**: Ensuring the extension compiles or loads cleanly inside the Docker container across different host architectures (ARM64 vs AMD64).
- **tiktoken Payload Weight**: Bundling the token mappings for `tiktoken` inside the container increases the image size, though accuracy is the prioritized trade-off.
