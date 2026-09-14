---
id: "card-add-multi-provider-ai-support-anthropic-openai-g-0vv20vc"
boardId: "default"
title: "Add multi-provider AI support (Anthropic, OpenAI, Google, Mistral, Groq, OpenRouter)"
parentId: null
scope: {"kind":"project","ref":"global"}
trackId: "track-ai-provider-integration-1hzazwa"
column: "done"
rank: "j"
labels: []
assignee: null
fieldValues: {}
createdAt: "2026-08-20T08:24:12.833Z"
updatedAt: "2026-08-20T08:24:12.833Z"
createdBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
updatedBy: "agent_01M0F46GJK1XVWGVS50ZWYCF02"
---
Integrated OpenAI, Anthropic, Mistral, Groq, and OpenRouter providers. Created provider wrappers in lib/providers/. Updated SettingsContext to manage API keys for each provider. Added provider icons from @lobehub/icons. Enabled browser support for Groq provider.

Commits: 07decf4 (feat: Add support for multiple AI providers), f563a87, 3b9841c (feat: Add Groq and Ollama AI providers)