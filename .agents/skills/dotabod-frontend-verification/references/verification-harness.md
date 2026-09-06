# Deterministic verification harness

The harness owns the disposable production-like environment. Feature adapters own data and assertions.

This harness requires a Linux environment with Bash, PostgreSQL tools, Chromium, and POSIX process groups. On Windows, use an available local Linux or WSL environment after checking prerequisites. If none is available, complete independent local checks and report browser verification as blocked. Do not substitute production services or weaken the local-database and cleanup safeguards.

## Standard run

Run from the repository root:

```bash
node .agents/skills/dotabod-frontend-verification/scripts/run-frontend-verification.mjs \
  --output-dir artifacts/<feature-name> \
  --seed-command '<optional feature fixture command>' \
  --verify-command '<feature browser audit command>'
```

The verification command receives:

- `FRONTEND_BASE_URL`: production Next server origin.
- `FRONTEND_CDP_URL`: Chromium DevTools endpoint.
- `FRONTEND_AXE_SCRIPT`: disposable axe-core script path, or an empty string with `--skip-axe`.
- `FRONTEND_OUTPUT_DIR`: absolute screenshot/report directory.
- `FRONTEND_APP_PORT`, `FRONTEND_CDP_PORT`, and `FRONTEND_POSTGRES_PORT`.
- `DATABASE_URL` and `DIRECT_URL`, always constrained to localhost by the harness.

Shell-expand these variables inside a single-quoted command passed to the harness:

```bash
--verify-command 'node path/to/audit.mjs \
  --base-url "$FRONTEND_BASE_URL" \
  --cdp-url "$FRONTEND_CDP_URL" \
  --axe-script "$FRONTEND_AXE_SCRIPT" \
  --output-dir "$FRONTEND_OUTPUT_DIR"'
```

## What the harness does

Unless skipped or overridden, it:

1. Checks that its three requested localhost ports are free.
2. Initializes a disposable trust-auth Postgres cluster on `127.0.0.1`.
3. Runs `pnpm generate:all`, then `pnpm exec prisma db push --skip-generate`.
4. Runs the optional seed command, then `pnpm exec next build --webpack`.
5. Starts `pnpm exec next start` with safe local/dummy environment values.
6. Starts headless Chromium with an isolated user-data directory and CDP port.
7. Installs the pinned axe-core version into a disposable directory.
8. Runs the feature verification command and writes `frontend-verification-report.json` plus service logs.
9. Stops only its own process groups and Postgres cluster, restores the known generated `next-env.d.ts` route-import change, and removes only its own temporary directories.

Webpack is deliberate: Next 16's default Turbopack production build has stalled silently in this repository. A missing Sentry auth-token warning and this project's standalone-output warning are acceptable only if the build and server otherwise succeed.

## Useful options

```text
--app-port <port>                 Default: 3100
--cdp-port <port>                 Default: 9223
--postgres-port <port>            Default: 55432
--output-dir <path>               Default: artifacts/frontend-verification
--check-command <command>         Repeatable preflight command
--seed-command <command>          Optional fixture command
--verify-command <command>        Required browser audit command
--env NAME=value                  Repeatable feature-specific environment value
--skip-database                   Do not start Postgres or push Prisma
--skip-generate                   Do not generate Prisma clients
--skip-build                      Reuse the existing production build
--skip-axe                        Do not provision axe-core
--keep-temporaries                Stop services but retain disposable directories
--axe-version <version>           Default: 4.10.3
--database-setup-command <cmd>    Override Prisma schema setup
--generate-command <cmd>          Override code generation
--build-command <cmd>             Override the production build
--start-command <cmd>             Override the production server command
```

Use non-default ports for concurrent runs. The harness fails rather than killing an unknown process already using a requested port.

Use `--skip-database` for features that do not render database-backed routes. Its dummy database URLs still point only at localhost so build-time code cannot inherit a production database accidentally.

## Feature audit expectations

Choose assertions based on the feature rather than copying a fixed checklist. Usually verify:

- The requested routes and real interaction journey.
- Desktop and mobile screenshots at the requested dimensions.
- Keyboard focus using real Tab input, not `element.focus()` when `:focus-visible` matters.
- Relevant accessibility names, states, roles, and exactly scoped axe WCAG 2.1 A/AA results.
- Computed typography, colors, layout, and overflow where the CSS cascade is part of the risk.
- Existing adjacent controls that the change must preserve.

Hide third-party widgets only inside screenshot automation. Do not edit product code to make captures cleaner.

## Completion

Inspect every screenshot before the harness exits if you are running infrastructure manually for debugging. For normal harness runs, inspect artifacts immediately afterward. Run relevant tests and static checks before browser verification. Repeat checks only if subsequent changes invalidate their earlier results. Finish with `pnpm check`, `git diff --check`, and `git status --short --branch` as appropriate to the request, and report any unmet verification requirement.
