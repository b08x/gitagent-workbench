---
id: "card-implement-server-side-ai-proxy-and-provider-refa-0jbj042"
boardId: "default"
title: "Implement server-side AI proxy and provider refactoring"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-ai-provider-integration-1hzazwa"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:24:13.122Z"
updatedAt: "2026-08-20T08:24:13.122Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
Migrated from client-only Vite server to Express+AI SDK proxy. Moved API key handling server-side via environment variables. Refactored generateWithRetryAndFallback to use proxy. Updated SettingsContext to support new TaskConfigParameters.

Commits: 7afa831 (feat: Migrate to Vite dev server and AI SDK), 6be76cd (refactor: improve provider integration and types)