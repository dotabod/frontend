To create a cheaper pricing strategy with a Free tier, a $3.99 tier, and a $6.99 tier for Dotabod, we’ll need to carefully segment the features to provide value at each level while keeping the paid tiers attractive enough to encourage upgrades. The Free tier will serve as an entry point to hook users, while the paid tiers will unlock progressively more functionality tailored to Dota 2 streamers. Here’s the revised pricing strategy:

---

### Pricing Strategy Considerations
1. **Free Tier**: Must offer enough value to attract users but limit advanced features to incentivize upgrades. Competitors like Nightbot and Moobot offer free basic bots, so Dotabod’s Free tier should include minimal Dota 2-specific features.
2. **Low Price Points**: $3.99 and $6.99 are very affordable, aligning with microtransaction-style pricing (e.g., Twitch’s Bits or small Patreon tiers). Features must be scaled down to fit these budgets while remaining profitable.
3. **Target Audience**: Free for casual testers, $3.99 for small streamers, $6.99 for serious hobbyists or semi-pros.
4. **Scalability**: Keep server-heavy features (e.g., win probability, OBS scene switching) in higher tiers to manage costs.

---

### Proposed Pricing Tiers

#### Tier 1: Free - $0/month
**Target Audience**: New users, casual streamers, or those testing Dotabod.

**Features Included**:
- **Setup**: Manual setup only (no automation).
- **Main Features**:
  - Multi-language support (English only).
- **Overlay Features**:
  - Minimap: Enable minimap blocker (basic semi-transparent blocker, no customization).
- **Chat Features**:
  - Global Settings: Turn off every chatter.
  - Events: Match results ("gg nt 😔 go next" or "We have won 😎 go next").
- **Commands**:
  - Mod/Streamer: `!toggle` (`!enable`, `!disable`).
  - Game Stats: `!mmr` (`!rank`).
  - Utility: `!commands`, `!dotabod`.

**Limitations**:
- No Twitch predictions, MMR tracking, or advanced overlays.
- Basic chat responses only (no item/hero-specific messages).
- No customization options.

**Rationale**: The Free tier offers a taste of Dotabod’s Dota 2 integration (minimap blocker, basic MMR command) to compete with free bots while leaving room for upgrades. It’s minimal but functional for new streamers.

---

#### Tier 2: Starter - $3.99/month
**Target Audience**: Small streamers who want basic enhancements and some Dota 2-specific tools.

**Features Included** (All Free tier features plus):
- **Setup**: Automated making Dotabod a Twitch moderator.
- **Main Features**:
  - Multi-language support (3 languages, e.g., English, Spanish, Russian).
  - Twitch predictions (basic betting with win/loss outcomes using channel points).
  - MMR tracker (±25 MMR updates after ranked matches).
- **Overlay Features**:
  - Minimap: Simple minimap background.
  - Picks: Enable pick blocker (basic overlay, no phase switching).
  - Roshan Timers: Roshan timer (basic red/yellow display).
  - Queue Blocker: Enable queue blocker overlay (basic "Finding match" text).
- **Chat Features**:
  - Dotabod Messages: Tell chat when bets open/close.
  - Item Usage: Use your midas (e.g., "Midas was finally used, 64 seconds late 🐢").
  - Heroes: First blood notifications (e.g., "Pudge giving up first blood 🐸").
  - Events: Aegis pickup/denial notifications.
- **Commands**:
  - Mod/Streamer: `!online`, `!mute`.
  - Game Stats: `!wl`, `!ranked`.
  - Game State: `!rosh`.
  - Utility: `!delay`.

**Rationale**: Priced at $3.99/month, this tier adds key Dota 2 features like MMR tracking, Twitch predictions, and basic chat interactions. It’s affordable for small streamers who want to engage their audience and protect against sniping, while keeping costs low by limiting customization and advanced overlays.

---

#### Tier 3: Pro - $6.99/month
**Target Audience**: Serious hobbyists or semi-pro streamers who need a full suite of tools and customization.

