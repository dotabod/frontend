'use client'

import { Empty, Input, type InputRef, List, Popover, Typography } from 'antd'
import clsx from 'clsx'
import { ChevronRight, Settings } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getSearchableText, type SettingMetadata, settingsMetadata } from '@/lib/settingsMetadata'

interface SearchResult extends SettingMetadata {
  score: number
}

export function SettingsSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<InputRef>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const isKeyboardNavigationRef = useRef(false)

  // Simple fuzzy search implementation
  const searchResults = useMemo(() => {
    if (!query.trim()) return []

    const searchQuery = query.toLowerCase()
    const results: SearchResult[] = []
    const seenKeys = new Set<string>()

    for (const setting of settingsMetadata) {
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
      const chars = searchQuery.split('')
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
    return results.sort((a, b) => b.score - a.score).slice(0, 10)
  }, [query])

  // Handle navigation to setting
  const navigateToSetting = (result: SettingMetadata) => {
    setIsOpen(false)
    setQuery('')

    // Navigate to the page
    router.push(result.page.path).then(() => {
      // After navigation, scroll to the section if specified
      if (result.page.section) {
        setTimeout(() => {
          if (!result.page.section) return
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          isKeyboardNavigationRef.current = true
          setSelectedIndex((prev) => (prev + 1) % searchResults.length)
          // Clear the flag after a short delay to allow scroll to complete
          setTimeout(() => {
            isKeyboardNavigationRef.current = false
          }, 100)
          break
        case 'ArrowUp':
          e.preventDefault()
          isKeyboardNavigationRef.current = true
          setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length)
          // Clear the flag after a short delay to allow scroll to complete
          setTimeout(() => {
            isKeyboardNavigationRef.current = false
          }, 100)
          break
        case 'Enter':
          e.preventDefault()
          if (searchResults[selectedIndex]) {
            navigateToSetting(searchResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          searchInputRef.current?.blur()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchResults, selectedIndex])

  // Handle click outside - simplified since Popover handles this
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only handle cases where we want to close on outside click
      if (isOpen && !query) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, query])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchResults])

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (
      isOpen &&
      searchResults.length > 0 &&
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
  }, [selectedIndex, isOpen, searchResults.length])

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
      obs: 'OBS',
      overlay: 'Overlay',
      chat: 'Chat',
      stream: 'Stream',
      mmr: 'MMR',
      bets: 'Bets',
      commands: 'Commands',
      display: 'Display',
      advanced: 'Advanced',
    }
    return labels[category] || category
  }

  const searchResultsContent = useMemo(() => {
    if (!isOpen) return null

    if (query && searchResults.length === 0) {
      return (
        <div style={{ width: 400 }}>
          <Empty
            image={<Settings className='mx-auto h-8 w-8 text-gray-400' />}
            description={
              <div className='text-center'>
                <p className='text-sm text-gray-300'>No settings found for "{query}"</p>
                <p className='text-xs text-gray-400 mt-1'>Try searching with different keywords</p>
              </div>
            }
          />
        </div>
      )
    }

    if (searchResults.length > 0) {
      return (
        <div ref={listContainerRef} style={{ width: 400, maxHeight: 384, overflow: 'auto' }}>
          <Typography.Text className='text-xs font-medium text-gray-400 px-3 py-1 block'>
            Search Results
          </Typography.Text>
          <List
            size='small'
            dataSource={searchResults}
            renderItem={(result, index) => (
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
                  padding: '8px 12px',
                  margin: '0 8px',
                }}
              >
                <List.Item.Meta
                  avatar={<Settings className='h-4 w-4 text-gray-400' />}
                  title={
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-100'>{result.label}</span>
                        <span className='text-xs text-gray-400'>
                          {getCategoryLabel(result.category)}
                        </span>
                      </div>
                      <ChevronRight className='h-4 w-4 text-gray-400' />
                    </div>
                  }
                  description={<span className='text-xs text-gray-300'>{result.description}</span>}
                />
              </List.Item>
            )}
          />
        </div>
      )
    }

    return null
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
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder='Search settings... (⌘K)'
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
