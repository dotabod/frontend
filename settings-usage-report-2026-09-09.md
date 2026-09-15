# Settings usage report

Snapshot: 2026-09-09 UTC

## Executive read

The product has 29,604 registered accounts, but the useful comparison group is the 1,459 streamers with a tracked match in the last 30 days. All percentages below use that active group unless stated otherwise. There are 141 active Pro streamers.

The main findings:

- Cosmetic capture is working and heavily used. 1,443 active streamers, 98.9%, have captured loadouts. The chat announcement is the part people turn off.
- New users are much more likely to disable cosmetic announcements and team-smoke roasts. Only 64.2% of new active users keep each feature on, compared with 85.6% and 84.5% of established users.
- Chat noise is the clearest settings problem. 25.4% disable the chatter system entirely. Among people who leave it on, about half disable No TP alerts and roughly 40% disable several other messages.
- 197 active streamers, 13.5%, currently have Dotabod disabled. Most identifiable cases are recovery problems, not intentional disables: chat permissions, revoked tokens, or account-sharing detection.
- The new win/loss correction tool has low reach but good repeat use. In its first five days, 24 active users made 122 corrections. Only six configured a persistent challenge window.
- Several settings can end up in contradictory or invalid states. These should be cleaned up in the UI and database.

## Scope and method

The database has 226,103 setting rows across 24,598 users and 101 keys. Every active streamer has at least one settings row.

This report treats a user as active when they had a tracked match in the last 30 days. That is stricter and more useful than counting every registered account, but it excludes streamers who used the dashboard or streamed without producing a tracked match.

The settings table is a current-state table, not an audit log. It stores the latest value, `created_at`, and `updated_at`. It cannot show every toggle in sequence. A missing row means the application default applies, so raw setting-row counts are not adoption counts.

The database also has no command-run, feature-fired, or page-view event table. For several features, this report can measure whether they are enabled, but not whether viewers actually triggered them.

All queries were aggregate-only and read-only. No user-identifying values or OBS passwords were read.

## Active population

| Population                                 |  Users |
| ------------------------------------------ | -----: |
| Registered accounts                        | 29,604 |
| Active streamers, tracked match in 30 days |  1,459 |
| Active in 7 days                           |  1,074 |
| New accounts in 30 days                    |    373 |
| New accounts that became active            |    137 |
| Active Pro streamers                       |    141 |

The 137 new active streamers are useful as an onboarding cohort. They behave differently from established users in several settings.

## What active streamers keep on or turn off

### Core free features

| Feature                         | Effective state | Active users | Share |
| ------------------------------- | --------------- | -----------: | ----: |
| MMR tracker                     | On              |        1,390 | 95.3% |
| Rank image                      | On              |        1,357 | 93.0% |
| Rank MMR text                   | On              |        1,339 | 91.8% |
| Rank leaderboard number         | On              |        1,226 | 84.0% |
| Announce new MMR in chat        | On              |        1,238 | 84.9% |
| Chatter messages, master switch | On              |        1,089 | 74.6% |
| Minimap blocker                 | On              |          902 | 61.8% |
| XL minimap mode                 | On              |          325 | 22.3% |
| High-MMR auto clipping disabled | Yes             |           63 |  4.3% |

The MMR and rank display features are healthy. The minimap blocker and chatter system have much higher opt-out rates, which is understandable because both materially change a stream or its chat.

### Chatter messages

There are 1,089 active users who leave the chatter master switch on. Their per-message choices are more revealing than the master setting.

