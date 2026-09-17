# Settings usage follow-up handoff

Source: [settings-usage-report-2026-09-09.md](./settings-usage-report-2026-09-09.md)

Snapshot date: 2026-09-09 UTC

Repository state inspected: branch `refactor/continue-oxlint-backlog-20260907`, commit `208c2874`

Both the source report and this handoff were untracked at the time of inspection. Create a dedicated feature branch before starting product changes unless this branch is intentionally the base.

## Goal

Turn the usage report into small, reviewable changes that reduce disabled accounts, make incomplete settings clearer, and improve the evidence available for later product decisions.

Do not put every item below in one pull request. Start with recovery because 197 active streamers have Dotabod disabled, and at least 124 have a recorded automated or integration reason.

## Read this before changing behavior

The report labels several states as contradictory. Code inspection shows that some are valid combinations.

- `minimap-simple` controls the blocker style. `minimap-xl` controls its size. The UI renders a `Simple-XLarge` asset, so both settings can be on. Do not make them mutually exclusive.
- `autoTranslate` controls translated messages in chat. `translateOnOverlay` controls translated messages on the overlay. The dashboard explicitly offers chat, overlay, or both. Overlay-only translation is valid.
- `queueBlockerFindMatch=true` while `queueBlocker=false` is an inactive saved child preference. Preserve it. The UI can disable the child control while the parent is off.
- A minimap style or size saved while `minimap-blocker=false` is also an inactive saved preference. Preserve it.

The confirmed cleanup targets are narrower:

- `lastFmOverlay=true` with no usable `lastFmUsername` is incomplete setup.
- String-encoded `rankOnly` values do not match the current object schema.
- The nested `chatters.smokeActivated` field is obsolete.
- `commandFacet` and `showGiftAlerts` appear unused in this repository. Search every service that reads the shared settings table before deleting their rows.

## Recommended pull request order

| Priority | Pull request | Main owner | Why now |
| --- | --- | --- | --- |
| P0 | Disable incident deduplication and recovery | Bot service, frontend, database | Affected users cannot use the product. |
| P1 | Setting validation and legacy-data cleanup | Frontend API and database | The scope is small and has clear postconditions. |
| P1 | Quieter chat onboarding and chatter presets | Product, frontend, bot service | New users are opting out at a high rate. |
| P2 | Product event foundation | Frontend, bot service, database | Current setting rows cannot measure actual feature use. |
| P3 | Win/loss and Auto Commands discovery | Frontend | Early use is promising, but reach is low. |
| P3 | PayPal approval-attempt handling | Billing code | The sample is small, so inspect before changing cleanup behavior. |
| P4 | Decide whether to retire Rank Only | Product and bot service | No active Pro streamer currently enables it. |

## P0: Fix disable loops and recovery

### What the next worker must establish

- [ ] Locate every writer of `Setting.disableReason`, `Setting.disableMetadata`, and `DisableNotification`. The producer for account-sharing and chat-permission incidents is not in this frontend repository.
- [ ] Define an incident identity for each reason. For account sharing, it will probably include the user, the setting key, the reason, and the blocked Steam account. Confirm this in the producer before writing a uniqueness rule.
- [ ] Determine whether the 612 account-sharing notifications are repeated writes for the same unresolved incident or distinct blocked accounts.
- [ ] Determine what currently clears `commandDisable` after Twitch permissions or tokens recover.
- [ ] Classify the 69 active `commandDisable=true` rows that have no `disableReason`. Separate intentional disables from legacy automated disables before migrating anything.

### Code facts already verified

- `DisableNotification` has indexes, but no uniqueness or incident-key constraint in [prisma/schema.prisma](./prisma/schema.prisma).
- [use-disable-reasons.tsx](./src/lib/hooks/use-disable-reasons.tsx) implements acknowledge and resolve requests, but no component calls those functions.
- [resolve-disable.ts](./src/pages/api/settings/resolve-disable.ts) clears the reason fields and resolves notifications. It does not set the setting value to `false`, so it does not re-enable `commandDisable` by itself.
- [disable-toggle.tsx](./src/components/Dashboard/disable-toggle.tsx) changes `commandDisable`, but the normal settings write does not clear its reason fields or resolve its notifications.
- [check-ban.ts](./src/pages/api/check-ban.ts) returns the current reason and metadata to the dashboard.

### Implementation checklist

- [ ] Add producer-side deduplication or a cooldown after incident identity is known. Do not use a broad uniqueness rule that would merge distinct blocked accounts.
- [ ] Make user recovery atomic. A successful re-enable must set `commandDisable=false`, clear the disable metadata, and resolve matching open notifications in one transaction.
- [ ] Keep manual disables distinct from automated disables. Do not auto-resolve a manual moderator action unless that matches current bot behavior.
- [ ] Connect the dashboard action to the recovery operation. Reuse the existing Twitch reconnect or moderation flow where possible.
- [ ] Return a clear result for recovery success, recovery failure, and a still-failing permission check.
- [ ] Refresh the settings and disable-reason caches after recovery so the warning disappears immediately.
- [ ] Add tests for repeated incident writes, a successful re-enable, an unsuccessful re-enable, and a new incident after a prior incident was resolved.
- [ ] Add or extend frontend API tests near `src/__tests__/pages/api/settings-setting-key.test.ts`.
- [ ] Add component coverage for the disable warning and its action if the UI changes.

