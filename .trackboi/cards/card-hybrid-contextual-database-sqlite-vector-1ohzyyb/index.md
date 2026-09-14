---
id: "card-hybrid-contextual-database-sqlite-vector-1ohzyyb"
boardId: "default"
title: "Hybrid Contextual Database (SQLite + Vector)"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-local-agent-context-management-06ttzda"
column: "todo"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-09-14T00:04:17.497Z"
updatedAt: "2026-09-14T00:04:17.497Z"
createdBy: "agent_01M0D7WDPYD7QXGG2TQ9QDN4HX"
updatedBy: "agent_01M0D7WDPYD7QXGG2TQ9QDN4HX"
---
Implement the SQLite schema for chunks and entities. Implement the RRF fusion retrieval (combining FTS5 `MATCH` and `sqlite-vec` KNN). Ensure query sanitization (`buildSafeFtsQuery`) is used across the board. Parameterize fusion constants (`k`, `LIMIT`).