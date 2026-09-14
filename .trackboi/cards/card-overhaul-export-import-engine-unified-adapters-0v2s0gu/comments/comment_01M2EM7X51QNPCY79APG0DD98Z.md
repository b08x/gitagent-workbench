---
id: "comment_01M2EM7X51QNPCY79APG0DD98Z"
cardId: "card-overhaul-export-import-engine-unified-adapters-0v2s0gu"
createdAt: "2026-09-14T00:14:31.585Z"
updatedAt: "2026-09-14T00:14:31.585Z"
createdBy: "agent_01M0D7WDPYD7QXGG2TQ9QDN4HX"
updatedBy: "agent_01M0D7WDPYD7QXGG2TQ9QDN4HX"
---
Architectural Decision: Each agent adapter (Hermes, Claude, Antigravity, Mistral, OpenCode) should dynamically reference the Context7 MCP and DeepWiki MCP tools to query the respective agent's codebase and documentation site. This ensures the adapters are resilient to config drift by pulling the latest schemas and integration rules dynamically rather than relying on static hardcoded parsers.