| Message           | Disabled users | Disabled share among chatter users |
| ----------------- | -------------: | ---------------------------------: |
| No TP             |            554 |                              50.9% |
| Smoke             |            475 |                              43.6% |
| Pause             |            470 |                              43.2% |
| Tip               |            441 |                              40.5% |
| Killstreak        |            433 |                              39.8% |
| Bounties          |            431 |                              39.6% |
| Passive death     |            383 |                              35.2% |
| Midas             |            369 |                              33.9% |
| Power Treads      |            338 |                              31.0% |
| Match outcome     |            315 |                              28.9% |
| First blood death |            293 |                              26.9% |
| Roshan deny       |            235 |                              21.6% |
| Roshan pickup     |            224 |                              20.6% |
| Commands ready    |            211 |                              19.4% |
| Dota patch        |            145 |                              13.3% |
| Roshan killed     |            130 |                              11.9% |

Neutral Items is omitted from the ranking because it defaults off. Only 26 chatter users have enabled it.

This bundle is too noisy by default. No TP is the clearest candidate to default off. Smoke, Pause, Tip, Killstreak, and Bounties also deserve a quieter default or a preset-based setup.

### Commands

Most commands default on, so explicit `false` rows are opt-outs. The newer commands remain enabled for almost everyone:

| Command feature            | Effective on | Share |
| -------------------------- | -----------: | ----: |
| `!set`                     |        1,440 | 98.7% |
| Inline command suggestions |        1,436 | 98.4% |
| `!streamers`               |        1,432 | 98.1% |

The biggest explicit command opt-outs are APM at 89 users, GPM and Mod-only at 81 each, XPM at 79, Pleb at 77, and Dotabuff at 74. Even these remain effectively enabled for more than 94% of active streamers because missing rows use the on default.

## New feature adoption

### Cosmetic sets

The underlying feature is a success:

| Measure                                 |                Result |
| --------------------------------------- | --------------------: |
| Active users with captured loadouts     | 1,443 of 1,459, 98.9% |
| Active users with a capture in 30 days  |          1,431, 98.1% |
| Active users with a capture in 7 days   |          1,030, 70.6% |
| Average heroes captured per active user |                  23.7 |
| Median heroes captured per active user  |                    19 |
| Total captured hero loadouts            |                44,447 |

The automatic chat announcement has weaker acceptance:

| Cohort | Announcement effectively on | Team-smoke roast effectively on |
| --- | --: | --: |
| Established active users | 85.6% | 84.5% |
| New active users, account created in 30 days | 64.2% | 64.2% |

Among the 137 new active users, 49 explicitly disabled cosmetic announcements and 49 disabled the team-smoke roast. Forty-two disabled both. This is not explained by the master switch, which only one new active user disabled.

The recent direction is also clear. In the last seven days, 29 active users first set the cosmetic-announcement preference and 23 chose off. Thirty-two first set the smoke preference and 27 chose off.

Recommendation: keep silent cosmetic capture and the on-demand `!set` command. Make automatic chat announcements, especially the smoke roast, an explicit onboarding choice or default them off for new accounts. The data says the capture is valuable and the unsolicited chat output is the problem.

### Persistent win/loss windows and corrections

This feature launched on 2026-09-04, so the sample is only five days old.

| Measure                                              |   Result |
| ---------------------------------------------------- | -------: |
| Active users with a complete start date and duration |  6, 0.4% |
| Active users who made a manual correction            | 24, 1.6% |
| Corrections made                                     |      122 |
| Average corrections per user who used it             |      5.1 |

Reach is low, but the people who find corrections use them repeatedly. That is a good early depth signal. Add discovery next to `!wl`, the win/loss overlay, and reset controls before changing the feature itself. Recheck after 30 days.

### Auto commands on match start

Twenty-six of 141 active Pro streamers have a non-empty selection, an 18.4% adoption rate. Three more have an explicitly empty list. Across all active users, including expired Pro users with saved settings, 34 have a non-empty selection.

Selected commands among active users:

| Command   | Users selecting it |
| --------- | -----------------: |
| `!smurfs` |                 27 |
| `!avg`    |                 22 |
| `!np`     |                 20 |
| `!lg`     |                 19 |
| `!gm`     |                 15 |

This is a reasonable niche Pro feature. `!smurfs` is the best example to lead with in the UI.

### PayPal

