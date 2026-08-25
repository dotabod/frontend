---
name: dotabod-frontend-verification
description: Build, host, and browser-verify any Dotabod frontend feature in a deterministic isolated environment. Use when production-bundle verification, real responsive screenshots, feature-specific browser assertions, local database fixtures, or scoped axe WCAG auditing are requested in this repository.
---

# Dotabod frontend verification

Use this skill for reusable verification infrastructure, regardless of route or feature. A feature-specific workflow should own only its fixture seed and browser assertions.

## Verification contract

- Preserve the existing worktree. Record `git status --short` before starting; never clean, reset, or overwrite unrelated changes.
- Run the feature's narrow tests and static checks before the production browser pass.
- Use [scripts/run-frontend-verification.mjs](scripts/run-frontend-verification.mjs) to create and clean up the isolated services. Do not reproduce its Postgres, build, server, Chromium, axe, port, or cleanup commands by hand unless debugging the harness itself.
- Pass feature behavior through `--seed-command` and the required `--verify-command`. Commands receive stable `FRONTEND_*` environment variables rather than owning infrastructure.
- Keep generated screenshots and reports under `artifacts/`; the directory is intentionally ignored by Git.
- Inspect screenshots before declaring success. A passing DOM or axe assertion does not prove the visual result is sound.
- Stop only processes started by the harness and delete only its explicit `mktemp` directories. Never point fixture setup at a non-local database.
- Do not commit unless explicitly requested.

Read [references/verification-harness.md](references/verification-harness.md) when preparing or running a production browser verification pass.

## Feature adapters

A reusable feature adapter should:

1. Seed only data the feature needs and reject unsafe external mutation targets.
2. Accept the harness URLs and paths through `FRONTEND_BASE_URL`, `FRONTEND_CDP_URL`, `FRONTEND_AXE_SCRIPT`, and `FRONTEND_OUTPUT_DIR`.
3. Exit nonzero for observable failures and write a machine-readable audit report beside its screenshots.
4. Cover the requested desktop and mobile viewports, keyboard behavior, relevant computed styles, navigation or interaction journeys, and scoped WCAG 2.1 A/AA checks.

Keep feature-specific product invariants in the feature's tests or specialized skill, not in this general harness.
