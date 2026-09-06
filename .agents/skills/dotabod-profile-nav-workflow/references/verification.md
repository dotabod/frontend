# Profile navigation production verification

This is a feature adapter for the general [Dotabod frontend verification skill](../../dotabod-frontend-verification/SKILL.md). Read its [harness reference](../../dotabod-frontend-verification/references/verification-harness.md) before changing ports, lifecycle behavior, dummy environment values, or cleanup.

## One deterministic run

From the repository root:

```bash
node .agents/skills/dotabod-frontend-verification/scripts/run-frontend-verification.mjs \
  --output-dir artifacts/profile-navigation \
  --check-command 'pnpm exec vitest run src/__tests__/pages/match-history.test.tsx src/__tests__/pages/collection-navigation.test.tsx' \
  --check-command 'pnpm check' \
  --check-command 'git diff --check' \
  --seed-command 'node .agents/skills/dotabod-profile-nav-workflow/scripts/seed-profile-fixture.mjs --username maxid1337 --hero-id 2' \
  --verify-command 'node .agents/skills/dotabod-profile-nav-workflow/scripts/audit-profile-navigation.mjs --base-url "$FRONTEND_BASE_URL" --cdp-url "$FRONTEND_CDP_URL" --username maxid1337 --hero-id 2 --axe-script "$FRONTEND_AXE_SCRIPT" --output-dir "$FRONTEND_OUTPUT_DIR"'
```

The seed adapter refuses non-local database hosts. It fetches maxid1337's public collection props and Axe detail data from `dotabod.com`, then writes deterministic representative matches into the isolated Postgres instance.

The audit adapter exits nonzero if any route, current state, style, keyboard, navigation, adjacent-control, overflow, or scoped WCAG assertion fails. It uses real Tab CDP events for `:focus-visible` and hides the HubSpot iframe only in screenshot automation.

## Required artifacts

Inspect all six images after the harness exits:

- `artifacts/profile-navigation/match-history-desktop.png`
- `artifacts/profile-navigation/match-history-mobile.png`
- `artifacts/profile-navigation/collection-desktop.png`
- `artifacts/profile-navigation/collection-mobile.png`
- `artifacts/profile-navigation/hero-detail-desktop.png`
- `artifacts/profile-navigation/hero-detail-mobile.png`

Also inspect:

- `profile-navigation-audit.json` for route-level evidence.
- `frontend-verification-report.json` for the harness result.
- The generated service and command logs if any stage fails.

The desktop viewport is 1440×1000 and mobile is 390×844. Axe is pinned by the shared harness and scoped to the profile-section navigation under WCAG 2.1 A/AA tags.

## Completion

Finish with `git diff --check` and `git status --short --branch`. Preserve every pre-existing uncommitted profile, match-history, Prisma, and Supabase change. The entire `artifacts/` directory is ignored and should not be committed.
