# OBS dev overlay

The dev overlay gives maintainers a deterministic way to inspect the OBS browser-source UI without a live Dota match or production GSI connection. It loads the same overlay route and components used by streamers, then supplies local sample state and controls.

## Sub-features

- `overlay-route` renders the disposable user's `/overlay/[userId]` route from the production bundle.
- `overlay-playing` shows the in-game win/loss and rank surface with the playing reference image.
- `overlay-picks` changes the block state through the real dev control and renders the picks HUD and blocker.
- `overlay-chat` adds and clears a sample translated-chat message through the real controls.
- `overlay-background` hides the dev reference image without hiding the overlay components.
- `overlay-aspects` selects the 16:9 and 21:9 reference assets at 1920x1080 and 2560x1080.
- `overlay-assets` requires every rendered image and static browser resource to load without a runtime exception.

## How to get to it (maintainer POV)

- Run `.agents/skills/verify-dotabod/scripts/run-profile-verification.sh` locally, or dispatch the mapped GitHub workflow.
- The fixture seed creates an active Pro subscription only in disposable localhost Postgres and records the user's generated ID.
- The adapter sets `localStorage.isDev` before opening `/overlay/<fixture-user-id>`.
- In the overlay controls, choose `Picks`, choose `Dire`, add `Sample 1`, clear the messages, and turn off `Show Dev Image`.

## Driving it with Dotabod frontend harness

Preconditions:

- Doctor passes and finds Chrome/Chromium plus PostgreSQL on macOS or Linux.
- The shared harness owns the local production server, database, browser profile, and ports.
- `NEXT_PUBLIC_GSI_WEBSOCKET_URL` remains pinned to `http://127.0.0.1:9`; do not substitute the production socket service.

- **Run.** Invoke `.agents/skills/verify-dotabod/scripts/run-profile-verification.sh`.
- **Check the fixture.** `/api/settings?id=<fixture-user-id>` returns the active Pro fixture from localhost.
- **Inspect playing.** At 1920x1080, the overlay title, dev controls, `#ingame-wl-mmr-card`, and loaded `playing.png` reference image are present.
- **Inspect picks.** Choose `Picks` and `Dire`; require `#pick-screen-hud`, the picks reference image, and the underlying overlay after the reference image is hidden.
- **Inspect chat.** Choose `Sample 1`, require `Hello everyone!` in `#chat-messages-overlay`, then clear it and require the overlay message container to disappear.
- **Check ultrawide.** At 2560x1080, require the loaded `21-9-playing.png` reference image.
- **Proof.** Inspect `overlay-playing-16x9.png`, `overlay-playing-21x9.png`, `overlay-picks-16x9.png`, `overlay-chat-message-16x9.png`, `overlay-picks-without-background-16x9.png`, and `overlay-dev-mode-audit.json`.

## Gotchas

- This verifies the production Next.js bundle and real overlay components, not a live OBS process or the remote GSI socket service.
- A closed localhost socket is intentional. Socket connection failures are not static-asset failures and do not supply the deterministic UI state.
- Dev controls are test tooling rendered by product code. The adapter scopes axe to those controls rather than claiming the transparent OBS canvas is a conventional webpage.
- The screenshots include the dev controls because their interactions are part of the proof.
