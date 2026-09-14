---
id: "card-add-zod-and-jsonschema-structured-output-support-0y4tj0e"
boardId: "default"
title: "Add Zod and jsonSchema structured output support"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-generation-pipeline-structured-output-1ja2q92"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:24:35.210Z"
updatedAt: "2026-08-20T08:24:35.210Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
Added Zod schema support for typed generation prompts and results. Integrated jsonSchema from the ai library for structured output parsing when experimental_output has a schema. Updated all providers (Anthropic, OpenAI, Google, Mistral) for structured output compatibility.

Commits: 07bf95e (feat: Add Zod schema support for generation), aacabbc (feat: Use jsonSchema for structured output)