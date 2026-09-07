# Cosmetic collection

The cosmetic collection lets a viewer browse the heroes and equipped sets captured from a streamer's games, open an individual hero loadout, and move back to match history.

## Sub-features

- `collection-route` renders the public collection at `/maxid1337/set`.
- `collection-current` marks `Cosmetic collection` as the single current profile section.
- `collection-heroes` exposes seeded hero cards and a `View the full set` entry point.
- `collection-to-history` navigates to `/maxid1337/matches` through the shared profile rail.
- `collection-responsive` keeps the profile rail compact and the document free of horizontal overflow.

## How to get to it (user POV)

- Visit `/maxid1337/set` directly.
- From match history, choose `Cosmetic collection` in `Profile sections`.
- Choose a hero card or `View the full set` to open that hero's cosmetic detail.
- Choose `Match history` to return to `/maxid1337/matches`.

## Driving it with Dotabod frontend harness

Preconditions:

- The branch is pushed and workflow dispatch is authorized.
- The GitHub-hosted doctor passes.
- The public `maxid1337` collection has at least one card and hero `2` has a loadout; the seed writes those values only to disposable localhost Postgres.

- **Run.** Dispatch `gh workflow run verify-dotabod.yml --ref "$(git branch --show-current)"`. The adapter visits `/maxid1337/set` at desktop and mobile sizes.
- **Check current state.** `nav[aria-label="Profile sections"]` has exactly one current link, labeled `Cosmetic collection`, with href `/maxid1337/set`.
- **Check the rail.** Both section links use 14px Inter text with at least 4.5:1 contrast; only the current link has a visible bottom border. The rail is at most 56px tall and allows no vertical scrolling.
- **Check navigation.** The recorded journey clicks `Cosmetic collection` from match history and observes `/maxid1337/set` with the collection label current. It later clicks `Match history` and observes the inverse state.
- **Inspect the collection.** Confirm the screenshot shows the `Cosmetic collection` heading, populated hero content, and an entry point into a full set. This visual inspection is required because the shared adapter's collection assertions focus on navigation and layout invariants.
- **Proof.** Inspect `collection-desktop.png`, `collection-mobile.png`, the `/maxid1337/set` audit entries, and `navigationJourney.toCollection` in `profile-navigation-audit.json`.

## Gotchas

- Axe is scoped to `nav[aria-label="Profile sections"]` on the collection route. Do not report the full collection page as axe-clean.
- Hero cards come from public page props fetched during seeding, so their names and counts can change independently of this branch.
- The adapter proves the route and shared navigation automatically; populated collection content still requires screenshot inspection.
- Third-party HubSpot UI is hidden only inside screenshot automation and must not be removed from product code.
