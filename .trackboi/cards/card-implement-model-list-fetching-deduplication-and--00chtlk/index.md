---
id: "card-implement-model-list-fetching-deduplication-and--00chtlk"
boardId: "default"
title: "Implement model list fetching, deduplication, and fallback support"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-ai-provider-integration-1hzazwa"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:24:13.404Z"
updatedAt: "2026-08-20T08:24:13.404Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
Dynamic chat model fetching with deduplication across providers. Added fallback model support for generation resilience — primary model fails, secondary attempts. Updated OrchestratorConfig and UI for fallback configuration.

Commits: fe9e8af (feat: Add fallback model support for generation), d7db88a (feat: Fetch and deduplicate chat models), 9ece981 (chore: update default models and fetch logic)