---
name: verify-dotabod
description: Verify Dotabod's Next.js web frontend through its real public streamer-profile and OBS overlay UI in an isolated local or GitHub-hosted environment. Use when changes affect the profile overview, match history, hero win rates, cosmetic collection, hero detail, dev overlay, responsive layout, navigation, images, or scoped accessibility.
---

# Verify Dotabod

Drive Dotabod as a user through a production Next.js bundle, isolated Postgres data, and headless Chromium. The feature map covers the public streamer profile and the deterministic OBS dev overlay. The authenticated dashboard is not yet covered.

Read [features/README.md](features/README.md) before choosing a route. Also read the shared [frontend verification skill](../dotabod-frontend-verification/SKILL.md) and its [harness reference](../dotabod-frontend-verification/references/verification-harness.md) before changing infrastructure or lifecycle behavior.

## Safety boundary

- Run end-to-end verification only on a developer machine with enough capacity or through the GitHub-hosted workflow at `.github/workflows/verify-dotabod.yml`.
- The harness supports macOS and Linux. It refuses non-local database URLs and owns its disposable Postgres, Chromium profile, ports, and child processes.
- Dispatching a workflow and pushing a branch require user authorization. Do not commit, push, or dispatch merely because this skill was selected.
- The browser workflow runs for matching pull-request paths and supports manual dispatch. It complements, but does not replace, the repository's required `CI` workflow.
- Never point the fixture seed at an existing or non-local database. Never drive a server or browser that this run did not start.

## Launch

Run the complete mapped pass locally from the repository root:

```bash
.agents/skills/verify-dotabod/scripts/run-profile-verification.sh
```

The helper discovers Chrome/Chromium and PostgreSQL on macOS or Linux, then passes their locations to the shared harness. Do not run a second copy against the same default ports.

For a GitHub-hosted run, the branch containing the code and verification files must already be pushed. Dispatch the manual workflow:

```bash
gh workflow run verify-dotabod.yml --ref "$(git branch --show-current)"
```

Find and watch the run:

```bash
gh run list --workflow verify-dotabod.yml --branch "$(git branch --show-current)" --event workflow_dispatch --limit 3
gh run watch <run-id> --exit-status
```

Both launch paths invoke [scripts/run-profile-verification.sh](scripts/run-profile-verification.sh). The underlying harness reports these readiness lines before driving the UI:

```text
[frontend-verification] Next production server ready at http://127.0.0.1:3100
[frontend-verification] Chromium CDP ready at http://127.0.0.1:9223/json/version
```

The harness owns launch and teardown as one operation. It stops only its child process groups and disposable Postgres cluster in a `finally` path, including after a failed verification command.

## Doctor

Run this read-only prerequisite check before launching locally or on GitHub:

```bash
.agents/skills/verify-dotabod/scripts/run-profile-verification.sh --doctor
```

Doctor confirms macOS or Linux, Node, pnpm, Git, Chromium, PostgreSQL tools, the repository revision, and the required adapter files. During launch, the shared harness additionally requires its app, CDP, and Postgres ports to be free, waits for the production URL and CDP endpoint, and the adapters require a real Chromium page target. Treat any failed gate as an unhealthy instance; inspect the named log instead of bypassing it.

## Drive

The local and GitHub launch paths run this exact helper:

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

The same isolated run opens `/overlay/<fixture-user-id>` with dev mode enabled before hydration. It verifies 16:9 and 21:9 background images, the playing and picks layouts, Pro-gated sample chat rendering, chat clearing, the dev-image toggle, scoped accessibility, and browser/static-asset failures. The socket URL is pinned to a closed localhost port so the pass cannot contact the production GSI service.

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
- Five overlay screenshots exist: playing at 16:9 and 21:9, picks with the dev background, a sample chat message, and picks without the dev background.
- `overlay-dev-mode-audit.json` records both OBS-sized viewports, loaded image dimensions, selected layout transitions, chat add/clear state, zero failed static assets, zero browser exceptions, and zero scoped WCAG 2.1 A/AA violations.
- The action and resulting state are both present in the audit. A final screenshot alone is insufficient.
- A human or image-capable agent inspects every relevant screenshot for clipping, overlap, weak hierarchy, broken responsive layout, and unexpected third-party UI.
- For mutations, verify a second user-facing read of the stored result. The current mapped run is read-only after its disposable fixture seed.

Mocks are acceptable only at an existing production boundary. This workflow uses safe dummy credentials, an isolated local database, and public page props for the fixture; it does not mutate production. Report each skipped or unreachable entry point separately rather than treating a nearby route as equivalent proof.

## Cleanup

Do not kill processes by name. The shared harness tracks the exact process groups it starts, stops its own Next server, Chromium, and Postgres, restores only the known generated `next-env.d.ts` route-import change, and removes only its explicit temporary directories.

The cleanup intentionally preserves `artifacts/verify-dotabod/profile-navigation/`, and the workflow uploads that directory even when the verification step fails. After a failure, inspect the report and logs before rerunning. On a local failure, the harness still tears down only its own child processes and disposable directories. A cancelled GitHub-hosted job is isolated by destruction of its runner; do not attempt cleanup against another machine.

## Helpers

- [scripts/run-profile-verification.sh](scripts/run-profile-verification.sh): guarded entry point for doctor and the complete mapped browser pass. Invoke it with `--doctor` or with no arguments.
- [shared harness](../dotabod-frontend-verification/scripts/run-frontend-verification.mjs): owns ports, Postgres, generation, build, Next, Chromium, axe, reports, and cleanup. Do not reproduce its lifecycle commands.
- [fixture seed](../dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs): fetches public profile props and writes only to a localhost database.
- [browser adapter](../dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs): captures screenshots and the machine-readable route audit.
- [overlay fixture](scripts/seed-overlay-fixture.mjs): adds an active Pro subscription to the disposable profile user and records its generated ID.
- [overlay adapter](scripts/audit-overlay-dev-mode.mjs): drives the deterministic OBS dev overlay and captures its audit and screenshots.
- `.github/workflows/verify-dotabod.yml`: path-scoped pull-request check, manual launcher, and artifact uploader.

Keep this map current with `$maintain-verification-skill` when routes, handles, fixture requirements, or proof standards change.