### Acceptance criteria

- One continuing account-sharing incident does not create an unbounded list of unresolved notifications.
- A recovered chat permission or token clears the disabled state without waiting for another stream.
- Re-enabling from the dashboard leaves no stale reason on `commandDisable`.
- A later, distinct incident can create a new notification.
- Existing manual-disable behavior remains intact.

## P1: Validate real setting dependencies and clean old data

### Application changes

- [ ] Prevent `lastFmOverlay` from being enabled until `lastFmUsername` is non-empty and valid enough to query.
- [ ] Show a field-level error when the Last.fm username cannot be used. Do not leave the switch on with a non-working overlay.
- [ ] Disable the Queue Blocker child controls while `queueBlocker` is off. Preserve their saved values.
- [ ] Disable minimap style, size, position, and opacity controls while `minimap-blocker` is off. Preserve their saved values.
- [ ] Keep Simple and XL minimap compatible.
- [ ] Keep overlay-only translation compatible.
- [ ] Put any true cross-setting validation in the settings write boundary, not only in React controls.
- [ ] Cover both settings write routes if `POST /api/settings` is still supported. Otherwise, prove that it has no caller and remove it in a separate cleanup.

Relevant files:

- [setting validation](./src/lib/validations/setting.ts)
- [per-setting PATCH route](./src/pages/api/settings/%5Bsetting-key%5D.ts)
- [legacy settings POST route](./src/pages/api/settings/index.ts)
- [Last.fm controls](./src/components/Overlay/last-fm-overlay.tsx)
- [Queue Blocker controls](./src/components/Dashboard/Features/queue-card.tsx)
- [minimap controls](./src/components/Dashboard/Features/minimap-card.tsx)

### Data migration

- [ ] Write an aggregate-only preflight query that counts each target state.
- [ ] Convert recoverable string-encoded `rankOnly` values to objects. Quarantine or reset values that cannot be parsed safely.
- [ ] Remove only the nested `smokeActivated` field from `chatters` JSON. Keep the top-level `smokeActivated` setting.
- [ ] Search the frontend, bot, worker, and any shared packages for `commandFacet` and `showGiftAlerts`.
- [ ] Delete retired rows only after the cross-repository search is clean.
- [ ] Make the migration idempotent.
- [ ] Add post-migration count queries and require all malformed or retired targets to reach zero.
- [ ] Do not print user IDs, OBS passwords, tokens, or setting payloads in migration output.

### Acceptance criteria

- New writes cannot create an enabled Last.fm overlay without a usable username.
- Existing valid Simple and XL combinations remain unchanged.
- Existing overlay-only translation remains unchanged.
- All active `rankOnly` values match the current object schema.
- No `chatters` object contains the obsolete nested `smokeActivated` field.
- Retired keys are absent only after all readers have been ruled out.

## P1: Quiet chat onboarding

The report supports changing the rollout of automatic chat output. It does not support disabling cosmetic capture or the on-demand `!set` command.

### Decision needed before implementation

- [ ] Choose between an explicit onboarding choice and a default-off state for `cosmeticsAnnounce` and `smokeActivated`.
- [ ] Do not set `autoOptInNewFeatures=false` globally unless the product wants every future optional feature to default off.
- [ ] If these two features need a different default, add a per-feature rollout default instead of overloading the global master switch.
- [ ] Mirror the effective-default rule in the bot service. The frontend and backend keep separate feature registries.

### Chatter preset checklist

- [ ] Define the exact message set for Quiet, Balanced, and Everything.
- [ ] Put `noTp` off in the proposed Balanced preset.
- [ ] Review `smoke`, `pause`, `tip`, `killstreak`, and `bounties` for the Balanced preset.
- [ ] Keep `roshanKilled`, `dotapatch`, and `commandsReady` on in Balanced unless new evidence contradicts the report.
- [ ] Decide whether a preset is a one-time bulk edit or a persistent mode. A one-time edit is safer because users can change individual messages later.
- [ ] Preserve Pro access checks for paid chatter items.
- [ ] Add tests that verify the exact JSON written by each preset.
- [ ] Verify the dashboard at mobile and desktop widths through the project frontend verification workflow.

Relevant files:

