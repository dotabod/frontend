---
name: dotabod-profile-nav-workflow
description: Implement or re-verify shared navigation and related UI across Dotabod's public match-history and cosmetic collection routes. Use for changes spanning /[username]/matches, /[username]/set, or /[username]/set/[heroId] that need TDD, safe production builds, maxid1337 browser fixtures, responsive screenshots, or scoped WCAG checks.
---

# Dotabod profile navigation workflow

Use this skill only for the public profile route family:

- `/[username]/matches`
- `/[username]/set`
- `/[username]/set/[heroId]`

Honor explicitly requested design and TDD skills first. This skill adds the project-specific workflow and known cascade/build traps.

## Invariants

- Preserve all pre-existing uncommitted Prisma, Supabase, profile, and match-history work. Record `git status --short` before edits and never clean the worktree.
- Use one shared component for cross-route profile navigation.
- Treat hero detail as part of Cosmetic collection for `aria-current="page"`.
- Keep match period filters and cosmetic previous/next navigation independent from the profile-section navigation.
- Keep the rail compact: Inter at 14px, gray inactive state, restrained purple active text and 2px underline, horizontal overflow only inside the rail when genuinely needed.
- Add no promotional copy, oversized cards, or isolated CTA treatment.

## TDD boundary

Reuse existing route-level tests. When changing navigation behavior, add or update tests that exercise the real page components and prove the affected invariants:

1. Match history links to `/${username}/set`.
2. Collection and hero detail link to `/${username}/matches`.
3. Exactly the correct section has `aria-current="page"`.
4. Hero detail still renders its previous and next hero links.
5. Match history still renders its period controls.

For new behavior, confirm the expected regression before implementing when practical. For styling changes or reverification, run existing tests without manufacturing failures or rebuilding already-correct navigation. Implement the smallest scoped change and rerun affected checks.

## Project-specific cascade traps

`src/pages/_app.tsx` loads Ant Design's unlayered reset after Tailwind, and `src/styles/tailwind.css` applies purple to ordinary anchors. On this navigation, ordinary Tailwind text and focus utilities can therefore look correct in source but lose in the production cascade.

- Verify computed styles in the production bundle, not only class names or jsdom output.
- If the reset wins, use narrowly scoped Tailwind important modifiers on the affected utilities, such as `text-gray-400!`, `text-purple-200!`, or `focus-visible:outline-2!`.
- Do not add a global anchor or focus override to solve a local component problem.
- Test keyboard focus with actual Tab key events. Calling `element.focus()` does not reliably activate `:focus-visible`.

## Deterministic verification

Read [references/verification.md](references/verification.md) before production browser verification. It adapts the shared `dotabod-frontend-verification` harness; do not duplicate the infrastructure lifecycle in this specialized skill.

- Use [scripts/seed-profile-fixture.mjs](scripts/seed-profile-fixture.mjs) to seed an isolated local Postgres database from maxid1337's public collection props.
- Use [scripts/audit-profile-navigation.mjs](scripts/audit-profile-navigation.mjs) against the final production bundle to capture screenshots and assert route links, current state, typography, colors, overflow, period controls, hero sibling links, keyboard focus, navigation clicks, and optional axe results.
- Inspect all six screenshots. Computed-style output alone does not catch a visually weak active/inactive hierarchy.
- Hide the HubSpot iframe only inside the screenshot runner. Do not change product code for clean screenshots.
- Let the shared harness stop only its own server, browser, database, and axe resources after the audit command finishes. Screenshot artifacts remain available for inspection.

## Handoff

Report applicable regression evidence, targeted tests, `pnpm check`, production build result, browser journey, scoped WCAG result, and links to all six screenshots. Mention any build fallback, expected Sentry warning, or unmet verification requirement. Do not commit unless requested.
