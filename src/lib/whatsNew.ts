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
