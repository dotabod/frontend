---
title: Keep Your Win/Loss Counter Across Streams
description: Keep per-stream win/loss stats or set a 1-365 day rolling window for Dotabod's overlay and !wl command.
date: 2026-09-04
author: Dotabod Team
---

Streamers running week-long or 30-day challenges can now keep one win/loss record across multiple streams.

## Choose how many days to count

Open [Overlay settings](https://dotabod.com/dashboard/features/overlay#wl) and find **Stats window**:

- Leave it **blank** for the familiar per-stream counter. It resets when a new stream starts.
- Enter **1 to 365 days** to keep the counter running across streams for that rolling window.

Dotabod uses that choice in:

- The win/loss overlay
- `!wl` and its aliases, including `!score`, `!winrate`, and `!wr`
- Live counter updates after each match

The field is blank by default, so existing streamers keep the same online/offline reset behavior. Enter `30` for a 30-day challenge; the counter will continue when you end one stream and start the next. Clear the field whenever you want to return to per-stream stats.

The settings card previews your own record while you change the window. You can try 7, 30, or any other supported value and see the count before leaving the page.

The overlay shows `STREAM` or the number of days of match history currently included, such as `14 DAYS`. The `!wl` response and public profile use the same available span. A 30-day setting can initially show fewer days until Dotabod has a full 30 days of saved matches.

Your public Dotabod profile shows the same record and range. It updates when a match finishes, so viewers following a challenge do not need to reload the page.

## Reset a challenge without changing other stats

Run `!resetwl` when you want the configured counter to start from 0-0. The reset applies to the overlay and `!wl`; it no longer changes the session window used by other match commands.

`!today` remains separate. It still reports today's results with a hero-by-hero breakdown, no matter how many days you choose for the main win/loss counter.
