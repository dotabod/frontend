# Dotabod verification map

This directory is the maintained source for verifying Dotabod's public streamer-profile experience. Read this index before driving the app, then use every feature file affected by the change.

## Baseline preconditions

- Run only through `.github/workflows/verify-dotabod.yml` on a GitHub-hosted Linux runner.
- The branch under test is pushed and contains the same revision the workflow checks out.
- The standard repository `CI` workflow passes separately before PR readiness.
- The runner can reach `https://dotabod.com` to read the public `maxid1337` collection fixture.
- The harness owns free localhost ports `3100`, `9223`, and `55432`, a disposable Postgres cluster, a disposable Chromium profile, and a disposable axe installation.
- The fixture user is `maxid1337`; the detail route uses hero ID `2`.
- Never drive an existing server, browser, database, or user profile.

## Driving conventions

- Matching pull requests run the workflow automatically. Dispatch it manually only after the user has authorized the external action.
- The workflow runs `.agents/skills/verify-dotabod/scripts/run-profile-verification.sh`; do not recreate infrastructure commands in a feature recipe.
- Start with the direct route named in the feature file, then exercise its listed links or controls.
- Prefer accessible names, roles, test IDs, and route paths over coordinates or DOM position.
- Treat desktop and mobile as separate entry points. A pass at one viewport does not prove the other.
- The adapter covers all mapped routes in one isolated run. Report results per feature rather than collapsing them into one generic pass.

## Proof and skip reporting

- Capture the user action and the resulting state, not only a final screen.
- Inspect `profile-navigation-audit.json` and `frontend-verification-report.json` before screenshots.
- UI proof includes the matching desktop and mobile screenshots with Dotabod identity and route content visible.
- Navigation proof includes the requested path and the correct `aria-current="page"` state.
- Accessibility proof is limited to the exact axe root recorded by the adapter; do not claim a full-page audit when only a navigation region was scanned.
- Record the workflow run ID and commit SHA with the evidence.
- Report an unreachable route with the workflow log and unmet precondition. Do not substitute a production screenshot or another route.
- Preserve downloaded artifacts after cleanup.

## Features

- [Streamer profile overview](./streamer-profile-overview.md) covers the compact hero and match summaries and their links to full history views.
- [Match history](./match-history.md) covers match rows, hero win rates, periods, pagination, section navigation, and keyboard focus.
- [Cosmetic collection](./cosmetic-collection.md) covers the public collection route, hero entry points, and its active profile section.
- [Hero cosmetic detail](./hero-cosmetic-detail.md) covers an individual loadout, sibling navigation, collection return path, and active profile section.
