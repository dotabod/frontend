# Hero cosmetic detail

Hero cosmetic detail shows one captured Dota hero loadout, links back to the collection, and lets a viewer move to adjacent heroes without losing the collection's active profile section.

## Sub-features

- `detail-route` renders hero `2` at `/maxid1337/set/2`.
- `detail-current` keeps `Cosmetic collection` as the single current profile section.
- `detail-siblings` exposes at least one previous or next hero link.
- `detail-back` links back to `/maxid1337/set` through the breadcrumb, position link, and page footer.
- `detail-responsive` preserves the loadout and navigation at desktop and mobile sizes without document overflow.

## How to get to it (user POV)

- Visit `/maxid1337/set/2` directly.
- From `/maxid1337/set`, choose the hero `2` card or its `View the full set` link.
- Choose the named previous or next hero link to move through the binder.
- Choose `Collection`, the position indicator, or `Back to the collection` to return to `/maxid1337/set`.

## Driving it with Dotabod frontend harness

Preconditions:

- The branch is pushed and workflow dispatch is authorized.
- The GitHub-hosted doctor passes.
- The public fixture for `maxid1337` includes hero ID `2`, its item list, and at least one sibling loadout.

- **Run.** Dispatch `gh workflow run verify-dotabod.yml --ref "$(git branch --show-current)"`. The adapter visits `/maxid1337/set/2` at desktop and mobile sizes.
- **Check current state.** `nav[aria-label="Profile sections"]` exposes both profile routes and marks only `Cosmetic collection` with `aria-current="page"`.
- **Check sibling navigation.** The adapter finds at least one link whose href starts with `/maxid1337/set/` and ends in an integer hero ID. Inspect the screenshot to confirm the adjacent hero name and arrow are visible.
- **Check collection return.** Inspect the breadcrumb `Collection`, the centered position link, and `Back to the collection`; each should resolve to `/maxid1337/set`.
- **Inspect the loadout.** Confirm the screenshot shows the hero heading, equipped-cosmetic count, item grid, and any rarity summary or spotlight produced by the seeded loadout.
- **Proof.** Inspect `hero-detail-desktop.png`, `hero-detail-mobile.png`, and the `/maxid1337/set/2` entries in `profile-navigation-audit.json`. The route must have a sibling link, correct current section, no horizontal document overflow, and zero axe violations in the scoped profile rail.

## Gotchas

- The page supports left and right arrow-key navigation in product code, but the current adapter does not exercise those keys. Do not claim that behavior as verified.
- Axe is scoped to `nav[aria-label="Profile sections"]`, not the loadout grid or market links.
- The fixture's item images and marketability come from public page props and can change independently of the branch.
- A sibling-link count proves an entry point exists; screenshot inspection is still required to catch clipping or an unclear direction label.
