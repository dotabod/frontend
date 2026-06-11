import { Tooltip } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { GiftIcon } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

interface NavLinksProps {
  bottom?: boolean
}

export type NavLink = [label: string, href: string, tooltip?: string]

// Single source of truth for marketing links so the desktop header, the mobile
// menu (Header.tsx), and the footer all stay in sync instead of drifting apart.
export const primaryNavLinks: NavLink[] = [
  ['Streamers', '/streamers', 'Browse Dota 2 streamers live right now'],
  ['Pricing', '/#pricing'],
  ['Blog', '/blog'],
  ["What's New", '/whats-new', 'Follow the latest Dotabod features and releases'],
  ['Gift Pro', '/gift', 'Gift Dotabod Pro to your favorite streamer'],
  ['Contact Us', '/contact'],
]

// Footer-only links (legal + community). The footer renders primary + these.
export const bottomNavLinks: NavLink[] = [
  ['Privacy Policy', '/privacy-policy'],
  ['Terms of Service', '/terms-of-service'],
  ['Cookie Policy', '/cookies'],
  ['GitHub', 'https://github.com/dotabod'],
  ['Discord', 'https://discord.dotabod.com'],
]

export const NavLinks: FC<NavLinksProps> = ({ bottom = false }) => {
  // Only track hover state on client-side
  const [isMounted, setIsMounted] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Ensure animations only happen client-side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const links: NavLink[] = bottom ? [...primaryNavLinks, ...bottomNavLinks] : primaryNavLinks

  return links.map(([label, href, tooltip], index) => {
    const isGiftLink = label === 'Gift Pro'
    const uniqueKey = `navlink-${label.replaceAll(/\s+/g, '-').toLowerCase()}`

    return (
      <Tooltip key={uniqueKey} title={tooltip} placement='top'>
        <Link
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          className='relative -mx-3 -my-2 flex items-center rounded-lg px-3 py-2 text-sm text-gray-300! transition-colors delay-150 hover:text-gray-500 hover:delay-[0ms]'
          onMouseEnter={() => isMounted && setHoveredIndex(index)}
          onMouseLeave={() => isMounted && setHoveredIndex(null)}
        >
          {isMounted && (
            <AnimatePresence>
              {hoveredIndex === index && (
                <motion.span
                  key={uniqueKey}
                  className='absolute inset-0 rounded-lg bg-gray-700'
                  layoutId={`hoverBackground-${bottom ? 'bottom' : 'top'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.15 } }}
                  exit={{
                    opacity: 0,
                    transition: { delay: 0.2, duration: 0.15 },
                  }}
                />
              )}
            </AnimatePresence>
          )}

          <span className='relative z-10 flex items-center gap-2'>
            {isGiftLink && <GiftIcon className='h-4 w-4' />}
            {label}
          </span>
        </Link>
      </Tooltip>
    )
  })
}
