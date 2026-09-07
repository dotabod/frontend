---
name: verify-dotabod
description: Verify Dotabod's Next.js web frontend through its real public streamer-profile UI on GitHub-hosted runners. Use when changes affect the profile overview, match history, hero win rates, cosmetic collection, hero detail, responsive layout, navigation, or scoped accessibility.
---

# Verify Dotabod

Drive Dotabod as a user through a production Next.js bundle, isolated Postgres data, and headless Chromium. The primary surface is the web UI. The authenticated dashboard and OBS overlay are secondary surfaces and are not yet covered by this feature map.

Read [features/README.md](features/README.md) before choosing a route. Also read the shared [frontend verification skill](../dotabod-frontend-verification/SKILL.md) and its [harness reference](../dotabod-frontend-verification/references/verification-harness.md) before changing infrastructure or lifecycle behavior.

## Safety boundary

- Never run the build, test suite, production server, browser harness, Prisma generation, or database setup on this production-shared host.
- End-to-end verification runs only in the GitHub-hosted workflow at `.github/workflows/verify-dotabod.yml`.
- Dispatching a workflow and pushing a branch require user authorization. Do not commit, push, or dispatch merely because this skill was selected.
- The browser workflow runs for matching pull-request paths and supports manual dispatch. It complements, but does not replace, the repository's required `CI` workflow.
- Never point the fixture seed at an existing or non-local database. Never drive a server or browser that this run did not start.

## Launch

The branch containing the code and verification files must already be pushed. Dispatch the manual workflow from the repository root:

```bash
gh workflow run verify-dotabod.yml --ref "$(git branch --show-current)"
```

Find and watch the run:

```bash
gh run list --workflow verify-dotabod.yml --branch "$(git branch --show-current)" --event workflow_dispatch --limit 3
gh run watch <run-id> --exit-status
```

The GitHub job installs dependencies and invokes [scripts/run-profile-verification.sh](scripts/run-profile-verification.sh). The underlying harness reports these readiness lines before driving the UI:

```text
[frontend-verification] Next production server ready at http://127.0.0.1:3100
[frontend-verification] Chromium CDP ready at http://127.0.0.1:9223/json/version
```

The harness owns launch and teardown as one operation. It stops only its child process groups and disposable Postgres cluster in a `finally` path, including after a failed verification command.

## Doctor

Inside a GitHub-hosted runner, run this read-only prerequisite check before launching:

```bash
.agents/skills/verify-dotabod/scripts/run-profile-verification.sh --doctor
```

Doctor refuses non-GitHub-hosted execution, confirms Linux, Node, pnpm, Git, Chromium, PostgreSQL tools, the repository revision, and the required adapter files. During launch, the shared harness additionally requires its app, CDP, and Postgres ports to be free, waits for the production URL and CDP endpoint, and the adapter requires a real Chromium page target. Treat any failed gate as an unhealthy instance; inspect the named log instead of bypassing it.

## Drive

The workflow runs this exact helper:

```bash
.agents/skills/verify-dotabod/scripts/run-profile-verification.sh
```

It seeds `maxid1337` and hero `2` into disposable local Postgres, then drives these user routes at desktop `1440x1000` and mobile `390x844`:

- `/maxid1337`
- `/maxid1337/matches`
- `/maxid1337/matches?view=heroes`
- `/maxid1337/set`
- `/maxid1337/set/2`

The adapter uses stable handles from the product: `[data-testid="profile-match-overview"]`, `nav[aria-label="Profile sections"]`, `nav[aria-label="Match history view"]`, `nav[aria-label="Match history period"]`, `table[aria-label="Most played heroes"]`, `table[aria-label="Latest matches"]`, and `table[aria-label="Recent matches"]`. It clicks real links, sends real Tab key events for `:focus-visible`, and never sets application state through test-only endpoints.

Use the matching feature file for the expected visible state and artifact names. A pass on one route does not prove another mapped route.

## Evidence

The workflow uploads the `dotabod-profile-verification` artifact. Download it after the run:

```bash
gh run download <run-id> --name dotabod-profile-verification --dir artifacts/verify-dotabod/github-run-<run-id>
```

Require all of the following:

- `frontend-verification-report.json` has `"status": "passed"`.
- `profile-navigation-audit.json` records both viewports, route assertions, the keyboard-focus result, the navigation journey, and zero scoped WCAG 2.1 A/AA violations.
- Ten screenshots exist: profile overview, match history, hero win rates, collection, and hero detail at desktop and mobile sizes.
- The action and resulting state are both present in the audit. A final screenshot alone is insufficient.
- A human or image-capable agent inspects every relevant screenshot for clipping, overlap, weak hierarchy, broken responsive layout, and unexpected third-party UI.
- For mutations, verify a second user-facing read of the stored result. The current mapped run is read-only after its disposable fixture seed.

Mocks are acceptable only at an existing production boundary. This workflow uses safe dummy credentials, an isolated local database, and public page props for the fixture; it does not mutate production. Report each skipped or unreachable entry point separately rather than treating a nearby route as equivalent proof.

## Cleanup

Do not kill processes by name. The shared harness tracks the exact process groups it starts, stops its own Next server, Chromium, and Postgres, restores only the known generated `next-env.d.ts` route-import change, and removes only its explicit temporary directories.

The cleanup intentionally preserves `artifacts/verify-dotabod/profile-navigation/`, and the workflow uploads that directory even when the verification step fails. After a failure, inspect the report and logs before rerunning. A cancelled GitHub-hosted job is isolated by destruction of its runner; do not attempt cleanup against another machine.

## Helpers

- [scripts/run-profile-verification.sh](scripts/run-profile-verification.sh): guarded entry point for doctor and the complete mapped browser pass. Invoke it with `--doctor` or with no arguments.
- [shared harness](../dotabod-frontend-verification/scripts/run-frontend-verification.mjs): owns ports, Postgres, generation, build, Next, Chromium, axe, reports, and cleanup. Do not reproduce its lifecycle commands.
- [fixture seed](../dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs): fetches public profile props and writes only to a localhost database.
- [browser adapter](../dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs): captures screenshots and the machine-readable route audit.
- `.github/workflows/verify-dotabod.yml`: path-scoped pull-request check, manual launcher, and artifact uploader.

Keep this map current with `$maintain-verification-skill` when routes, handles, fixture requirements, or proof standards change.
