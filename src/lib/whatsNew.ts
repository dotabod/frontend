import type { SettingKeys } from '@/lib/defaultSettings'

// One released feature/command/page shown on the "What's New" dashboard surface. `id` is
// shared by convention with the backend FEATURE_ANNOUNCEMENTS registry (the two repos have no
// shared package, same as setting keys). Newest entries go to the top via `releaseDate`.
export interface WhatsNewEntry {
  id: string
  title: string
  description: string
  releaseDate: string // ISO (yyyy-mm-dd)
  category: 'chat' | 'overlay' | 'commands' | 'pages' | 'advanced' | 'bets' | 'mmr' | 'stream'
  settingKey?: SettingKeys // renders an inline toggle
  followsNewFeatureMaster?: boolean // tri-state: checked = value ?? autoOptInNewFeatures
  deepLink?: { path: string; section?: string } // for settings that live on another page
  command?: string // e.g. '!set'
  blogSlug?: string // links to /blog/<slug>
  docsUrl?: string // external "read more"
  tier?: 'FREE' | 'PRO'
  // A live demo so people see what the feature actually does: a sample of what it posts
  // and/or a link to a real example page.
  demo?: { chat?: string; exampleUrl?: string; exampleLabel?: string }
}

export const whatsNew: WhatsNewEntry[] = [
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
    demo: {
      chat: 'Invoker set captured! 4 cosmetics → dotabod.com/arteezy/set',
      exampleUrl: 'https://dotabod.com/arteezy/set',
      exampleLabel: "See arteezy's set page →",
    },
  },
  {
    id: 'cosmetic-set-pages',
    title: 'Hero cosmetic set pages',
    description:
      "Browse any streamer's equipped cosmetics hero-by-hero — with rarity, a completion meter, and a trophy tally — on their public set page.",
    releaseDate: '2026-06-02',
    category: 'pages',
    demo: {
      exampleUrl: 'https://dotabod.com/arteezy/set',
      exampleLabel: "Browse arteezy's collection →",
    },
  },
  {
    id: 'paypal',
    title: 'PayPal for Dotabod Pro',
    description:
      'You can now subscribe to — or gift — Dotabod Pro with PayPal (monthly, annual, or lifetime), right alongside card and crypto.',
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
      exampleLabel: 'Browse the directory →',
    },
  },
  {
    id: 'gift-redesign',
    title: 'Redesigned gifting',
    description:
      'Gifting Pro got a cleaner flow: a live chat preview, preset durations, and a running price summary before checkout.',
    releaseDate: '2026-05-30',
    category: 'pages',
    demo: {
      exampleUrl: 'https://dotabod.com/arteezy/gift',
      exampleLabel: "See arteezy's gift page →",
    },
  },
  {
    id: 'command-suggestions',
    title: 'Inline command tips',
    description:
      'Dotabod can append a related command hint to its first reply, so your chat discovers more of what it can do.',
    releaseDate: '2026-05-25',
    category: 'chat',
    deepLink: { path: '/dashboard/commands' },
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
    demo: { chat: 'Playing with 2 other Dotabod streamers Okayge' },
  },
  {
    id: 'mod-resolution',
    title: 'Easier bet resolution',
    description:
      '!unresolved now lists pending matches with KDA, length, and match IDs, and a bare !won or !lost flips your most recent match — no match ID needed.',
    releaseDate: '2026-05-22',
    category: 'commands',
    command: '!unresolved',
    settingKey: 'commandWon',
    deepLink: { path: '/dashboard/commands' },
    demo: {
      chat: '2 unresolved match(es) 👌 Use !won or !lost with match ID: 7654321 (Pudge), 7654320 (Invoker)',
    },
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
      'Crypto checkout moved to NOWPayments — more supported coins and a smoother payment flow.',
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
    demo: { chat: 'Recent matches: 7654321 W (Pudge), 7654320 L (Invoker), 7654319 W (Sniper) 👌' },
  },
  {
    id: 'command-toggles',
    title: 'Toggle more commands',
    description:
      'Around a dozen more commands (!geo, !stats, !match, !friends, !count, and more) can now be turned on or off individually from the dashboard.',
    releaseDate: '2026-05-19',
    category: 'commands',
    deepLink: { path: '/dashboard/commands' },
  },
  {
    id: 'steam-connector',
    title: 'One-click Steam connect',
    description:
      'A new connector auto-links your Steam account while you stream, with live status and built-in troubleshooting.',
    releaseDate: '2026-05-17',
    category: 'stream',
    deepLink: { path: '/dashboard' },
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
    demo: { chat: 'Pudge 2-1 · Invoker 1-0 · Sniper 0-2 · 3W 3L (6 games)' },
  },
]

// Newest-first ordering, reused by the dashboard page, public page, and home teaser.
export const whatsNewSorted = [...whatsNew].sort(
  (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
)

// Effective toggle state for a What's New entry: new-feature toggles follow the master
// (autoOptInNewFeatures) until explicitly set; everything else uses its own stored value.
export function entryToggleChecked(
  entry: WhatsNewEntry,
  value: boolean | null | undefined,
  master: boolean | undefined,
): boolean | undefined {
  return entry.followsNewFeatureMaster ? (value ?? master) : Boolean(value)
}