PayPal has five active subscriptions and one canceled subscription. There are 23 approval-pending records across nine users. There are no PayPal order rows.

The sample is small, but repeated pending records suggest abandoned or repeated approval attempts. Add funnel events around approval launch, return, webhook completion, and error. Confirm that stale pending records are either reused or cleaned up.

## Pro feature adoption

The denominator here is 141 active users with an ACTIVE or TRIALING Pro subscription. Default-on and default-off features are labeled because the interpretation differs.

| Pro feature                  | Default | Effective on | Share |
| ---------------------------- | ------- | -----------: | ----: |
| Live polls                   | On      |          121 | 85.8% |
| Notable players overlay      | On      |          116 | 82.3% |
| OBS scene switcher           | On      |          113 | 80.1% |
| Bets                         | On      |          112 | 79.4% |
| Aegis messages               | On      |          109 | 77.3% |
| Roshan messages              | On      |          101 | 71.6% |
| Pick blocker                 | On      |           89 | 63.1% |
| Win probability overlay      | Off     |           63 | 44.7% |
| Simple minimap mode          | Off     |           46 | 32.6% |
| Queue blocker                | Off     |           27 | 19.1% |
| Auto commands on match start | Empty   |           26 | 18.4% |
| Last.fm overlay              | Off     |           25 | 17.7% |
| Party-only mode              | Off     |           18 | 12.8% |
| Battle Pass messages         | Off     |           15 | 10.6% |
| Auto translate               | Off     |            9 |  6.4% |
| Rank-only mode               | Off     |            0 |  0.0% |

Win probability is the strongest opt-in overlay. Rank-only mode has no current active Pro users and should be reconsidered, simplified, or retired unless usage is recorded elsewhere.

## What changed in the last seven days

This table excludes diagnostic heartbeat keys and announcement-delivery markers.

| Setting | Active users who touched it | First set | Changed an existing row | Current direction where boolean |
| --- | --: | --: | --: | --- |
| Dotabod disable | 76 | 37 | 39 | 36 disabled, 40 enabled |
| Rank leaderboard number | 32 | 20 | 12 | 15 on, 17 off |
| Team-smoke roast | 32 | 32 | 0 | 5 on, 27 off |
| Minimap blocker | 30 | 19 | 11 | 10 on, 20 off |
| Cosmetic announcements | 29 | 29 | 0 | 6 on, 23 off |
| Rank MMR text | 29 | 13 | 16 | 19 on, 10 off |
| Chatter message selection | 28 | 18 | 10 | Mixed object |
| XL minimap mode | 27 | 19 | 8 | 10 on, 17 off |
| Rank image | 27 | 18 | 9 | 18 on, 9 off |
| Chatter master | 22 | 17 | 5 | 10 on, 12 off |
| MMR tracker | 22 | 10 | 12 | 16 on, 6 off |
| `!wl` | 20 | 10 | 10 | 16 on, 4 off |

The new chat features are being changed in one direction: off. Rank display settings move both ways and look more like normal preference changes.

## Disable and recovery problems

There are 197 active streamers with `commandDisable=true`, 13.5% of the active population.

| Current disable reason | Active users | Share of disabled active users |
| ---------------------- | -----------: | -----------------------------: |
| Chat permission denied |           90 |                          45.7% |
| No recorded reason     |           69 |                          35.0% |
| Token revoked          |           31 |                          15.7% |
| Manual disable         |            4 |                           2.0% |
| Account sharing        |            3 |                           1.5% |

At least 124 of the 197 disabled users have an explicit automated or integration reason. That is 8.5% of all active streamers. The 69 rows without a reason are probably legacy or manual states and should be classified.

Disable notifications from the last 30 days show a second problem:

| Reason                 | Notifications | Active users | Unresolved |
| ---------------------- | ------------: | -----------: | ---------: |
| Account sharing        |           612 |           44 |        612 |
| Chat permission denied |           182 |           46 |        129 |
| Token revoked          |            32 |           31 |         32 |
| Manual disable         |            23 |           14 |          2 |
| API error              |             6 |            4 |          6 |

