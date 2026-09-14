---
id: "card-build-zip-export-engine-with-manifest-and-skill--1isu1jm"
boardId: "default"
title: "Build ZIP export engine with manifest and skill serialization"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-export-serialization-documentation-1f1ir3u"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:26:06.123Z"
updatedAt: "2026-08-20T08:26:06.123Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
serializer.ts ZIP export engine: generates agent.yaml manifest with stripNulls() for clean output, SKILL.md files with YAML frontmatter, config.yaml (Hermes config), and directory structure. js-yaml + jszip integration.

Commits: feat: Add Hermes config generation and export, feat: Enhance agent generation capabilities