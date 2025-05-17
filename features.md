# Setup

All exist as manual steps too

- Automated 7tv setup
- Automated dota 2 game client setup
- Automated making Dotabod a twitch moderator
- Automated OBS overlay setup

# Main features

- Multi-language support for the twitch chat bot
- Stream delay (in seconds) Increase the delay that Dotabod responds to game events.
- MMR tracker. Give or take 25 MMR after every ranked match.
- Twitch predictions. Let your chatters bet on your matches. Chatters can use their native Twitch channel points to bet on whether you win or lose a match.
- Party queue only option for MMR tracking
- Enable auto gamba for predictions
- Customizable prediction titles and durations

# Overlay features

## Minimap

Semi-transparent blocker that auto places itself over your minimap to deter people from farming your wards.

- Enable minimap blocker
- Simple minimap background
- Extra large minimap
- Right side minimap
- Battlepass hud
- Complex minimap option
- Minimap opacity control

## Picks

Prevent stream snipers from seeing your picks.

- Enable pick blocker
- There are several pick blocker overlays phases available. Dotabod intelligently auto chooses which one to show.

- During hero picking phase, heroes are fully covered
- When you pick early, and it isn't locked in yet. While the enemy can still pick ban your pick. Heroes are fully covered
- When your hero is locked in and can no longer be banned. Your hero will be shown, but your teammate's heroes are still fully covered.
- When you enter strategy phase, the overlay is removed.
- When all heroes are locked and can no longer be banned, all heroes will be shown

## Rank and mmr

- Show MMR
- Show leaderboard ranking
- Show rank badge

## Twitch predictions

- Show live prediction overlay
- Show live poll overlay

## Roshan timers

Dotabod can detect when roshan is killed or aegis is picked up.

- Roshan timer
- Aegis timer
- Use extra large minimap

The rosh timer starts red for 8 minutes (min rosh spawn), then turns yellow for 3 minutes (max rosh spawn).

Note: The data does not tell us when someone dies with aegis, so the aegis icon will remain for the full 5 minutes.

## Queue blocker

Stream snipers won't know what your queue time is to be able to snipe you.

- Enable queue blocker overlay
- Show finding match
- Custom find match text
- Both the "PLAY DOTA" in the bottom right, and the "Finding match" at the top left while in main menu will be blocked.

## Notable players

Show notable players for 2 minutes under the hero top bar.

- Enable overlay under hero top bar
- Show country flags in overlay
- Show country flags in !np twitch chat command

## Win probability

For top 100 immortal games, Dotabod can display the current win percent chance.

- Show win probability overlay

# Chat features

The bot reacts with chat messages to your game events as you play your match.

## Global settings

- Turn off every chatter (disables all chat features)

## Dotabod messages

- Tell chat when bets open, close, or get remade due to hero swap or match not scored scenario
- Tell chat anytime mmr changes

## Item Usage

- Use your midas (e.g. "Midas was finally used, 64 seconds late 🐢")
- Who paused the game? 🤔
- Pudge died with passive faerie fire 🤦
- Track power treads efficiency (e.g. "We toggled treads 6 time to save a total 284 mana this match")
- Track teleport scroll usage (e.g. "@techleed where's your tp 🤔" and "nice job getting a tp finally after 322 seconds 🐢")

## Heroes

- Pudge is smoked! 🚬
- Track kill streaks (e.g. "Pudge has a 4 kill streak 🤡" and "Pudge lost the 4 kill streak 😱")
- First blood notifications (e.g. "Pudge giving up first blood 🐸")

## Events

- Aegis pickup/denial notifications
- Roshan kill timer notifications with next spawn window
- Item tipping notifications
- Bounty rune gold notifications with thanks to contributors
- Match results with "gg nt 😔 go next" or "We have won 😎 go next"
- Match data found notifications with player info
- Neutral item tier availability notifications

# Advanced features

Looking for even more? They'll be here.

## OBS scene switcher (Optional)

Auto switch scenes in OBS depending on game state. Your blockers will still work without this.

> Note: OBS and Streamlabs have the same instructions (clarification from screenshots)

This is optional but useful if you want to make your stream look unique for different game states!

