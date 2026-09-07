# Streamer profile overview

The streamer profile gives a viewer a compact summary of the streamer's most-played heroes and latest matches, with user-facing links into the complete match and hero-win-rate views.

## Sub-features

- `overview-heroes` renders one to five rows in `Most played heroes`.
- `overview-matches` renders one to five rows in `Latest matches`, newest first.
- `overview-all-matches` links to the complete match-history route.
- `overview-hero-rates` links to the hero-win-rates view.
- `overview-responsive` avoids horizontal document overflow at desktop and mobile sizes.

## How to get to it (user POV)

- Visit `/maxid1337` directly.
- In the overview, choose `View all matches` to reach `/maxid1337/matches`.
- In the overview, choose `View all hero win rates` to reach `/maxid1337/matches?view=heroes`.

## Driving it with Dotabod frontend harness

Preconditions:

- The branch is pushed and workflow dispatch is authorized.
- `.agents/skills/verify-dotabod/scripts/run-profile-verification.sh --doctor` passes in the GitHub-hosted runner.
- The public fixture contains at least one cosmetic card and the seed creates 25 representative matches.

- **Run.** Dispatch `gh workflow run verify-dotabod.yml --ref "$(git branch --show-current)"`. The helper launches the isolated production bundle and visits `/maxid1337` at both mapped viewports.
- **Find the overview.** The adapter waits for `[data-testid="profile-match-overview"]`. It finds semantic tables named `Most played heroes` and `Latest matches` with one to five rows each.
- **Check destinations.** The overview exposes `View all matches` with href `/maxid1337/matches` and `View all hero win rates` with href `/maxid1337/matches?view=heroes`.
- **Check ordering.** The first latest-match link points to `https://www.opendota.com/matches/8964010929`, the newest seeded match.
- **Proof.** Inspect `profile-overview-desktop.png`, `profile-overview-mobile.png`, and the `/maxid1337` entries under `profileAudits` in `profile-navigation-audit.json`. Both routes must have zero scoped axe violations and no horizontal document overflow.

## Gotchas

- The screenshots are clipped to the overview component, not the whole profile page.
- The overview route does not render the shared `Profile sections` rail; prove its two explicit history links instead.
- The external OpenDota destination is asserted as an href. The adapter does not navigate away from Dotabod.
- Public fixture changes can make seeding fail before the local app starts; report that as a fixture precondition failure, not a product regression.
