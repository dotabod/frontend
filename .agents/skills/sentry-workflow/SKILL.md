---
name: sentry-workflow
description: Route requests explicitly involving Sentry issues, Sentry or Seer PR findings, or Sentry SDK upgrades.
license: Apache-2.0
role: router
---

> [All Skills](../../SKILL_TREE.md)

# Sentry Workflows

Debug production issues and maintain code quality with Sentry context. This page helps you find the right workflow skill for your task.

## How to Fetch Skills

Use `curl` to download skills — they are 10–20 KB files that fetch tools often summarize, losing critical details.

    curl -sL https://skills.sentry.dev/sentry-fix-issues/SKILL.md

Append the path from the `Path` column in the table below to `https://skills.sentry.dev/`. Do not guess or shorten URLs.

## Route the request

1. If the user mentions **fixing errors, debugging exceptions, or investigating production issues** → `sentry-fix-issues`
2. If the user mentions **Sentry bot comments or `sentry[bot]` on a PR** → `sentry-code-review`
3. If the user mentions **Seer, bug prediction, or reviewing PRs for predicted issues** → `sentry-pr-code-review`
4. If the user mentions **upgrading Sentry, migrating SDK versions, or fixing deprecated APIs**, use current official Sentry guidance; no dedicated upgrade workflow is installed in this checkout.

Route from the user's request and existing session context. Ask only when multiple materially different workflows remain plausible. Load an installed local workflow first; fetch a remote copy only when the needed workflow is absent or an update is necessary.

---

## Workflow Skills

| Use when                                                                                  | Skill                                                        | Path                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Finding and fixing production issues — stack traces, breadcrumbs, event data              | [`sentry-fix-issues`](../sentry-fix-issues/SKILL.md)         | `sentry-fix-issues/SKILL.md`     |
| Resolving comments from `sentry[bot]` on GitHub PRs                                       | [`sentry-code-review`](../sentry-code-review/SKILL.md)       | `sentry-code-review/SKILL.md`    |
| Fixing issues detected by Seer Bug Prediction in PR reviews                               | [`sentry-pr-code-review`](../sentry-pr-code-review/SKILL.md) | `sentry-pr-code-review/SKILL.md` |
| Upgrading the Sentry JavaScript SDK — migration guides, breaking changes, deprecated APIs | Current official Sentry guidance                          | No local workflow installed      |

Each workflow contains its own prerequisites and validation. Apply the relevant requirements while preserving current repository evidence and user scope.

---

Looking for SDK setup or feature configuration instead? See the [full Skill Tree](../../SKILL_TREE.md).
