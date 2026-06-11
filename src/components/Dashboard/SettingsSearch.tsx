'use client'

import { Empty, Input, type InputRef, List, Popover, Typography } from 'antd'
import clsx from 'clsx'
import { ChevronRight, CornerDownRight, Settings } from 'lucide-react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  filterNav,
  isExternalNavItem,
  type NavIcon,
  navConfig,
} from '@/components/Dashboard/navigation'
import { type SettingMetadata, settingsMetadata } from '@/lib/settingsMetadata'

// A synthesized "go to page" entry, shaped like SettingMetadata so the existing
// scorer can rank it right alongside real settings.
interface NavSearchItem {
  key: string
  label: string
  description: string
  searchTerms: string[]
  category: 'navigation'
  page: { path: string; section?: string }
  icon?: NavIcon
  external: boolean
  isNavigation: true
}

type SearchableItem = SettingMetadata | NavSearchItem

type SearchResult = SearchableItem & { score: number }

const isNavResult = (item: SearchableItem): item is NavSearchItem => 'isNavigation' in item

// Searchable text for either kind of entry (mirrors lib/settingsMetadata's helper).
const getSearchableText = (item: SearchableItem): string =>
  [item.label, item.description, ...item.searchTerms, item.key].join(' ').toLowerCase()

export function SettingsSearch() {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const isImpersonating = Boolean(session?.user?.isImpersonating)
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<InputRef>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const isKeyboardNavigationRef = useRef(false)

  // Page-navigation entries derived from the nav config — the ⌘K "safety net"
  // that keeps every relocated destination one keystroke away. Respects the same
  // admin/impersonator gating as the sidebar so it never offers an unreachable page.
  const navSearchItems = useMemo<NavSearchItem[]>(() => {
    const opts = { isAdmin, isImpersonating }
    const items = [
      ...filterNav(navConfig.primary, opts),
      ...filterNav(navConfig.bottom, opts).flatMap((item) => item.children ?? [item]),
      ...filterNav(navConfig.account, opts),
      ...filterNav(navConfig.help, opts),
    ]

    return items
      .filter((item) => item.href)
      .map((item) => ({
        category: 'navigation' as const,
        description: '',
        external: isExternalNavItem(item),
        icon: item.icon,
        isNavigation: true as const,
        key: item.href as string,
        label: item.name,
        page: { path: item.href as string },
        searchTerms: [item.name.toLowerCase()],
      }))
  }, [isAdmin, isImpersonating])

  // Simple fuzzy search implementation
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return []
    }

    const searchQuery = query.toLowerCase()
    const results: SearchResult[] = []
    const seenKeys = new Set<string>()

    for (const setting of [...navSearchItems, ...settingsMetadata]) {
      // Skip if we've already seen this setting
      if (seenKeys.has(setting.key)) {
        continue
      }

      const searchableText = getSearchableText(setting)

      // Calculate score based on match quality
      let score = 0

      // Exact match in label
      if (setting.label.toLowerCase() === searchQuery) {
        score += 100
      } else if (setting.label.toLowerCase().includes(searchQuery)) {
        score += 50
      }

      // Match in key
      if (setting.key.toLowerCase().includes(searchQuery)) {
        score += 30
      }

      // Match in description
      if (setting.description.toLowerCase().includes(searchQuery)) {
        score += 20
      }

      // Match in search terms
      for (const term of setting.searchTerms) {
        if (term === searchQuery) {
          score += 40
        } else if (term.includes(searchQuery)) {
          score += 15
        }
      }

      // Fuzzy match - check if all characters appear in order within reasonable distance
      const chars = Array.from(searchQuery)
      let charIndex = 0
      let firstFoundIndex = -1
      let lastFoundIndex = -1
      const maxGap = 2 // Maximum gap between consecutive characters

      for (let i = 0; i < searchableText.length && charIndex < chars.length; i++) {
        if (searchableText[i] === chars[charIndex]) {
          if (charIndex === 0) {
            // First character found
            firstFoundIndex = i
            lastFoundIndex = i
            charIndex++
          } else {
            // Check if this character is close enough to the previous one
            const gap = i - lastFoundIndex
            if (gap <= maxGap) {
              lastFoundIndex = i
              charIndex++
            } else {
              // Gap too large, restart search
              if (searchableText[i] === chars[0]) {
                firstFoundIndex = i
                lastFoundIndex = i
                charIndex = 1
              } else {
                charIndex = 0
                firstFoundIndex = -1
                lastFoundIndex = -1
              }
            }
          }
        }
      }

      // Only give fuzzy points for complete matches with good density
      if (charIndex === chars.length && searchQuery.length >= 4) {
        const matchSpan = lastFoundIndex - firstFoundIndex + 1
        const density = chars.length / matchSpan
        // Require very high density (at least 50% of the span should be our characters)
        if (density >= 0.5) {
          score += 5
        }
      }

      if (score > 0) {
        seenKeys.add(setting.key)
        results.push({ ...setting, score })
      }
    }

    // Sort by score descending
    return results.toSorted((a, b) => b.score - a.score).slice(0, 10)
  }, [query, navSearchItems])

  // Page jumps surface first, then settings — a single index space for keyboard nav.
  const navResults = searchResults.filter(isNavResult)
  const settingResults = searchResults.filter((result) => !isNavResult(result))
  const orderedResults = [...navResults, ...settingResults]

  // Handle navigation to a result (settings page section, internal page, or external link)
  const navigateToSetting = (result: SearchResult) => {
    setIsOpen(false)
    setQuery('')

    // External resources (Discord, GitHub, status) open in a new tab.
    if (isNavResult(result) && result.external) {
      window.open(result.page.path, '_blank', 'noopener,noreferrer')
      return
    }

    // Navigate to the page
    void router.push(result.page.path).then(() => {
      // After navigation, scroll to the section if specified
      if (result.page.section) {
        setTimeout(() => {
          if (!result.page.section) {
            return
          }
          const element = document.getElementById(result.page.section)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Add a highlight effect
            element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
            }, 2000)
          }
        }, 300)
      }
    })
  }

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      return
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        isKeyboardNavigationRef.current = true
        setSelectedIndex((prev) =>
          orderedResults.length === 0 ? 0 : (prev + 1) % orderedResults.length,
        )
        setTimeout(() => {
          isKeyboardNavigationRef.current = false
        }, 100)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        isKeyboardNavigationRef.current = true
        setSelectedIndex((prev) =>
          orderedResults.length === 0
            ? 0
            : (prev - 1 + orderedResults.length) % orderedResults.length,
        )
        setTimeout(() => {
          isKeyboardNavigationRef.current = false
        }, 100)
        break
      }
      case 'Enter': {
        e.preventDefault()
        if (orderedResults[selectedIndex]) {
          navigateToSetting(orderedResults[selectedIndex])
        }
        break
      }
      case 'Escape': {
        e.preventDefault()
        setIsOpen(false)
        searchInputRef.current?.blur()
        break
      }
    }
  }

  // Handle click outside - simplified since Popover handles this
  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      // Only handle cases where we want to close on outside click
      if (isOpen && !query) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, query])

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (
      isOpen &&
      orderedResults.length > 0 &&
      listContainerRef.current &&
      isKeyboardNavigationRef.current
    ) {
      const selectedElement = listContainerRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }
  }, [selectedIndex, isOpen, orderedResults.length])

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const getCategoryLabel = (category: SettingMetadata['category']) => {
    const labels = {
      advanced: 'Advanced',
      bets: 'Bets',
      chat: 'Chat',
      commands: 'Commands',
      display: 'Display',
      mmr: 'MMR',
      obs: 'OBS',
      overlay: 'Overlay',
      stream: 'Stream',
    }
    return labels[category] || category
  }

  const searchResultsContent = useMemo(() => {
    if (!isOpen) {
      return null
    }

    if (query && searchResults.length === 0) {
      return (
        <div style={{ width: 400 }}>
          <Empty
            image={<Settings className='mx-auto h-8 w-8 text-gray-400' />}
            description={
              <div className='text-center'>
                <p className='text-sm text-gray-300'>No results found for "{query}"</p>
                <p className='text-xs text-gray-400 mt-1'>Try searching with different keywords</p>
              </div>
            }
          />
        </div>
      )
    }

    if (searchResults.length === 0) {
      return null
    }

    // data-index spans both sections so it stays in sync with keyboard selection
    // (navResults/settingResults are the same split orderedResults uses).
    const renderRow = (result: SearchResult, index: number) => {
      const Icon: NavIcon = isNavResult(result) ? (result.icon ?? CornerDownRight) : Settings
      const categoryLabel = isNavResult(result) ? null : getCategoryLabel(result.category)
      const description = isNavResult(result) ? null : result.description

      return (
        <List.Item
          key={result.key}
          data-index={index}
          className={clsx(
            'cursor-pointer rounded-md mx-2 transition-colors',
            selectedIndex === index && 'bg-gray-700',
          )}
          onClick={() => navigateToSetting(result)}
          onMouseEnter={() => setSelectedIndex(index)}
          style={{
            backgroundColor: selectedIndex === index ? '#374151' : 'transparent',
            margin: '0 8px',
            padding: '8px 12px',
          }}
        >
          <List.Item.Meta
            avatar={<Icon className='h-4 w-4 text-gray-400' />}
            title={
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-100'>{result.label}</span>
                  {categoryLabel && <span className='text-xs text-gray-400'>{categoryLabel}</span>}
                </div>
                <ChevronRight className='h-4 w-4 text-gray-400' />
              </div>
            }
            description={
              description ? <span className='text-xs text-gray-300'>{description}</span> : null
            }
          />
        </List.Item>
      )
    }

    return (
      <div ref={listContainerRef} style={{ maxHeight: 384, overflow: 'auto', width: 400 }}>
        {navResults.length > 0 && (
          <>
            <Typography.Text className='text-xs font-medium text-gray-400 px-3 py-1 block'>
              Go to…
            </Typography.Text>
            <List
              size='small'
              dataSource={navResults}
              renderItem={(result, index) => renderRow(result, index)}
            />
          </>
        )}
        {settingResults.length > 0 && (
          <>
            <Typography.Text className='text-xs font-medium text-gray-400 px-3 py-1 block'>
              Search Results
            </Typography.Text>
            <List
              size='small'
              dataSource={settingResults}
              renderItem={(result, index) => renderRow(result, navResults.length + index)}
            />
          </>
        )}
      </div>
    )
  }, [isOpen, query, searchResults, selectedIndex])

  return (
    <div className='flex w-full max-w-md mx-auto'>
      <Popover
        content={searchResultsContent}
        trigger={[]}
        open={isOpen && (searchResults.length > 0 || Boolean(query && searchResults.length === 0))}
        onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false)
          }
        }}
        placement='bottomLeft'
      >
        <Input.Search
          ref={searchInputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder='Search or jump to… (⌘K)'
          size='large'
          style={{
            backgroundColor: '#1f2937',
            borderColor: '#374151',
            width: '100%',
          }}
        />
      </Popover>
    </div>
  )
}
