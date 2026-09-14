# Goal: Local Agent Context Management

The goal is to build a one-line installable, Docker-based local agent context management system. It will mount host configurations for harnesses like Antigravity, Claude Code, and Hermes, reusing existing parser adapters to perform Hybrid Contextual RAG (via SQLite vector/FTS5 and `tiktoken`) rather than rigid static extraction, while evaluating the inclusion of DSPy advanced `ax-*` agent libraries.

- **Facts**: See [facts.md](facts.md) for the shared understanding of functionality and technical constraints.
- **Plan**: See [plan.md](plan.md) for the execution strategy, including the RAG design and installer scaffolding.

## Done Condition
This goal is complete when the `install.sh` TUI script correctly launches the Docker container, the existing harness configs are chunked and ingested via `tiktoken` into the hybrid SQLite vector backend, retrieval works via RRF fusion, and an ADR is written deciding on the `ax-*` patterns.
