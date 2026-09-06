---
name: sentry-feature-setup
description: Route requests to configure Sentry AI monitoring, OpenTelemetry integration, or alerts.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Feature Setup

Configure specific Sentry capabilities beyond basic SDK setup — AI monitoring, OpenTelemetry pipelines, and alerts. This page helps you find the right feature skill for your task.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing critical details.

    curl -sL https://skills.sentry.dev/sentry-setup-ai-monitoring/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not guess or shorten URLs.

## Route the request

1. If the user mentions **AI monitoring, LLM tracing, conversations, or instrumenting an AI SDK** (OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI, Pydantic AI) → `sentry-setup-ai-monitoring`
2. If the user mentions **OpenTelemetry, OTel Collector, or multi-service telemetry routing**, use current official Sentry guidance; no dedicated exporter workflow is installed in this checkout.
3. If the user mentions **alerts, notifications, on-call, Slack/PagerDuty/Discord integration, or workflow rules** → `sentry-create-alert`

Route from the user's request and existing session context. Ask only when multiple materially different features remain plausible. Load an installed local workflow first; fetch a remote copy only when the needed workflow is absent or an update is necessary.

---

## Feature Skills

| Feature                                                                                                             | Skill                                                                  | Path                                  |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| AI/LLM monitoring and conversations — instrument OpenAI, Anthropic, LangChain, Vercel AI, Google GenAI, Pydantic AI | [`sentry-setup-ai-monitoring`](../sentry-setup-ai-monitoring/SKILL.md) | `sentry-setup-ai-monitoring/SKILL.md` |
| OpenTelemetry Collector with Sentry Exporter — multi-project routing, automatic project creation                    | Current official Sentry guidance                                      | No local workflow installed           |
| Alerts via workflow engine API — email, Slack, PagerDuty, Discord                                                   | [`sentry-create-alert`](../sentry-create-alert/SKILL.md)               | `sentry-create-alert/SKILL.md`        |

Each workflow contains its own prerequisites and validation. Apply the relevant requirements while preserving current repository evidence and user scope.

---

Looking for SDK setup or debugging workflows instead? See the [full Skill Tree](../../SKILL_TREE.md).
