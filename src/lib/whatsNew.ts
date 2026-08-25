import type { CommandKeys, SettingKeys } from '@/lib/defaultSettings'
import type { ChatterSettingKeys } from '@/utils/subscription'

// One released feature/command/page shown on the "What's New" dashboard surface. `id` is
// shared by convention with the backend FEATURE_ANNOUNCEMENTS registry (the two repos have no
// shared package, same as setting keys). Newest entries go to the top via `releaseDate`.
export interface WhatsNewEntry {
  id: string
  title: string
  description: string
  releaseDate: string // ISO (yyyy-mm-dd)
  category: 'chat' | 'overlay' | 'commands' | 'pages' | 'advanced' | 'bets' | 'mmr' | 'stream'
  settingKey?: SettingKeys | ChatterSettingKeys // renders an inline toggle
  followsNewFeatureMaster?: boolean // tri-state: checked = value ?? autoOptInNewFeatures
  deepLink?: { path: string; section?: string } // for settings that live on another page
  command?: string // e.g. '!set'
  blogSlug?: string // links to /blog/<slug>
  docsUrl?: string // external "read more"
  tier?: 'FREE' | 'PRO'
  // A live demo so people see what the feature actually does: a sample of what it posts
  // and/or a link to a real example page.
  demo?: { chat?: string; exampleUrl?: string; exampleLabel?: string }
  // For command features, point at the real command in CommandDetail so the example renders
  // the same <TwitchChat> sample the commands page uses, keeping its flag/emote/emoji images
  // instead of a hand-copied text line. Takes precedence over demo.chat.
  demoCommand?: CommandKeys
  // Deeper "how it works" detail (how/when/limits), shown in a collapsible section under the
  // excerpt. Each string is rendered as its own paragraph.
  details?: string[]
}

