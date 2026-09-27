---
title: 22 Hours of Silent Chat
description: Why Dotabod stopped answering in Twitch chat on September 26–27, and what we changed
date: 2026-09-27
author: Dotabod Team
---

## What Happened

From **September 26 at 16:22 UTC** until **September 27 at 14:08 UTC**, Dotabod went quiet in Twitch chat. Commands got no reply, and the chat service dropped the bot's own messages, like match results and kill-streak alerts, before they reached Twitch. `!ping` was the one command that still answered, with `Servers are rebooting...Try again soon`. In those 22 hours, 1,112 channels went live.

Overlays and game tracking kept working the whole time, and predictions still opened and closed. Only chat was affected.

## Why It Happened

Dotabod runs as a few separate services. One of them connects to Twitch chat and passes every message to the service that knows your game state and works out the reply.

On September 26 we restarted the chat service on its own to ship a fix (more on that below). The game service reconnected to it about a quarter of a second after it came up. At that moment the chat service was already accepting connections, but it hadn't yet set up what to do with them. Both sides considered themselves connected. The chat service still had no record of where to send your chat or what to do with the replies coming back, and it logged no errors.

This timing problem had been in the code for a long time. We usually restart every service together, and in that case the game service comes back after the chat service is ready, so it never showed up.

## Why It Took 22 Hours to Notice

The logs looked clean because a bot that isn't sending anything has nothing to fail at. After the restart, we checked the chat service for errors, found none, and called the deploy healthy. We caught it the next day while checking on the new code. Listening to live chats, we saw Dotabod had posted zero messages across more than a hundred channels in ten minutes.

## What We Changed

1. **The chat service accepts connections only once it can handle them.** A connection that arrives the instant it starts is treated like any other. A new automated test connects at exactly that moment and checks that replies go through.
2. **We check that the bot is talking after every deploy.** The check confirms the services found each other and that Dotabod is posting in live channels. Clean logs alone no longer count as a healthy deploy.

## The Fix We Were Shipping

The restart that exposed this was part of a fix for streamers who turn on two-factor authentication. Doing that on Twitch can remove access for every connected app, and Dotabod then disabled itself with an "App permissions revoked" notice. Logging in again used to leave it disabled. Now Dotabod turns itself back on once you reconnect, and that notice has a **Reconnect Twitch** button.

We also turned Dotabod back on for 124 streamers who had already reconnected and were still stuck. We fixed the notice for 410 streamers whose bot was off because of a chat restriction, so it names the actual cause, like followers-only mode. And a Twitch timeout or a message held by AutoMod now leaves the bot on instead of switching it off.

## We're Sorry

If Dotabod went quiet in your channel this weekend, this outage was the reason, and it's fixed. If anything still looks off, let us know in our [Discord community](https://discord.dotabod.com).

— The Dotabod Team
