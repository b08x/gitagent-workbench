---
id: "card-implement-prompt-template-system-with-dimension--1thrnr2"
boardId: "default"
title: "Implement prompt template system with dimension profiles"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-generation-pipeline-structured-output-1ja2q92"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:24:35.503Z"
updatedAt: "2026-08-20T08:24:35.503Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
Built prompt templates per generation phase in lib/generation/prompts/. Added per-file dimension profiles for finer control (SOUL.md vs RULES.md vs DUTIES.md). Added AGENT_TEMPLATES for specialized agents (data-analyst, web-scraper, researcher).

Commits: ca8a119, feat: Enhance agent generation with file-specific profiles, feat: Introduce new agent templates and dashboard