export const whatsNew: WhatsNewEntry[] = [
  {
    id: 'public-match-history',
    title: 'Public match history',
    description:
      'Streamer profiles now show recent results and most-played heroes. The full history adds hero win rates, KDA, scores, and 7-day, 30-day, or all-time filters.',
    releaseDate: '2026-08-25',
    category: 'pages',
    demo: {
      exampleUrl: 'https://dotabod.com/dendi/matches',
      exampleLabel: "See dendi's match history",
    },
    details: [
      "Each public profile shows the streamer's five most-played heroes and five latest tracked matches, including result, queue, KDA, score, and a link to OpenDota.",
      'Open Match history to switch between individual matches and hero win rates, then filter the record to 7 days, 30 days, or all time.',
    ],
  },
  {
    id: 'safer-account-settings',
    title: 'Safer account settings',
    description:
      'Linked Steam accounts are now read-only, account edits always use the signed-in streamer, and public overlay data no longer includes OBS server passwords.',
    releaseDate: '2026-08-13',
    category: 'advanced',
    deepLink: { path: '/dashboard' },
    details: [
      'You can still see MMR and rank details for a Steam account linked from another streamer, but only its owner can change or remove it.',
      'Dashboard requests now ignore account IDs supplied in the URL and authorize every change against your signed-in Dotabod account.',
    ],
  },
  {
    id: 'clearer-match-start-settings',
    title: 'Clearer match-start settings',
    description:
      'Auto commands now preview each selected reply and explain when they run. High-MMR match detection now names every command that depends on its Twitch clips.',
    releaseDate: '2026-07-31',
    category: 'advanced',
    deepLink: { path: '/dashboard/features/advanced' },
    details: [
      'Open Auto Commands on Match Start to choose !np, !smurfs, !gm, !lg, or !avg. Each row now includes the command description and sample reply, and Dotabod warns you when the feature is on but nothing is selected.',
      'High-MMR Match Detection now explains why Dotabod creates short Twitch clips at 8500+ MMR, which commands lose roster data when detection is off, and which games remain unaffected.',
    ],
  },
  {
    id: 'vision-roster-accuracy',
    title: '!np names real players more often',
    description:
      'All Pick games now get real player names instead of "Player 1, Player 2", !np drops fewer rosters entirely, and it no longer names a hero you never picked.',
    releaseDate: '2026-07-27',
    category: 'commands',
    command: '!np',
    deepLink: { path: '/dashboard/commands' },
    demoCommand: 'commandNP',
    details: [
      'Dota has two different draft screens and Dotabod was only reading one of them. On the All Pick pick screen the names sit in the top bar, not on the mid-screen cards, so it was reading the hero grid instead and finding nothing — which is why those games fell back to "Player 1, Player 2". It now reads both layouts and keeps whichever actually returns names, taking readable rosters from 82% to 90% across the clips we tested.',
      "The roster screen with names, ranks, and heroes is only up for about 30 seconds, and Dotabod's clip was landing in the last few of them — so any small drift missed it. The capture now aims for the middle of that window, roughly tripling the room for error before a game comes back empty.",
      'A failed draft read could also mark a match "done" and throw away the good roster clip that came later, so some games lost data they had already captured. That no longer happens.',
      "When the hero bar is partly hidden behind your own HUD, Dotabod could misread a portrait and confidently name the wrong hero. It now cross-checks against the hero Dota reports you're actually playing and corrects that slot instead of guessing.",
    ],
  },
  {
    id: 'smoke-activated',
    title: 'Team smoke alerts',
    description:
      'When your team pops Smoke of Deceit without you, Dotabod ribs you in chat a few seconds later for getting left behind.',
    releaseDate: '2026-06-12',
    category: 'chat',
    settingKey: 'smokeActivated',
    followsNewFeatureMaster: true,
    tier: 'FREE',
    deepLink: { path: '/dashboard/features/chat', section: 'new-features' },
    demo: { chat: 'team smoking without you HAH' },
    details: [
      "It triggers on the in-game smoke-activated event, which Dota only sends for your own team, so it never reveals an enemy smoke — and it's separate from the existing Smoke alert, which fires whenever your own hero gets the smoke debuff.",
      'A few seconds after a teammate smokes, Dotabod checks whether your hero actually caught the buff. If you got left behind it posts a single line ribbing you; if you were in the smoke it stays quiet and lets the Smoke alert announce that your hero is smoked.',
    ],
  },
  {
    id: 'cosmetics',
    title: 'Cosmetic set announcements',
    description:
      'When you pick a hero, Dotabod posts your equipped cosmetic set in chat with a link to your public collection. Viewers can also type !set anytime.',
    releaseDate: '2026-06-10',
    category: 'chat',
    settingKey: 'cosmeticsAnnounce',
    followsNewFeatureMaster: true,
    command: '!set',
    tier: 'FREE',
    deepLink: { path: '/dashboard/features/chat', section: 'new-features' },
    demoCommand: 'commandSet',
    demo: {
      exampleUrl: 'https://dotabod.com/arteezy/set',
      exampleLabel: "See arteezy's set page",
    },
    details: [
      "Every hero pick or mid-game swap (while you're live) snapshots your equipped wearables to your collection, one entry per hero, refreshed each time you replay it. No need for chat to run !set.",
      "It holds the chat post until everyone's locked in (strategy phase) so it never tips your pick to stream snipers, and posts at most once per match per hero. !set re-snapshots your current hero on demand, and your public page at dotabod.com/<name>/set shows every hero you've captured.",
    ],
  },
  {
    id: 'cosmetic-set-pages',
    title: 'Hero cosmetic set pages',
    description:
      "Browse any streamer's equipped cosmetics hero by hero on their public set page, with rarity, a completion meter, and a trophy tally.",
    releaseDate: '2026-06-02',
    category: 'pages',
    demo: {
      exampleUrl: 'https://dotabod.com/arteezy/set',
      exampleLabel: "Browse arteezy's collection",
    },
    details: [
      'The page reads your captured loadouts and groups them by hero, with rarity, a completion meter, and a trophy tally. It fills in as you play or run !set, so the more heroes you pick on stream, the more complete it gets.',
    ],
  },
  {
    id: 'paypal',
    title: 'PayPal for Dotabod Pro',
    description:
      'You can now subscribe to (or gift) Dotabod Pro with PayPal, monthly, annual, or lifetime, alongside card and crypto.',
    releaseDate: '2026-05-28',
    category: 'advanced',
    blogSlug: 'paypal-payments',
    deepLink: { path: '/dashboard/billing' },
  },
  {
    id: 'streamers-directory',
    title: 'Streamers directory',
    description:
      'A public, searchable directory of Dotabod streamers you can filter by rank and sort by follower count.',
    releaseDate: '2026-05-31',
    category: 'pages',
    demo: {
      exampleUrl: 'https://dotabod.com/streamers',
      exampleLabel: 'Browse the directory',
    },
    details: [
      'Lists Dotabod streamers publicly, filterable by rank and sortable by follower count. Viewers can find others using Dotabod, and the network shows up in search.',
    ],
  },
  {
    id: 'gift-redesign',
    title: 'Redesigned gifting',
    description:
      'Gifting Pro has a cleaner flow, with a live chat preview, preset durations, and a running price summary before checkout.',
    releaseDate: '2026-05-30',
    category: 'pages',
    demo: {
      exampleUrl: 'https://dotabod.com/arteezy/gift',
      exampleLabel: "See arteezy's gift page",
    },
  },
  {
    id: 'command-suggestions',
    title: 'Inline command tips',
    description:
      'Dotabod can append a related command hint to its first reply, so your chat discovers more of what it can do.',
    releaseDate: '2026-05-25',
    category: 'chat',
    settingKey: 'commandSuggestions',
    deepLink: { path: '/dashboard/commands' },
    demo: { chat: '3311 · Legend☆2 - Average rank this game · Try !smurfs' },
    details: [
      'Commands are grouped into related clusters (like !np, !gm, !avg, !smurfs, !ranked). About every 4th time one runs, Dotabod tacks a one-line hint for a sibling command onto its first reply.',
      "It won't repeat the same suggestion in your channel within 30 minutes, won't suggest the command just used, and only suggests commands you have enabled. Turn it off with the toggle on the commands page.",
    ],
  },
  {
    id: 'streamers-command',
    title: '!streamers',
    description:
      'Anonymously tells chat how many other Dotabod streamers are in your current match. No names are shown to avoid cross-chat drama.',
    releaseDate: '2026-05-22',
    category: 'commands',
    command: '!streamers',
    settingKey: 'commandStreamers',
    deepLink: { path: '/dashboard/commands' },
    demoCommand: 'commandStreamers',
    details: [
      'Counts other Dotabod-registered users in your match (live broadcasters sending GSI, plus the SourceTV roster) and never shows names, to avoid cross-chat drama.',
      'Pro adds a " · N other streamer(s)" suffix on !np, plus an automatic heads-up in chat about other streamers ~90 seconds after the match starts.',
    ],
  },
  {
    id: 'mod-resolution',
    title: 'Easier bet resolution',
    description:
      '!unresolved now lists pending matches with KDA, length, and match IDs, and a bare !won or !lost flips your most recent match, no match ID needed.',
    releaseDate: '2026-05-22',
    category: 'commands',
    command: '!unresolved',
    settingKey: 'commandWon',
    deepLink: { path: '/dashboard/commands' },
    demoCommand: 'commandUnresolved',
    details: [
      'A bare !won or !lost (no match ID) resolves the most recent finished match of your current stream session, handy when Dotabod disconnected before the match ended. Re-resolving a match doubles the MMR change to undo the old result and apply the new one.',
      "!unresolved lists this session's matches with no recorded result, newest first (up to 10), each with hero, K/D/A, score, length, and the match ID to pass to !won or !lost.",
    ],
  },
  {
    id: 'vision-roster',
    title: 'Sharper !np for high MMR',
    description:
      "For 8500+ MMR games where the draft isn't visible, Dotabod now reads the in-game hero bar to fill in the player roster more accurately.",
    releaseDate: '2026-05-22',
    category: 'overlay',
    command: '!np',
    deepLink: { path: '/dashboard/commands' },
    demoCommand: 'commandNP',
    details: [
      'Kicks in for Immortal / 8500+ MMR games, where Valve hides the public draft. Dotabod auto-captures short overlay clips at draft (~46s), the strategy phase (~50s), and ~60s into the game.',
      'Its Vision service reads the in-game hero bar (the row of ~60px portraits) and returns up to 10 heroes with a per-slot confidence score, falling back to draft player names until heroes load. Vision-detected heroes take priority when building the !np roster.',
    ],
  },
  {
    id: 'lastfm-fix',
    title: 'Last.fm overlay fixes',
    description:
      'Track, artist, and album names with special characters (apostrophes, ampersands) now display correctly in the Last.fm now-playing overlay.',
    releaseDate: '2026-05-22',
    category: 'overlay',
    settingKey: 'lastFmOverlay',
    deepLink: { path: '/dashboard/features/overlay' },
    demo: { chat: "Now playing: Guns N' Roses - Sweet Child O' Mine (Appetite for Destruction)" },
    details: [
      "Last.fm's API returns names with HTML entities (like &#39; for an apostrophe). Dotabod now decodes those on the way in and stops re-escaping them on the way out to Twitch, so apostrophes and ampersands show as real characters instead of &#39; / &amp;.",
    ],
  },
  {
    id: 'help-redesign',
    title: 'Searchable help center',
    description:
      'The troubleshooting page is now a searchable, categorized help center with clearer Steam and overlay setup steps.',
    releaseDate: '2026-05-20',
    category: 'pages',
    deepLink: { path: '/dashboard/help' },
  },
  {
    id: 'crypto-nowpayments',
    title: 'Crypto payments, improved',
    description:
      'Crypto checkout moved to NOWPayments, with more supported coins and a smoother payment flow.',
    releaseDate: '2026-05-20',
    category: 'advanced',
    blogSlug: 'crypto-payments-nowpayments',
    deepLink: { path: '/dashboard/billing' },
  },
  {
    id: 'recent-command',
    title: '!recent match history',
    description:
      'Lists the last 5 resolved matches from this stream with their match IDs, hero, and result. Shares the toggle with !won.',
    releaseDate: '2026-05-19',
    category: 'commands',
    command: '!recent',
    settingKey: 'commandWon',
    deepLink: { path: '/dashboard/commands' },
    demoCommand: 'commandRecent',
  },
  {
    id: 'command-toggles',
    title: 'Toggle more commands',
    description:
      'Around a dozen more commands (!geo, !stats, !match, !friends, !count, and more) can now be turned on or off individually from the dashboard.',
    releaseDate: '2026-05-19',
    category: 'commands',
    deepLink: { path: '/dashboard/commands' },
    details: [
      'Commands like !geo, !stats, !match, !friends, !count, and !fixdbl each got their own on/off switch in the dashboard, so you can tailor exactly which ones your chat can use.',
    ],
  },
  {
    id: 'steam-connector',
    title: 'One-click Steam connect',
    description:
      'A new connector auto-links your Steam account while you stream, with live status and built-in troubleshooting.',
    releaseDate: '2026-05-17',
    category: 'stream',
    deepLink: { path: '/dashboard' },
    details: [
      "The connector polls for your active Steam account while you stream and links it automatically, with status feedback and built-in troubleshooting if it doesn't appear.",
    ],
  },
  {
    id: 'billing-status',
    title: 'Clearer billing status',
    description:
      'Subscription status is clearer for past-due, cancelled, and paused states, with better messaging and retry prompts.',
    releaseDate: '2026-03-06',
    category: 'advanced',
    deepLink: { path: '/dashboard/billing' },
  },
  {
    id: 'regional-blocking',
    title: 'Regional blocking warning',
    description:
      'Streamers in regions that block our overlay host now get an in-dashboard warning with remediation steps.',
    releaseDate: '2026-02-10',
    category: 'stream',
    deepLink: { path: '/dashboard' },
  },
  {
    id: 'lead-mod',
    title: 'Lead Moderator support',
    description:
      "Dotabod now recognizes Twitch's Lead Moderator badge for mod-only commands and chat permissions.",
    releaseDate: '2026-01-20',
    category: 'chat',
    deepLink: { path: '/dashboard/commands' },
    details: [
      "Twitch's Lead Moderator is a separate badge from a regular mod. Dotabod now grants Lead Moderators mod-level access to mod-only commands like !won, !toggle, and !modsonly.",
    ],
  },
  {
    id: 'today-command',
    title: '!today hero stats',
    description: 'Shows wins and losses per hero played today.',
    releaseDate: '2026-01-06',
    category: 'commands',
    command: '!today',
    settingKey: 'commandToday',
    deepLink: { path: '/dashboard/commands' },
    demoCommand: 'commandToday',
  },
]

