import { describe, expect, it } from 'vite-plus/test'
import {
  deepLinkLabel,
  entryToggleChecked,
  groupWhatsNewByDate,
  type WhatsNewEntry,
  whatsNew,
  whatsNewSorted,
} from '@/lib/whatsNew'

const CATEGORIES = ['chat', 'overlay', 'commands', 'pages', 'advanced', 'bets', 'mmr', 'stream']

describe('whatsNew registry', () => {
  it('starts with the newest public-facing release', () => {
    expect(whatsNewSorted[0]).toMatchObject({
      blogSlug: 'custom-win-loss-stat-windows',
      id: 'custom-wl-stats-window',
      releaseDate: '2026-09-04',
    })
  })

  it('includes the July settings improvements as one release entry', () => {
    expect(whatsNew).toContainEqual(
      expect.objectContaining({
        id: 'clearer-match-start-settings',
        releaseDate: '2026-07-31',
      }),
    )
  })

  it('includes the August account-security fixes as one release entry', () => {
    expect(whatsNew).toContainEqual(
      expect.objectContaining({
        id: 'safer-account-settings',
        releaseDate: '2026-08-13',
      }),
    )
  })

  it('every entry has the required fields and a valid shape', () => {
    for (const e of whatsNew) {
      expect(e.id).toBeTruthy()
      expect(e.title).toBeTruthy()
      expect(e.description).toBeTruthy()
      expect(e.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(e.releaseDate).getTime())).toBe(false)
      expect(CATEGORIES).toContain(e.category)
      if (e.tier) expect(['FREE', 'PRO']).toContain(e.tier)
      // A tri-state toggle must declare which setting it controls.
      if (e.followsNewFeatureMaster) expect(e.settingKey).toBeTruthy()
      // Release dates are real and not in the future (catches typos like a wrong year).
      expect(new Date(e.releaseDate).getTime()).toBeLessThanOrEqual(Date.now() + 86_400_000)
      // Every entry must give the reader somewhere to go / something to see.
      expect(
        Boolean(e.demo || e.demoCommand || e.deepLink || e.blogSlug || e.command || e.settingKey),
      ).toBe(true)
      // `details` (the "how it works" expander) must be non-empty paragraphs when present.
      if (e.details) {
        expect(e.details.length).toBeGreaterThan(0)
        for (const paragraph of e.details) expect(paragraph.trim().length).toBeGreaterThan(0)
        // paragraphs must be unique (catches copy-paste; keeps the card's per-paragraph keys stable)
        expect(new Set(e.details).size).toBe(e.details.length)
      }
    }
  })

  it('has unique ids', () => {
    const ids = whatsNew.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('groups releases by date without changing newest-first order', () => {
    const entries = [
      { id: 'new-a', releaseDate: '2026-08-25' },
      { id: 'new-b', releaseDate: '2026-08-25' },
      { id: 'old', releaseDate: '2026-07-31' },
    ] as WhatsNewEntry[]

    expect(groupWhatsNewByDate(entries)).toEqual([
      { releaseDate: '2026-08-25', entries: [entries[0], entries[1]] },
      { releaseDate: '2026-07-31', entries: [entries[2]] },
    ])
  })
})

describe('entryToggleChecked', () => {
  const tri = { followsNewFeatureMaster: true } as WhatsNewEntry
  const plain = {} as WhatsNewEntry

  it('tri-state follows the master toggle when the value is unset', () => {
    expect(entryToggleChecked(tri, null, true)).toBe(true)
    expect(entryToggleChecked(tri, null, false)).toBe(false)
    expect(entryToggleChecked(tri, undefined, true)).toBe(true)
  })

  it('tri-state explicit choice wins over the master', () => {
    expect(entryToggleChecked(tri, false, true)).toBe(false)
    expect(entryToggleChecked(tri, true, false)).toBe(true)
  })

  it('non-tri-state uses its own value', () => {
    expect(entryToggleChecked(plain, true, false)).toBe(true)
    expect(entryToggleChecked(plain, null, true)).toBe(false)
  })
})

const KNOWN_DEEP_LINK_PATHS = [
  '/dashboard',
  '/dashboard/billing',
  '/dashboard/commands',
  '/dashboard/features/chat',
  '/dashboard/features/advanced',
  '/dashboard/features/overlay',
  '/dashboard/help',
]

describe('deepLinkLabel', () => {
  it('names each known destination', () => {
    expect(deepLinkLabel({ path: '/dashboard' })).toBe('Open dashboard')
    expect(deepLinkLabel({ path: '/dashboard/billing' })).toBe('Open billing')
    expect(deepLinkLabel({ path: '/dashboard/commands' })).toBe('Open commands')
    expect(deepLinkLabel({ path: '/dashboard/features/chat' })).toBe('Open chat settings')
    expect(deepLinkLabel({ path: '/dashboard/features/advanced' })).toBe('Open advanced settings')
    expect(deepLinkLabel({ path: '/dashboard/features/overlay' })).toBe('Open overlay settings')
    expect(deepLinkLabel({ path: '/dashboard/help' })).toBe('Open help center')
  })

  it('humanizes the last path segment for an unknown destination', () => {
    expect(deepLinkLabel({ path: '/dashboard/something' })).toBe('Open something')
  })

  it('every real deep-link points at a known, explicitly-labeled destination', () => {
    for (const e of whatsNew) {
      if (e.deepLink) expect(KNOWN_DEEP_LINK_PATHS).toContain(e.deepLink.path)
    }
  })
})
