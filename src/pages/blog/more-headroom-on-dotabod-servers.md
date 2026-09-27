---
title: More Headroom on Dotabod's Servers
description: Dotabod's main server now handles the same streams with about half the processing power, leaving more room for busy hours. Your setup stays the same.
date: 2026-09-27
author: Dotabod Team
---

Over the last two days we cut the processing power Dotabod's main server needs roughly in half. At the same time of day, the server went from using about 2.4 of its four processor cores to about 1.3. Nothing in your setup changes, including your overlay links and Dota config file, so there's nothing to update.

## What this means for your stream

Dotabod reacts to your game as it happens. It opens predictions when you pick a hero, updates the overlay during the match, and answers chat commands with your current game. All of that runs on one server, and when the server is busy, work waits its turn.

Before these changes, at least one task on the server was waiting for a free processor about half the time. Now that happens about a tenth of the time. A typical game update was already handled in a few milliseconds on our server, and it still is, at about 7 ms. The difference shows up when many streamers are in matches at once, which is when that waiting used to add delay.

It also gives us room to grow. The same server can take on more streamers and new features before it needs more hardware.

## What we changed

**Dota sends game data even when you're offline.** Once the config file is installed, Dota sends updates to Dotabod whenever the game is open, whether you're streaming or not. Most of what reached our server came from streamers who weren't live, plus old config files for accounts that no longer exist. Only about one update in eight came from a live stream.

Dotabod now waits three seconds before answering updates it doesn't use. Dota waits for our answer before sending its next update, so those games now send about a third as often. Live streams still get an answer right away, and when you go live, Dotabod starts using your game data within about three seconds.

**Less copying of live game data.** Every update from a live stream used to be copied in full twice before Dotabod's features read it. Now only the parts a feature uses get copied. Early measurements show 15% to 25% less processing for the same live traffic.

**Quieter request logs.** Dotabod records when it last heard from your game and overlay, which powers the [diagnostics page](https://dotabod.com/dashboard/diagnostics). Each of those check-ins also landed in a request log, and that log had grown to about 90% of everything our database wrote to disk. We stopped logging successful check-ins. Dotabod still logs errors.

**Fewer self-checks and a lighter connection to Cloudflare.** Most services on the server checked their own health every two to five seconds. They now check every thirty. The link that carries traffic between Cloudflare and our server also moved to a different protocol, which cut its processing per request by about a fifth. That link sits behind Cloudflare, so how OBS and your browser connect to Dotabod stays the same.

## If you've stopped using Dotabod

Dota keeps sending data for as long as the config file sits in its folder. If you don't plan to come back, you can delete `gamestate_integration_dotabod-<your name>.cfg` from `steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/`. Leaving it there does no harm, and removing it saves your game a little work.
