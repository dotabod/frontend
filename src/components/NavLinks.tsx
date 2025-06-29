import { Tooltip } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { GiftIcon } from 'lucide-react'
import Link from 'next/link'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

interface NavLinksProps {
  bottom?: boolean
}

export const NavLinks: FC<NavLinksProps> = ({ bottom = false }) => {
  // Only track hover state on client-side
  const [isMounted, setIsMounted] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Ensure animations only happen client-side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const additional: Array<[string, string, string?]> = []
  if (bottom) {
    additional.push(['Privacy Policy', '/privacy-policy'])
    additional.push(['Terms of Service', '/terms-of-service'])
    additional.push(['Cookie Policy', '/cookies'])
    additional.push(['Discord', 'https://discord.dotabod.com'])
  }

  return [
    ['Pricing', '/#pricing'],
    ['Blog', '/blog'],
    ['Gift Pro', '/gift', 'Gift Dotabod Pro to your favorite streamer'],
    ['Contact Us', '/contact'],
    ...additional,
  ].map(([label, href, tooltip], index) => {
    const isGiftLink = label === 'Gift Pro'
    const uniqueKey = `navlink-${label.replace(/\s+/g, '-').toLowerCase()}`

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
                    transition: { duration: 0.15, delay: 0.2 },
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