### Setup requirements

1. Must put the dotabod browser source in the scenes you want to block hero picks or minimap in.
2. Must set browser properties to Advanced access to OBS
3. Must create the following scenes (case sensitive):

#### Minimap blocker

`[dotabod] blocking minimap`
Whenever the minimap is first shown, switch to this scene

#### Picks blocker

`[dotabod] blocking picks`
As soon as picks are shown and heroes are able to be selected, switch to this scene

#### Game disconnected

`[dotabod] game disconnected`
Switch to this scene when you disconnect and leave a Dota game

## Managers

Below is a list of moderators for your channel. You can approve them to manage your Dotabod settings.

### Approve Managers

By approving a user, you're allowing them to access and modify your Dotabod dashboard. Approved managers can manage features, toggle commands, and update settings on your behalf.

> Note: They will not have access to your setup page, downloading the GSI cfg, nor overlay URL.

### How it works

Once you approve a user, they will login to dotabod.com and be able to access your dashboard by using the channel selector.

## Troubleshooting Tools (New Section)

- Built-in connection testing with !ping command
- Steam account verification steps
- OBS setup assistance with visual guides
- Comprehensive help documentation
- Automatic error detection and suggestions
- Step-by-step setup verification

# Commands

An exhaustive list of all commands available using Twitch chat.

## Mod/Streamer Commands

- `!toggle` (`!enable`, `!disable`) - Toggle Dotabod on/off
- `!online` (`!offline`, `!forceonline`, `!forceoffline`) - Update stream status
- `!mute` (`!unmute`) - Toggle auto chat messages
- `!fixparty` (`!fixsolo`) - Fix party match MMR calculation
- `!refresh` - Refresh OBS overlay
- `!steam` (`!steamid`, `!account`) - Show Steam ID
- `!setmmr` (`!mmr=`, `!mmrset`) - Manually set MMR
- `!beta` (`!joinbeta`, `!leavebeta`) - Toggle beta features
- `!pleb` - Allow one non-sub to chat
- `!modsonly` - Toggle mods-only chat mode
- `!resetwl` - Reset win/loss counter

## Game Stats Commands

- `!mmr` (`!rank`, `!medal`) - Show current MMR and rank
- `!avgmmr` (`!avg`) - Show match average MMR
- `!xpm` - Show experience per minute
- `!gpm` - Show gold per minute
- `!apm` - Show actions per minute
- `!wl` (`!score`, `!winrate`, `!wr`) - Show win/loss record
- `!ranked` (`!isranked`) - Check if current game is ranked
- `!smurfs` (`!lifetimes`, `!totals`, `!games`) - Show total games for all players
- `!gm` (`!medals`, `!ranks`) - Show all players' ranks
- `!lg` (`!lastgame`) - Show players from last game
- `!lgs` (`!lastgamescore`, `!lgscore`) - Show last game result

## Hero & Item Information

- `!hero` - Show current hero stats
- `!items` (`!item`) - Show hero inventory
- `!builds` (`!d2pt`, `!build`, `!getbuild`) - Show pro builds
- `!profile` (`!stats`, `!check`) - Show player profile by color
- `!facet` - Show hero ability information
- `!innate` - Show hero innate ability
- `!shard` - Show Aghanim's Shard upgrade
- `!aghs` - Show Aghanim's Scepter upgrade

## Game State Commands

- `!rosh` (`!aegis`) - Show Roshan/Aegis status
- `!wp` - Show win probability
- `!spectators` - Show spectator count
- `!ping` - Check if bot is online
- `!np` (`!who`, `!players`) - Show notable players

## Profile Links

- `!opendota` - Show OpenDota profile
- `!dotabuff` - Show Dotabuff profile

## Utility Commands

- `!commands` - List available commands
- `!delay` (`!streamdelay`) - Show stream delay
- `!version` - Show bot version
- `!locale` (`!translation`) - Show language settings
- `!dotabod` - Show bot information

Command Access Levels:

- All: Available to everyone
- Mods: Moderators only
- Streamer: Stream owner only

Note: Commands can be enabled/disabled individually through the dashboard. Many commands have aliases for convenience.