**Features Included** (All Starter tier features plus):
- **Setup**: Automated 7tv setup, Automated Dota 2 game client setup, Automated OBS overlay setup.
- **Main Features**:
  - Multi-language support (5 languages or custom selection).
  - Stream delay (customizable response delay up to 30 seconds).
  - Twitch predictions (full betting functionality with live overlay).
- **Overlay Features**:
  - Minimap: Extra large minimap, Right side minimap, Battlepass HUD.
  - Picks: Full pick blocker overlay phases (auto-switching based on game state).
  - Rank and MMR: Show MMR, Show rank badge, Show leaderboard ranking.
  - Twitch Predictions: Show live prediction overlay, Show live poll overlay.
  - Roshan Timers: Aegis timer, Use extra large minimap.
  - Queue Blocker: Custom find match text.
  - Notable Players: Enable overlay under hero top bar, Show country flags in overlay.
  - Win Probability: Show win probability overlay (for top 100 immortal games).
- **Chat Features**:
  - Dotabod Messages: Tell chat anytime MMR changes.
  - Item Usage: Who paused the game?, Pudge died with faerie fire, Track power treads efficiency, Track teleport scroll usage.
  - Heroes: Pudge is smoked!, Track kill streaks.
  - Events: Roshan kill timer notifications, Item tipping notifications, Bounty rune gold notifications, Match data found, Neutral item tier availability.
- **Advanced Features**:
  - OBS Scene Switcher: Full integration with all blocker scenes (`[dotabod] blocking minimap`, `[dotabod] blocking picks`, `[dotabod] game disconnected`).
  - Managers: Approve managers to access and modify Dotabod settings.
- **Commands**:
  - Mod/Streamer: `!fixparty`, `!refresh`, `!steam`, `!setmmr`, `!beta`, `!pleb`, `!modsonly`, `!resetwl`.
  - Game Stats: `!avgmmr`, `!xpm`, `!gpm`, `!apm`, `!smurfs`, `!gm`, `!lg`, `!lgs`.
  - Hero & Item: `!hero`, `!items`, `!builds`, `!profile`, `!facet`, `!innate`, `!shard`, `!aghs`.
  - Game State: `!wp`, `!spectators`, `!np`, `!ping`.
  - Profile Links: `!opendota`, `!dotabuff`.
  - Utility: `!version`, `!locale`.

**Rationale**: Priced at $6.99/month, this tier unlocks the full Dotabod experience—advanced automation, detailed overlays, chat features, and management tools. It’s ideal for streamers with growing audiences who want a professional setup without breaking the bank.

---

### Pricing Summary
| Tier       | Price     | Target Audience           | Key Features                                      |
|------------|-----------|---------------------------|--------------------------------------------------|
| Free (T1)  | $0/month  | New/Casual Testers       | Basic minimap blocker, MMR command, match results|
| Starter (T2)| $3.99/month | Small Streamers         | MMR tracking, predictions, basic chat/overlays   |
| Pro (T3)   | $6.99/month | Serious Hobbyists/Semi-Pros | Full automation, advanced overlays, all commands |

---

### Additional Pricing Options
1. **Free Tier Limits**: Cap usage (e.g., 10 hours/month of overlay use) to encourage upgrading.
2. **Annual Discount**: Offer a 10-15% discount for yearly subscriptions (e.g., Starter: $40/year, Pro: $70/year).
3. **Trial Upsell**: After 14 days on the Free tier, prompt users to upgrade with a one-time 20% first-month discount ($3.19 for Starter, $5.59 for Pro).

---

### Justification
- **Free ($0)**: Provides a low-barrier entry to compete with free bots, focusing on Dota 2 essentials to attract users.
- **Starter ($3.99)**: Extremely affordable, offering core Dota 2 features like MMR tracking and predictions to appeal to budget-conscious streamers.
- **Pro ($6.99)**: A steal for the full feature set, targeting dedicated streamers who want professional tools at a low cost.

This structure maximizes accessibility with a Free tier, keeps paid tiers competitively priced below $7, and ensures the Pro tier delivers exceptional value to retain users long-term. It’s lean and aggressive, fitting the cheaper pricing request while maintaining Dotabod’s niche appeal.