Forty-four active users generated 612 account-sharing notifications, nearly 14 each, and none resolved. Investigate whether the detection is repeatedly inserting the same notification, whether these are false positives, and whether recovery can automatically resolve the state. Add a uniqueness or cooldown rule if repeated rows do not represent distinct incidents.

The chat-permission and token-revoked groups need a one-step reconnect or moderator repair flow. The settings dashboard should say exactly what failed and confirm recovery without making the user wait for another stream.

## Contradictory and stale states

These states are mostly harmless at runtime, but they make the dashboard harder to understand and weaken analytics:

- 105 active users have both Simple and XL minimap modes enabled.
- 87 have a minimap variant enabled while the minimap blocker itself is off.
- 30 have Find Match blocking enabled while the queue blocker parent is off.
- 10 have overlay translation enabled while automatic translation is off.
- 10 have the Last.fm overlay enabled with no saved Last.fm username. That is 22.7% of active users who enabled the overlay.
- Six `rankOnly` rows are JSON strings instead of objects. Two belong to active users.
- Forty-four `chatters` rows still contain the obsolete nested `smokeActivated` key. Twenty-three belong to active users.
- Removed keys still have data: `commandFacet` has 420 rows, including 53 active users, and `showGiftAlerts` has 361 rows, also including 53 active users. Two old test keys have one inactive row each.

Recommended cleanup:

1. Make Simple and XL minimap modes mutually exclusive in the write path, not only in the UI.
2. Disable or hide child controls when their parent is off, while preserving the saved child preference.
3. Prevent Last.fm overlay activation until a username passes validation.
4. Migrate string-encoded `rankOnly` values to objects, then add a database or write-boundary type check.
5. Remove obsolete nested chatter data and retired setting keys after confirming no backend caller still reads them.

## Prioritized product actions

### 1. Fix disable loops and recovery

This is the most expensive problem because affected users cannot use the product. Start with account-sharing notification deduplication, chat-permission recovery, token reconnect, and classification of the 69 reasonless disables.

### 2. Change how new chat features roll out

Keep cosmetic capture automatic. It has near-universal real usage. Make chat announcements a deliberate onboarding choice, or default them off for new accounts. The same applies more strongly to the team-smoke roast.

### 3. Offer chatter presets and quiet the default

Use presets such as Quiet, Balanced, and Everything. Default No TP off. Test a quieter Balanced preset with Smoke, Pause, Tip, Killstreak, and Bounties reconsidered. Keep Roshan killed, Dota patch, and Commands ready on because users rarely disable them.

### 4. Enforce setting dependencies and repair old data

Fix mutually exclusive minimap modes, incomplete Last.fm setup, translation dependencies, malformed `rankOnly` rows, and stale keys. This is a contained cleanup with clear acceptance criteria.

### 5. Instrument actual use

Add append-only, privacy-safe product events for:

- setting changes with old value, new value, source, and timestamp;
- command invocations by command key;
- feature-fired events such as smoke roast, cosmetic announcement, queue blocker, and auto command;
- dashboard section and What's New views;
- disable incident created, shown, recovered, and repeated;
- PayPal approval launch, return, completion, cancellation, and error.

Without this, an enabled default can look like adoption even when nobody sees or triggers the feature.

### 6. Improve discovery for promising low-reach features

Promote win/loss corrections from `!wl` and the overlay because early users repeat the action. Lead the Auto Commands card with `!smurfs`, its most-selected option. Recheck both after 30 days before changing scope.

## Bottom line

The settings data points to three different product stories:

- Core tracking and cosmetic capture are healthy.
- Automatic chat output is too aggressive, especially for new users.
- A meaningful group of active streamers is disabled by recoverable integration failures.

Fix recovery first. Then quiet the default chat experience without removing the underlying features people are actually using.
