# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- Dev server: `doppler run -- next dev` or `bun run dev`
- Build: `bun run build-local`
- Lint: `bun run lint`
- Run all tests: `bun run test`
- Run specific test: `bun run vitest run <test file or pattern>`
- Watch tests: `bun run test:watch`
- Test coverage: `bun run test:coverage`

## Code Style

- TypeScript for all code with strict typing
- Follow Biome formatting rules: 2-space indentation, single quotes, avoid semicolons
- Use React functional components with hooks
- Use `@/` imports with paths configured in tsconfig.json
- Follow mobile-first responsive design with Tailwind CSS
- Prefer Tailwind utility classes over custom CSS

## Test Guidelines

- Place tests in `__tests__` folders next to source files
- Use Vitest's `vi.mock()` at the top of test files
- Follow Arrange-Act-Assert pattern
- Use `vi.stubEnv()` instead of direct environment variable assignment
- Reset mocks between tests with `vi.resetAllMocks()`
- Check VITEST_BEST_PRACTICES.md for more details

## Project Structure

- Next.js app with both `/pages` and `/app` directory structure
- Postgres DB accessed via Prisma
- Use redux for state management
- Follow folder structure conventions

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
