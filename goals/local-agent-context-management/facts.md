# Facts

- The installation process is a `curl | bash` script that features a rich Terminal User Interface (TUI) designed using `gum`.
- The system scans the host environment to detect configurations for Antigravity, Claude Code, Hermes-agent (including profiles), mistral-vibe, and opencode.
- The system's importer logic distinguishes between how each supported harness handles its agents, sub-agents, skills, and plugins, applying specific parsing rules for each.
- The imported context is stored and managed using a hybrid contextual backend comprising a Vector Database and a Relational Database (e.g., Chroma + SQLite).
  - *Note: Chunking strategy uses recursive delimiter descent. Retrieval uses RRF fusion (k=60) combining FTS5 BM25, sqlite-vec, and SQL LIKE fallback.*
- The project includes an explicit architectural exploration phase to evaluate the inclusion of specific `ax-` libraries, specifically `ax-agent-optimize`, and `ax-agent-observability` alongside core DSPy patterns.
