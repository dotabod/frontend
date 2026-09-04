---
title: Keep Your Win/Loss Counter Across Streams
description: Keep per-stream win/loss stats or set a fixed challenge start date and duration for Dotabod's overlay and !wl command.
date: 2026-09-04
author: Dotabod Team
---

Streamers running week-long or 30-day challenges can now keep one win/loss record across multiple streams.

## Set the challenge dates

Open [Overlay settings](https://dotabod.com/dashboard/features/overlay#wl) and find **Challenge window**:

- Leave the challenge empty for the familiar per-stream counter. It resets when a new stream starts.
- Choose a start date and **1 to 365 days** to keep the counter running for a fixed challenge.

Dotabod uses that choice in:

- The win/loss overlay
- `!wl` and its aliases, including `!score`, `!winrate`, and `!wr`
- Live counter updates after each match

No challenge is active by default, so existing streamers keep the same online/offline reset behavior. For a 30-day challenge, choose the date it began and enter `30`. The counter continues when you end one stream and start the next.

The settings card previews your own record while you edit the challenge.

The overlay shows `STREAM` or challenge progress such as `14 OF 30 DAYS`. The `!wl` response and public profile use the same progress. When the duration ends, Dotabod clears the challenge and returns the counter to per-stream behavior.

Your public Dotabod profile shows the same record and range. It updates when a match finishes, so viewers following a challenge do not need to reload the page.

## Reset a challenge without changing other stats

Run `!resetwl` when you want the configured counter to start from 0-0. The reset applies to the overlay and `!wl`; it no longer changes the session window used by other match commands.

`!today` remains separate. It still reports today's results with a hero-by-hero breakdown, no matter how many days you choose for the main win/loss counter.
