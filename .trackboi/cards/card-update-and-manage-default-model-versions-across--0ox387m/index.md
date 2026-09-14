---
id: "card-update-and-manage-default-model-versions-across--0ox387m"
boardId: "default"
title: "Update and manage default model versions across providers"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-ai-provider-integration-1hzazwa"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:24:13.693Z"
updatedAt: "2026-08-20T08:24:13.693Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
Tracked default model evolution: Claude 3.5 Sonnet → Gemini-2.0-flash-exp → Gemini 3.7 Flash. Added Claude 3.7 Sonnet and additional Gemini models. Made modelId mandatory across providers. Implemented live Google model discovery via server proxy.

Commits: 562c694, 58c934b, 9ece981, 0ccaf1c (feat: Make modelId mandatory for LLM providers)