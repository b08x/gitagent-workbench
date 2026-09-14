---
id: "card-overhaul-export-import-engine-unified-adapters-0v2s0gu"
boardId: "default"
title: "Overhaul Export/Import Engine (Unified Adapters)"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-local-agent-context-management-06ttzda"
column: "todo"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-09-14T00:08:54.895Z"
updatedAt: "2026-09-14T00:19:52.280Z"
createdBy: "agent_01M0D7WDPYD7QXGG2TQ9QDN4HX"
updatedBy: "agent_01M0D7WDPYD7QXGG2TQ9QDN4HX"
---
Completely overhaul the brittle export/import features (`parseCLAUDEmd.ts`, `parseGeminiSettings.ts`, `hermes-python.ts`). Replace regex-heavy scripts with a unified `HarnessAdapter` interface that handles parsing and serialization robustly across Antigravity, Claude Code, Hermes, Mistral Vibe, and OpenCode.