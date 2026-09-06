# Dotabod frontend agent guidance

This repository contains the Dotabod website, dashboard, and OBS overlay. It is a Next.js application using TypeScript, React, Tailwind CSS, Redux, Prisma/Postgres, and a smaller Mongo Prisma schema.

## Work safely

- Inspect `git status --short` before editing and preserve unrelated changes.
- Follow the user's requested scope. Do not commit, deploy, send external messages, delete data, or mutate production unless that action is authorized.
- Before database work, identify the schema source of truth and effective target without printing credentials. Use disposable local databases for experiments.
- Keep secrets and real user data out of source, tests, logs, and reports.

## Commands

- Lightweight formatting: `pnpm exec oxfmt <edited files>`
- GitHub CI workflow: `.github/workflows/ci.yml`
- Manually dispatch CI for a pushed branch: `gh workflow run ci.yml --ref <branch>`
- Watch the dispatched run: `gh run watch --exit-status`

Install dependencies only when package or lockfile inputs changed, or when the installed environment is missing or inconsistent.

## Production-host resource policy

This checkout shares a host with production services. Builds and repository-wide checks must run only on GitHub-hosted runners.

- Never run `pnpm dev`, `pnpm build`, `pnpm build-local`, `next build`, `pnpm test`, `pnpm quality`, `pnpm check`, full-project lint/typecheck, Prisma generation, or the frontend verification harness on this host.
- Do not substitute a similar local build, test, browser, coverage, or static-analysis command. If GitHub Actions is unavailable, report verification as blocked.
- Local work is limited to inspection, editing, targeted formatting, `git diff --check`, and other negligible-cost operations.
- Commit with `--no-verify` if an older checkout still has resource-intensive hooks.
- For pre-merge verification, push a feature branch, dispatch `ci.yml` for that branch, and wait for a successful conclusion. Do not merge or push the change to `master` until remote CI passes.

## Code conventions

- Use strict TypeScript and React functional components with hooks.
- Use `@/` imports where configured.
- Follow mobile-first Tailwind patterns and prefer existing utilities/components over new custom CSS.
- Formatting uses Oxfmt: two-space indentation, single quotes, and no semicolons.
- Match the surrounding state-management and pages/app-router conventions rather than migrating architecture incidentally.

## Tests and verification

- Put tests in adjacent `__tests__` directories and follow nearby test patterns.
- Test through dependency seams and injected fakes. Avoid introducing new module mocks when a dependency seam is practical.
- Use `vi.stubEnv()` for environment changes and reset mocks between tests.
- Add regression tests for behavior changes when they meaningfully demonstrate the result. Use proportionate validation for prose, formatting, generated output, and low-impact configuration changes.
- For visual changes, inspect the rendered result at affected desktop and mobile sizes. Use the project verification skills only when their route/scope matches or production-bundle browser verification is needed.
- Put focused regression coverage in the change, but execute it through GitHub Actions rather than on this host.
- Before PR readiness, require the GitHub `CI` workflow to pass its quality, test, and production-build steps; distinguish pre-existing failures from regressions.

Finish when the requested behavior is implemented, the affected surface has been inspected, and relevant checks pass. Report any blocked or unverified requirement with the specific reason and the smallest next step.