- [default settings](./src/lib/default-settings.ts)
- [new chat feature controls](./src/components/Dashboard/Features/new-feature-chat-toggles.tsx)
- [chatter controls](./src/components/Dashboard/Features/chatter-card.tsx)
- [What's New registry](./src/lib/whats-new.ts)
- [settings hook tests](./src/__tests__/lib/hooks/use-update-setting.test.tsx)

## P2: Add evidence for actual use

Do not treat a default-on setting as proof that a feature ran. The current [track helper](./src/lib/track.ts) sends consent-gated client events to Google Tag Manager. It cannot cover server-side command runs, feature-fired events, or disable incidents by itself.

- [ ] Write a short event schema before adding calls. Include the event name, timestamp, source, setting or feature key, and a privacy-safe actor identifier when needed.
- [ ] Decide retention and access rules before storing append-only events.
- [ ] Record setting changes at the server write boundary with the old value, the new value, and the source.
- [ ] Record command invocations in the bot service.
- [ ] Record feature-fired events for cosmetic announcements, team-smoke roasts, Queue Blocker, and Auto Commands.
- [ ] Record disable incident creation, display, repetition, recovery attempt, and recovery result.
- [ ] Record PayPal approval launch, return, webhook completion, cancellation, and error.
- [ ] Record dashboard section and What's New views only when analytics consent permits client analytics.
- [ ] Keep secrets, raw tokens, chat text, and full setting payloads out of event properties.
- [ ] Save the SQL or analysis script that regenerates the report's cohorts and rates. The current report contains results but not the queries.

## P3: Improve discovery, then measure again

### Win/loss

- [ ] Add a clear route from `!wl`, reset controls, or the overlay card to challenge windows and manual corrections.
- [ ] Instrument challenge saves and correction submissions.
- [ ] Keep correction safeguards that prevent totals from going below zero.
- [ ] Recheck reach, repeat use, and error rates after 30 full days of data.

Relevant files:

- [win/loss controls](./src/components/Overlay/win-loss-overlay.tsx)
- [adjustment API](./src/pages/api/win-loss-adjustments.ts)
- [win/loss tests](./src/__tests__/components/Overlay/win-loss-overlay.test.tsx)

### Auto Commands

- [ ] Lead the card with `!smurfs`, the most-selected command in the report.
- [ ] Measure card views, enable actions, command selections, and actual match-start sends.
- [ ] Recheck adoption after 30 days before adding more commands.

Relevant file: [Auto Commands card](./src/components/Dashboard/Features/auto-commands-card.tsx)

## P3: Inspect PayPal approval attempts

[paypal-checkout.ts](./src/lib/paypal-checkout.ts) creates a new `APPROVAL_PENDING` subscription row for every recurring approval launch. The 23 pending rows across nine users may therefore be expected retries, abandoned approvals, or a flow problem.

- [ ] Group pending records by user, period, age, and whether a later active subscription exists.
- [ ] Confirm whether PayPal permits safe reuse of an unexpired approval URL.
- [ ] Decide whether to reuse, expire, or retain pending attempts.
- [ ] Do not delete pending rows until webhook and return-route behavior has been checked.
- [ ] Add checkout-funnel events before judging conversion from the current sample.
- [ ] Add tests for repeat launch, return without an identifier, webhook completion, and an abandoned attempt followed by success.

Relevant files:

- [PayPal checkout creation](./src/lib/paypal-checkout.ts)
- [PayPal return route](./src/pages/api/paypal/return.ts)
- [PayPal webhook](./src/pages/api/webhooks/paypal/index.ts)
- [PayPal subscription sync](./src/lib/paypal-subscriptions.ts)

## P4: Decide the future of Rank Only

- [ ] Confirm usage in the bot service and check whether the feature can act without a current settings row.
- [ ] Check support requests, command use, and recent setting history before removal.
- [ ] If the feature stays, repair old values and improve discovery.
- [ ] If the feature is retired, remove the frontend card, backend enforcement, subscription mapping, metadata, tests, and stored settings in that order.
- [ ] Do not remove it based only on one current-state query if another event source exists.

## Verification rules for every pull request

This checkout shares a host with production services. Do not run the full build, test suite, typecheck, lint suite, Prisma generation, or browser verification locally.

- [ ] Inspect `git status --short` before editing and preserve unrelated work.
- [ ] Add focused regression tests, but run them through GitHub Actions.
- [ ] Run `pnpm exec oxfmt <edited files>` only for targeted formatting.
- [ ] Run `git diff --check` locally.
- [ ] Push a feature branch.
- [ ] Run `gh workflow run ci.yml --ref <branch>`.
- [ ] Wait with `gh run watch --exit-status`.
- [ ] Require the CI quality, test, and production-build steps to pass.
- [ ] For UI changes, inspect the affected route at desktop and mobile sizes through the project verification skill.
- [ ] Report any unverified cross-repository or production-data assumption in the pull request.

## Suggested first-agent prompt

> Read `settings-usage-report-2026-09-09.md` and `settings-usage-handoff-2026-09-09.md`. Work only on P0, disable incident deduplication and recovery. First locate every producer of disable notifications across the frontend and bot repositories. Prove whether repeated account-sharing rows describe one incident or several. Then implement the smallest atomic recovery path, add regression tests, and verify through GitHub Actions. Do not change chat defaults, setting cleanup, or billing in the same pull request. Preserve unrelated work and follow each repository's `AGENTS.md`.
