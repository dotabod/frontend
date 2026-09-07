# Match history

Match history lets a viewer switch between recent match rows and aggregated hero win rates, change the time period, paginate to older matches, and move to the streamer's cosmetic collection.

## Sub-features

- `history-matches` shows 20 recent seeded match rows and an older-matches link.
- `history-heroes` switches to the hero-win-rates view without rendering the match table.
- `history-periods` preserves `7 days`, `30 days`, and `All time` period controls.
- `history-sections` moves between `Match history` and `Cosmetic collection` with exactly one current section.
- `history-keyboard` gives the profile-section links a visible focus indicator reached through real Tab input.
- `history-responsive` preserves readable navigation without document overflow at both mapped viewports.

## How to get to it (user POV)

- Visit `/maxid1337/matches` directly or choose `View all matches` from `/maxid1337`.
- Choose `Hero win rates` to reach `/maxid1337/matches?view=heroes`.
- Choose `Matches` to return to `/maxid1337/matches`.
- Choose `Cosmetic collection` in `Profile sections` to reach `/maxid1337/set`.

## Driving it with Dotabod frontend harness

Preconditions:

- The branch is pushed and workflow dispatch is authorized.
- The GitHub-hosted doctor passes and the fixture seed creates 25 matches for `maxid1337`.
- The adapter can reach a Chromium page through `FRONTEND_CDP_URL`.

- **Run.** Dispatch `gh workflow run verify-dotabod.yml --ref "$(git branch --show-current)"`. The adapter visits the matches and hero-win-rate routes at desktop and mobile sizes.
- **Inspect matches.** On `/maxid1337/matches`, `nav[aria-label="Match history view"]` marks `Matches` current, `table[aria-label="Recent matches"]` contains 20 rows, and `View older matches` is visible.
- **Inspect hero rates.** Choose `Hero win rates`. The URL becomes `/maxid1337/matches?view=heroes`, `Hero win rates` becomes current, `#hero-win-rates-heading` exists, and the recent-match table is absent.
- **Return to matches.** Choose `Matches`. The query string clears, `Matches` becomes current, and the recent-match table returns.
- **Check periods.** `nav[aria-label="Match history period"]` contains `7 days`, `30 days`, and `All time` in both views.
- **Check section navigation.** `nav[aria-label="Profile sections"]` exposes `/maxid1337/matches` and `/maxid1337/set`; exactly one link has `aria-current="page"`. The adapter clicks both directions and records the resulting path and current label.
- **Check keyboard focus.** On the mobile viewport, the adapter sends real Tab events until focus reaches `Profile sections`, then requires `:focus-visible` and an outline at least 2px wide.
- **Proof.** Inspect `match-history-desktop.png`, `match-history-mobile.png`, `hero-win-rates-desktop.png`, `hero-win-rates-mobile.png`, and the matching `audits`, `keyboardFocus`, and `navigationJourney` values in `profile-navigation-audit.json`.

## Gotchas

- The match-history and profile-section rails are independent. Do not confuse `Matches` with `Match history` when asserting current state.
- The initial table intentionally contains 20 of the 25 seeded matches; the remainder prove the older-matches entry point.
- Calling `element.focus()` is not valid focus proof. The adapter uses CDP key events so `:focus-visible` behaves like keyboard input.
- Axe is scoped to `[data-testid="match-history-page"]` on the two history views, not the entire document.