// Newest-first ordering, reused by the dashboard page, public page, and home teaser.
export const whatsNewSorted = [...whatsNew].sort(
  (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
)

export interface WhatsNewDateGroup {
  releaseDate: string
  entries: WhatsNewEntry[]
}

export function groupWhatsNewByDate(entries: WhatsNewEntry[]): WhatsNewDateGroup[] {
  return entries.reduce<WhatsNewDateGroup[]>((groups, entry) => {
    const current = groups.at(-1)
    if (current?.releaseDate === entry.releaseDate) {
      current.entries.push(entry)
    } else {
      groups.push({ releaseDate: entry.releaseDate, entries: [entry] })
    }
    return groups
  }, [])
}

// Effective toggle state for a What's New entry: new-feature toggles follow the master
// (autoOptInNewFeatures) until explicitly set; everything else uses its own stored value.
export function entryToggleChecked(
  entry: WhatsNewEntry,
  value: boolean | null | undefined,
  master: boolean | undefined,
): boolean | undefined {
  return entry.followsNewFeatureMaster ? (value ?? master) : Boolean(value)
}

// Human label for a deep-link's destination, used by the card's "Open …" button.
const DEEP_LINK_LABELS: Record<string, string> = {
  '/dashboard': 'Open dashboard',
  '/dashboard/billing': 'Open billing',
  '/dashboard/commands': 'Open commands',
  '/dashboard/features/advanced': 'Open advanced settings',
  '/dashboard/features/chat': 'Open chat settings',
  '/dashboard/features/overlay': 'Open overlay settings',
  '/dashboard/help': 'Open help center',
}

export function deepLinkLabel(deepLink: { path: string }): string {
  return (
    DEEP_LINK_LABELS[deepLink.path] ??
    `Open ${deepLink.path.split('/').filter(Boolean).pop() ?? 'page'}`
  )
}
