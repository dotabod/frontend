# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- Dev server: `doppler run -- next dev` or `pnpm dev`
- Build: `pnpm build-local`
- Lint: `pnpm lint`
- Run all tests: `pnpm test`
- Run specific test: `pnpm exec vitest run <test file or pattern>`
- Watch tests: `pnpm test:watch`
- Test coverage: `pnpm test:coverage`

## Code Style

- TypeScript for all code with strict typing
- Formatting/linting via standalone Oxfmt + Oxlint: 2-space indentation, single quotes, avoid semicolons. Run `pnpm check` (or `pnpm format:fix && pnpm lint:fix`). Run `pnpm quality` for the full gate, including Knip's unused-code/dependency analysis.
- Use React functional components with hooks
- Use `@/` imports with paths configured in tsconfig.json
- Follow mobile-first responsive design with Tailwind CSS
- Prefer Tailwind utility classes over custom CSS

## Test Guidelines

- Place tests in `__tests__` folders next to source files
- Test through dependency seams and injected fakes instead of `vi.mock()`; legacy module mocks are migration violations under the anti-slop rules
- Follow Arrange-Act-Assert pattern
- Use `vi.stubEnv()` instead of direct environment variable assignment
- Reset mocks between tests with `vi.resetAllMocks()`
- Check VITEST_BEST_PRACTICES.md for more details

## Project Structure

- Next.js app with both `/pages` and `/app` directory structure
- Postgres DB accessed via Prisma
- Use redux for state management
- Follow folder structure conventions

## Review Checklist

- [ ] Run `pnpm install` after pulling remote changes.
- [ ] Run `pnpm quality` and `pnpm test` to format, lint, type check, detect unused code/dependencies, and test changes.
